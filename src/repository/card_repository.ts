import {
	Card,
	cardFilteringLorcana,
	cardFilteringMTG,
	CardListRequest,
	CardListResponse,
	CardType
} from "../domain/card";
import {cardGameCollection, ICard} from "../model/card.ts";
import {cardDomainToCardSchema, cardSchemaToCardDomain} from "../mappings/card.ts";
import {undefined, z} from "zod";
import type {Model, RootFilterQuery} from "mongoose";
import {InvalidParameterError} from "../helper/http_error.js";

export class CardRepository {
	private collection: Model<ICard>;

	constructor() {
		this.collection = cardGameCollection();
	}

	async hasCardsInType(type: CardType): Promise<boolean> {
		const result = await this.collection.countDocuments({
			type: type
		})

		return result > 0;
	}

	async bulkUpsertCards(cards: Card[]): Promise<void> {
		if (!cards.length) {
			return
		}

		const bulkOps = cards.map(card => ({
			updateOne: {
				filter: {id: card.id},
				update: cardDomainToCardSchema(card),
				upsert: true
			}
		}));

		await this.collection.bulkWrite(bulkOps);
	}

	async findCards(request: CardListRequest): Promise<CardListResponse> {

		// Construire la requête MongoDB
		const query: RootFilterQuery<ICard> = {};


		if (request?.type) {
			query.type = request.type;

			// Validation des attributs en fonction du type
			if (request.type === CardType.Lorcana) {
				const validation = cardFilteringLorcana.safeParse(request);
				if (!validation.success) {
					throw new InvalidParameterError(`Invalid Lorcana attributes: ${validation.error.message}`);
				}
			} else if (request.type === CardType.MagicTheGathering) {
				const validation = cardFilteringMTG.safeParse(request);
				if (!validation.success) {
					throw new InvalidParameterError(`Invalid Magic The Gathering attributes: ${validation.error.message}`);
				}
			}
		}

		if (request.query) {
			query['$text'] = {$search: request.query};
		}

		if (request.attrInkCost) {
			query['attributes.inkCost'] = request.attrInkCost;
		}

		if (request.attrColor) {
			query['attributes.color'] = request.attrColor;
		}

		if (request.attrRarity) {
			query['attributes.rarity'] = request.attrRarity;
		}

		const totalItems = (await this.collection.countDocuments(query)) as number;
		const totalPages = Math.ceil(totalItems / request.itemsPerPage);

		const skip = (request.page - 1) * request.itemsPerPage;

		const result = (await this.collection
			.find(query)
			.skip(skip)
			.limit(request.itemsPerPage)
			.lean()) as ICard[];

		return {
			items: result.map(card => cardSchemaToCardDomain(card)),
			pagination: {
				page: request.page,
				itemsPerPage: request.itemsPerPage,
				totalItems,
				totalPages,
			}
		}
	}
}
