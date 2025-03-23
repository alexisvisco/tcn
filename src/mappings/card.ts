import type {Card} from "../domain/card.ts";
import type {cardSchema} from "../model/card.ts";
import {CardType, lorcanaCard, magicTheGatheringCard} from "../domain/card.ts";
import type {CardScanResponse} from "../domain/card_scan.js";

export function cardDomainToCardSchema(card: Card): cardSchema {
	switch (card.type) {
		case CardType.Lorcana:
			return {
				...(card._id ? {_id: card._id} : {}),
				id: card.id,
				name: card.name,
				type: card.type,
				imageUrl: card.imageUrl,
				attributes: {
					inkCost: card.attributes.inkCost,
					rarity: card.attributes.rarity,
				}
			};

		case CardType.MagicTheGathering:
			return {
				...(card._id ? {_id: card._id} : {}),
				id: card.id,
				name: card.name,
				type: card.type,
				imageUrl: card.imageUrl,
				attributes: {
					color: card.attributes.color,
					rarity: card.attributes.rarity,
				}
			};
	}
}


export function cardSchemaToCardDomain(cardSchema: cardSchema): Card {
	switch (cardSchema.type) {
		case CardType.Lorcana:
			return lorcanaCard.parse({
				_id: cardSchema._id.toString(),
				id: cardSchema.id,
				name: cardSchema.name,
				type: cardSchema.type,
				imageUrl: cardSchema.imageUrl,
				attributes: {
					inkCost: cardSchema.attributes.inkCost,
					rarity: cardSchema.attributes.rarity,
				}
			});

		case CardType.MagicTheGathering:
			return magicTheGatheringCard.parse({
				_id: cardSchema._id.toString()	,
				id: cardSchema.id,
				name: cardSchema.name,
				type: cardSchema.type,
				imageUrl: cardSchema.imageUrl,
				attributes: {
					...cardSchema.attributes.color ? {color: cardSchema.attributes.color} : {},
					rarity: cardSchema.attributes.rarity,
				}
			});
	}
}
