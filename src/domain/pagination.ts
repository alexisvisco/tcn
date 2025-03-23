import {z} from "zod";

export const PaginationRequest = z.object({
	page: z.coerce.number().int().positive().default(1),
	itemsPerPage: z.coerce.number().int().positive().max(50).default(10),
});

export const PaginationResponse = z.object({
	page: z.number().int().positive(),
	itemsPerPage: z.number().int().positive(),
	totalItems: z.number().int().positive(),
	totalPages: z.number().int().positive(),
});
