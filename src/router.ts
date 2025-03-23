import {canonicalLogger, getLogger} from "./helper/canonical_logger.ts";
import {Hono} from "hono";
import {FileTooLargeError, onHttpError} from "./helper/http_error.ts";
import pino from "pino";
import type {CardService} from "./service/card_service.ts";
import {CardListRequest, cardListRequest} from "./domain/card.ts";
import {transformQueries} from "./helper/http_query_to_obj.ts";
import {z} from "zod";
import {bodyLimit} from 'hono/body-limit'
import {cors} from "hono/cors";
import type {CardScanRequest} from "./domain/card_scan.js";
import {cardScanRequest} from "./domain/card_scan.js";

export function newHTTPServer(cardService: CardService): Hono {
	const srv = new Hono();

	srv.use('*', canonicalLogger({
		level: 'info',
		excludePaths: ['/health', /^\/static\//],
	}));

	srv.use('*', cors())

	srv.onError((err, c) => {
		const requestId: string = c.get('request_id') || 'unknown';
		console.error(`Error in requestId ${requestId}:\n`, err);

		// Log the error with the logger (if available)
		try {
			const logger = getLogger(c);
			logger.addCtx({
				type: 'error',
				msg: err.message,
			});
		} catch (logErr) {
			pino().error(logErr, 'error while logging error');
		}

		return onHttpError(err, c, requestId);
	});

	srv.get('/healthcheck', (c) => {
		return c.json({status: 'ok'});
	});

	srv.get('/api/cards',
		async (c) => {
			const queries = transformQueries(c.req.queries())

			let request: CardListRequest | undefined
			try {
				request = cardListRequest.parse(queries)
			} catch (error) {
				c.status(400)
				return c.json({
					error: error instanceof z.ZodError ? error.format() : String(error)
				});
			}

			const cards = await cardService.cardList(request);

			return c.json(cards);
		});

	srv.post('/api/cards/scan',
		bodyLimit({ // limit to 2mb
			maxSize: 2 * 1024 * 1024,
			onError: (c) => {
				throw new FileTooLargeError('File too large')
			},
		} as any),
		async (c) => {
			const body = await c.req.parseBody()
			const file = body['file']

			let request: CardScanRequest | undefined
			try {
				request = cardScanRequest.parse({file})
			} catch (error) {
				c.status(400)
				return c.json({
					error: error instanceof z.ZodError ? error.format() : String(error)
				});
			}

			const scanResult = await cardService.cardScan(request);

			return c.json(scanResult);
		});
	return srv
}
