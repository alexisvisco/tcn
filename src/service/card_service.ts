import {CardRepository} from "../repository/card_repository.ts";
import pino from "pino";
import {CardListRequest, CardListResponse} from "../domain/card.ts";
import type {CardScanRequest, CardScanResponse} from "../domain/card_scan.js";
import type {CardScannerService} from "./card_scanner_service.js";
import {cardScanResponse} from "../domain/card_scan.js";

export class CardService {
	private cardRepository: CardRepository;
	private cardScannerService: CardScannerService;
	private logger = pino({name: "CardService"});

	constructor(cardRepository: CardRepository, cardScanner: CardScannerService) {
		this.cardRepository = cardRepository;
		this.cardScannerService = cardScanner;
	}

	async list(request: CardListRequest): Promise<CardListResponse> {
		return await this.cardRepository.search(request)
	}

	async scan(request: CardScanRequest): Promise<CardScanResponse> {
		const results = await this.cardScannerService.scan(<File>request.file)

		const maybeCardsTitle = results.blocks
			.filter(e => e.confidence > 0.60 && e.text.length < 256)
			.map(e => e.text)
			.splice(0, 3)

		const scores = await this.cardRepository.findByNamesWithScore(maybeCardsTitle)
		return cardScanResponse.parse({items: scores})
	}
}
