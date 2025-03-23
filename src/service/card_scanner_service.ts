import pino from "pino";
import type {CardScanBlockResponse} from "../domain/card_scan.js";
import {cardScanBockResponse} from "../domain/card_scan.js";

export class CardScannerService {
	private logger = pino({name: "CardScannerService"});
	private readonly scanApiUrl: string;

	constructor(scanApiUrl: string) {
		this.scanApiUrl = scanApiUrl;
	}

	async scan(file: File): Promise<CardScanBlockResponse> {
		try {
			this.logger.info({filename: file.name}, "Starting card scan");

			const formData = new FormData();
			formData.append("file", file);

			const url = new URL(this.scanApiUrl);
			url.pathname = "/scan";
			url.searchParams.set("simple", "true");

			const req = new Request(url.toString(), {
				method: "POST",
				body: formData
			})

			const response = await fetch(req);

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Scan API error (${response.status}): ${errorText}`);
			}

			const result = await response.json();
			return cardScanBockResponse.parse(result);
		} catch (error) {
			this.logger.error({
				error: error instanceof Error ? error.message : String(error),
				filename: file.name
			}, "Error scanning card");
			throw error;
		}
	}
}
