import {config, parseEnvConfig} from "./config/config.ts";
import {connectMongoDB} from "./config/database.ts";
import {newHTTPServer} from "./router.ts";
import pino from "pino";
import {CardRepository} from "./repository/card_repository.ts";
import {CardImporterService} from "./service/card_importer_service.ts";
import {CardService} from "./service/card_service.ts";
import {runMigrations} from "./helper/mongodb_migrations.js";
import {migrations} from "./migrations/migrations.js";


parseEnvConfig()
console.log(config)
await connectMongoDB(config)

const cardRepository = new CardRepository()
const cardImporterService = new CardImporterService(cardRepository)
const cardService = new CardService(cardRepository)

await runMigrations(config, migrations)

cardImporterService.importLorcana('data/cards/lorcana-cards.json')
cardImporterService.importMTG('data/cards/mtg-cards.json')


pino().info('starting server on port %d', config.http.PORT)
Bun.serve({
	port: config.http.PORT,
	fetch: newHTTPServer(
		cardService
	).fetch,
	development: config.NODE_ENV === 'development'
})
