
export let config = {
	database: {
		MONGO_URI: 'mongodb://localhost:27017',
		DATABASE_NAME: 'cardnexus'
	},
	scanner: {
		URL: 'http://localhost:8000/scan?simple=true'
	},
	http: {
		PORT: 3000
	},
	NODE_ENV: 'development'
}

export type Config = typeof config;

export function parseEnvConfig() {
	config.database.MONGO_URI = process.env.MONGO_URI || config.database.MONGO_URI;
	config.database.DATABASE_NAME = process.env.DATABASE_NAME || config.database.DATABASE_NAME;

	config.http.PORT = process.env.PORT ? parseInt(process.env.PORT) : config.http.PORT;
	config.NODE_ENV = process.env.NODE_ENV || config.NODE_ENV;

	config.scanner.URL = process.env.SCANNER_API_URL || config.scanner.URL;
}
