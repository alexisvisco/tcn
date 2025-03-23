import {z} from "zod";

export const cardScanBockResponse = z.object({
	success: z.boolean(),
	text: z.string(),
	blocks: z.array(
		z.object({
			text: z.string(),
			confidence: z.number(),
			location: z.array(z.tuple([z.number(), z.number()])).length(2),
		})
	),
});

export type CardScanBlockResponse = z.infer<typeof cardScanBockResponse>;

export const cardScanRequest = z.object({
	file: z.instanceof(File),
})

export const cardScanResult = z.object({
	_id: z.string(),
	name: z.string(),
	id: z.string(),
	imageUrl: z.string().optional(),
});

export type CardScanResult = z.infer<typeof cardScanResult>;

export const cardScanResponse = z.object({
	items: z.array(cardScanResult)
})

export type CardScanRequest = z.infer<typeof cardScanRequest>;
export type CardScanResponse = z.infer<typeof cardScanResponse>;
