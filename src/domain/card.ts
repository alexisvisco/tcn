import {z} from "zod";
import {PaginationRequest, PaginationResponse} from "./pagination.ts";

export enum CardType {
	Lorcana = "lorcana",
	MagicTheGathering = "magic_the_gathering"
}

const card = z.object({
	_id: z.string().optional(),
	name: z.string(),
	id: z.string(),
	imageUrl: z.string().optional(),
});

export enum LorcanaRarity {
	Common = "Common",
	Enchanted = "Enchanted",
	Legendary = "Legendary",
	Promo = "Promo",
	Rare = "Rare",
	SuperRare = "Super Rare",
	Uncommon = "Uncommon"
}

export const lorcanaCard = card.extend({
	type: z.literal(CardType.Lorcana),
	attributes: z.object({
		inkCost: z.number().min(0).max(10),
		rarity: z.nativeEnum(LorcanaRarity)
	})
})

export enum MagicTheGatheringColor {
	U = "U",
	B = "B",
	G = "G",
	R = "R",
	W = "W"
}

export enum MagicTheGatheringCardRarity {
	Common = "common",
	Mythic = "mythic",
	Rare = "rare",
	Special = "special",
	Uncommon = "uncommon"
}

export const magicTheGatheringCard = card.extend({
	type: z.literal(CardType.MagicTheGathering),
	attributes: z.object({
		color: z.nativeEnum(MagicTheGatheringColor).optional(),
		rarity: z.nativeEnum(MagicTheGatheringCardRarity)
	})
})

export type Card = z.infer<typeof lorcanaCard> | z.infer<typeof magicTheGatheringCard>;

export const cardFilteringLorcana = z.object({
	attrInkCost: z.coerce.number().array().optional(),
	attrRarity: z.nativeEnum(LorcanaRarity).array().optional()
})

export const cardFilteringMTG = z.object({
	attrColor: z.nativeEnum(MagicTheGatheringColor).array().optional(),
	attrRarity: z.nativeEnum(MagicTheGatheringCardRarity).array().optional()
})

export const cardFiltering = z.object({
	query: z.string().optional(),
	type: z.nativeEnum(CardType).optional(),
	attrInkCost: z.coerce.number().array().optional(),
	attrColor: z.nativeEnum(MagicTheGatheringColor).array().optional(),
	attrRarity: z.union([
		z.nativeEnum(LorcanaRarity),
		z.nativeEnum(MagicTheGatheringCardRarity)
	]).array().optional()
});

export const cardListRequest = PaginationRequest.extend(cardFiltering.shape)

export const cardListResponse = z.object({
	items: z.array(card),
	pagination: PaginationResponse
})

export type CardListRequest = z.infer<typeof cardListRequest>;
export type CardListResponse = z.infer<typeof cardListResponse>;
