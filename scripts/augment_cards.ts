import {readFileSync, writeFileSync} from 'fs';
import {join} from 'path';
import pino from 'pino';

const logger = pino({
	level: 'info',
});

interface APILorcanaCard {
	Name: string;
	Image?: string;

	[key: string]: any;
}

interface APIMtgCard {
	name: string;
	imageUrl?: string;

	[key: string]: any;
}

const LORCANA_API_URL = 'https://api.lorcana-api.com/bulk/cards';
const MTG_API_BASE_URL = 'https://api.magicthegathering.io/v1/cards';
const MTG_PAGE_SIZE = 100;

const LORCANA_FILE_PATH = join(process.cwd(), 'data/cards/lorcana-cards.json');
const MTG_FILE_PATH = join(process.cwd(), 'data/cards/mtg-cards.json');

async function fetchLorcanaCards(): Promise<APILorcanaCard[]> {
	logger.info('Fetching Lorcana cards...');

	try {
		const response = await fetch(LORCANA_API_URL);

		if (!response.ok) {
			throw new Error(`Lorcana API error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json();
		return Array.isArray(data) ? data : [];
	} catch (error) {
		logger.error({error}, 'Error fetching Lorcana cards');
		return [];
	}
}

async function fetchMtgCards(): Promise<APIMtgCard[]> {
	logger.info('Fetching Magic cards...');

	const allCards: APIMtgCard[] = [];
	let page = 1;
	let hasMorePages = true;
	let remainingRequests = 5000;

	try {
		while (hasMorePages && remainingRequests > 0) {
			const url = `${MTG_API_BASE_URL}?page=${page}&pageSize=${MTG_PAGE_SIZE}`;
			logger.info(`Fetching page ${page}...`);

			const response = await fetch(url);

			if (!response.ok) {
				throw new Error(`MTG API error: ${response.status} ${response.statusText}`);
			}

			// typescript nightmare: .get is not a function...
			const totalCount = parseInt((response.headers as any).get('total-count'));
			const count = parseInt((response.headers as any).get('count'));
			remainingRequests = parseInt((response.headers as any).get('ratelimit-remaining'));


			const data = await response.json();
			const cards = data.cards || [];

			if (Array.isArray(cards)) {
				allCards.push(...cards);
				logger.info(`${allCards.length}/${totalCount} cards fetched. Remaining requests: ${remainingRequests}`);
			}

			hasMorePages = count === MTG_PAGE_SIZE && allCards.length < totalCount;
			page++;

			if (hasMorePages) {
				await new Promise(resolve => setTimeout(resolve, 50));
			}
		}

		return allCards;
	} catch (error) {
		console.log(error);
		logger.error({error}, 'Error fetching MTG cards');
		return allCards;
	}
}

async function updateLorcanaCardImages() {
	try {
		const localCards: { name: string }[] = JSON.parse(readFileSync(LORCANA_FILE_PATH, 'utf-8'));
		logger.info(`${localCards.length} Lorcana cards found in local file`);
		console.log(localCards);

		const apiCards = await fetchLorcanaCards();
		logger.info(`${apiCards.length} Lorcana cards fetched from API`);

		if (apiCards.length === 0) {
			logger.warn('No cards fetched from Lorcana API, local data will not be updated');
			return;
		}

		const apiCardsByName = new Map<string, string | undefined>();
		for (const card of apiCards) {
			if (card.Name) {
				apiCardsByName.set(card.Name, card.Image);
			}
		}


		let updatedCount = 0;
		const updatedCards = localCards.map(localCard => {
			const apiCardImageURL = apiCardsByName.get(localCard.name);
			if (!apiCardImageURL) {
				return localCard;
			}

			updatedCount++;
			return {...localCard, image_url: apiCardImageURL};
		});

		writeFileSync(LORCANA_FILE_PATH, JSON.stringify(updatedCards, null, 2));
		logger.info(`Update complete. ${updatedCount} Lorcana cards enriched with images`);

	} catch (error) {
		logger.error({error}, 'Error updating Lorcana images');
	}
}

async function updateMtgCardImages() {
	try {
		const localCards: { name: string }[] = JSON.parse(readFileSync(MTG_FILE_PATH, 'utf-8'));
		logger.info(`${localCards.length} MTG cards found in local file`);

		const apiCards = await fetchMtgCards();
		logger.info(`${apiCards.length} MTG cards fetched from API`);

		if (apiCards.length === 0) {
			logger.warn('No cards fetched from MTG API, local data will not be updated');
			return;
		}

		const apiCardsByName = new Map<string, string | undefined>();
		for (const card of apiCards) {
			if (card.name) {
				apiCardsByName.set(card.name, card.imageUrl);
			}
		}

		let updatedCount = 0;

		const updatedCards = localCards.map(localCard => {
			const apiCard = apiCardsByName.get(localCard.name);
			if (!apiCard) {
				return localCard;
			}

			updatedCount++;
			return {...localCard, image_url: apiCard};
		});

		writeFileSync(MTG_FILE_PATH, JSON.stringify(updatedCards, null, 2));
		logger.info(`Update complete. ${updatedCount} MTG cards enriched with images`);

	} catch (error) {
		logger.error({error}, 'Error updating MTG images');
	}
}

async function main() {
	logger.info('Starting card image update process');

	try {
		readFileSync(LORCANA_FILE_PATH);
		readFileSync(MTG_FILE_PATH);
	} catch (error) {
		logger.fatal({error}, 'Data files do not exist or are not accessible');
		logger.fatal(`Ensure these files exist:\n- ${LORCANA_FILE_PATH}\n- ${MTG_FILE_PATH}`);
		process.exit(1);
	}

	await Promise.all([
		// updateLorcanaCardImages(),
		updateMtgCardImages()
	]);

	logger.info('Update complete for both card sets');
}

main().catch(error => {
	logger.fatal({error}, 'Script execution error');
	process.exit(1);
});
