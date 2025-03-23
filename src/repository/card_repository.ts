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
import type {Model, RootFilterQuery} from "mongoose";
import {InvalidParameterError} from "../helper/http_error.js";
import {cardScanResponse, CardScanResult} from "../domain/card_scan.js";

export class CardRepository {
	private collection: Model<ICard>;

	constructor() {
		this.collection = cardGameCollection();
	}

	async hasType(type: CardType): Promise<boolean> {
		const result = await this.collection.countDocuments({
			type: type
		})

		return result > 0;
	}

	async findByNamesWithScore(names: string[]): Promise<CardScanResult[]> {
		if (!names || names.length === 0) {
			return [];
		}


		// MongoDB only allows a single $text operator per query
		// We need to run individual queries for each name and merge results
		// optimization note: can be run in promise.all
		const allResults : (CardScanResult & { score: number })[] = [];

		for (const name of names) {
			const results = await this.collection.aggregate([
				{
					$match: {
						$text: {
							$search: name,
							$caseSensitive: false
						}
					}
				},
				{
					$addFields: {
						score: {
							$multiply: [
								{ $meta: "textScore" },
								100
							]
						}
					}
				},
				{
					$match: {
						score: { $gt: 90 }
					}
				},
				{
					$project: {
						_id: 0,
						id: 1,
						name: 1,
						imageUrl: 1,
						score: 1
					}
				}
			]).exec();

			allResults.push(...results);
		}

		// Deduplicate by keeping highest score for each card
		const uniqueResults = Array.from(
			allResults.reduce((map, item) => {
				if (!map.has(item.id) || map.get(item.id).score < item.score) {
					map.set(item.id, item);
				}
				return map;
			}, new Map()).values()
		) as (CardScanResult & { score: number })[];



		// Sort by score and limit to top 5
		return uniqueResults
			.map(e => {
				// boost when exact match
				if (names.includes(e.name)) {
					e.score += 100;
				}

				e._id = e.id.toString()

				return e;
			})
			.sort((a, b) => b.score - a.score)
			.slice(0, 5)
	}

	async bulkUpsert(cards: Card[]): Promise<void> {
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

	async search(request: CardListRequest): Promise<CardListResponse> {

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


		if (request.attrInkCostRangeFrom || request.attrInkCostRangeTo) {
			if (request.attrInkCostRangeFrom > request.attrInkCostRangeTo) {
				throw new InvalidParameterError('Invalid ink cost range');
			}

			query['attributes.inkCost'] = {
				$gte: request.attrInkCostRangeFrom || 0,
				$lte: request.attrInkCostRangeTo || 10
			};
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
