import {CardRepository} from "../repository/card_repository.ts";
import pino from "pino";
import {CardListRequest, CardListResponse} from "../domain/card.ts";

export class CardService {
	private cardRepository: CardRepository;
	private logger = pino({name: "CardImporterService"});

	constructor(cardRepository: CardRepository) {
		this.cardRepository = cardRepository;
	}

	async cardList(request: CardListRequest): Promise<CardListResponse> {
		return await this.cardRepository.findCards(request)
	}
}
