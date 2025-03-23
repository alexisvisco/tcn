import {z} from "zod";
import {Card, CardType, lorcanaCard, magicTheGatheringCard} from "../domain/card";
import {CardRepository} from "../repository/card_repository.ts";
import pino from "pino";

const fs = require('fs');
const {chain} = require('stream-chain');
const {parser} = require('stream-json');
const {streamArray} = require('stream-json/streamers/StreamArray');
const {batch} = require('stream-json/utils/Batch');

// Schémas pour la validation des données brutes JSON
const LorcanaRawSchema = z.object({
	name: z.string(),
	ink_cost: z.number(),
	rarity: z.string(),
	id: z.string(),
	image_url: z.string().optional()
});

const MTGRawSchema = z.object({
	color: z.string().optional(),
	name: z.string(),
	rarity: z.string(),
	id: z.string(),
	image_url: z.string().optional()
});

const BATCH_SIZE = 512;

export class CardImporterService {
	private cardRepository: CardRepository;
	private logger = pino({name: "CardImporterService"});

	constructor(cardRepository: CardRepository) {
		this.cardRepository = cardRepository;
	}

	async importLorcana(filePath: string): Promise<{ imported: number; rejected: number }> {
		if (await this.cardRepository.hasCardsInType(CardType.Lorcana)) {
			this.logger.info("Lorcana cards already imported, skipping import");
			return {imported: 0, rejected: 0};
		}

		return this.streamImport(filePath, LorcanaRawSchema, (validData) => {
			const maybeCard = lorcanaCard.safeParse({
				id: validData.id,
				name: validData.name,
				type: CardType.Lorcana,
				imageUrl: validData.image_url,
				attributes: {
					inkCost: validData.ink_cost,
					rarity: validData.rarity
				}
			});

			if (maybeCard.success) {
				return maybeCard.data;
			} else {
				this.logger.warn(
					{
						type: CardType.Lorcana,
						data: validData,
						errors: maybeCard.error.errors
					},
					"rejected card: invalid schema"
				);
			}
			return undefined;
		});
	}

	async importMTG(filePath: string): Promise<{ imported: number; rejected: number }> {
		if (await this.cardRepository.hasCardsInType(CardType.MagicTheGathering)) {
			this.logger.info("Magic The Gathering cards already imported, skipping import");
			return {imported: 0, rejected: 0};
		}

		return this.streamImport(filePath, MTGRawSchema, (validData) => {
			const maybeCard = magicTheGatheringCard.safeParse({
				id: validData.id,
				name: validData.name,
				type: CardType.MagicTheGathering,
				imageUrl: validData.image_url,
				attributes: {
					color: validData.color,
					rarity: validData.rarity
				}
			});

			if (maybeCard.success) {
				return maybeCard.data;
			} else {
				this.logger.warn(
					{
						type: CardType.MagicTheGathering,
						data: validData,
						errors: maybeCard.error.errors
					},
					"rejected card: invalid schema"
				);
			}
			return undefined;
		});
	}

	// streamImport allow to import a large amount of json array file without loading it all in memory
	private async streamImport<T>(
		filePath: string,
		rawSchema: z.ZodType<T>,
		transformFn: (data: T) => Card | undefined
	): Promise<{ imported: number; rejected: number }> {
		let imported = 0;
		let rejected = 0;

		return new Promise((resolve, reject) => {
			const pipeline = chain([
				fs.createReadStream(filePath),
				parser(),
				streamArray(),
				batch({batchSize: BATCH_SIZE})
			] as any);

			pipeline.on('data', async (data) => {
				pipeline.pause();

				const cardsToUpsert: Card[] = [];

				for (const item of data) {
					const validData = rawSchema.safeParse(item.value);

					if (!validData.success) {
						this.logger.warn({
							data: item.value,
							errors: validData.error.errors
						}, "rejected card: invalid schema");
						rejected++;
						continue;
					}

					const card = transformFn(validData.data);
					if (card) {
						cardsToUpsert.push(card);
					} else {
						rejected++;
					}
				}

				try {
					if (cardsToUpsert.length > 0) {
						await this.cardRepository.bulkUpsertCards(cardsToUpsert);
						imported += cardsToUpsert.length;
						this.logger.info({batchSize: cardsToUpsert.length}, "batch imported");
					}
					// Reprend le flux après traitement
					pipeline.resume();
				} catch (error) {
					this.logger.error(error, "error upserting batch");
					pipeline.destroy(error);
				}
			});

			pipeline.on('end', () => {
				this.logger.info({imported, rejected}, "import completed");
				resolve({imported, rejected});
			});

			pipeline.on('error', (err) => {
				this.logger.error(err, "Error in import pipeline");
				reject(err);
			});
		});
	}


}
