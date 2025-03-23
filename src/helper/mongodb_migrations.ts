// migration.ts
import {MongoClient, Db} from "mongodb";
import pino from "pino";
import type {Mongoose} from "mongoose";
import type {Config} from "../config/config.js";

export interface Migration {
	version: number;
	name: string;
	up: (db: Db) => Promise<void>;
	down: (db: Db) => Promise<void>;
}

export class MigrationRunner {
	private readonly db: Db;
	private readonly migrations: Migration[];
	private readonly logger = pino({name: "MigrationRunner"})

	constructor(db: Db, migrations: Migration[]) {
		this.db = db;
		this.migrations = migrations.sort((a, b) => a.version - b.version);
	}

	async migrate(): Promise<void> {
		// Ensure migrations collection exists
		const collections = await this.db.listCollections({name: "migrations"}).toArray();
		if (collections.length === 0) {
			await this.db.createCollection("migrations");
		}

		const applied = await this.db.collection("migrations")
			.find()
			.sort({version: 1})
			.toArray();

		const lastApplied = applied.length ? applied[applied.length - 1].version : 0;

		for (const migration of this.migrations) {
			if (migration.version > lastApplied) {
				this.logger.info(`Applying migration ${migration.version}: ${migration.name}`);

				try {
					await migration.up(this.db);

					await this.db.collection("migrations").insertOne({
						version: migration.version,
						name: migration.name,
						appliedAt: new Date()
					});

					this.logger.info(`Migration ${migration.version} completed successfully`);
				} catch (error) {
					this.logger.info(error, "Migration failed")
					throw error;
				}
			}
		}
	}
}

export async function runMigrations(cfg: Config, migrations: Migration[]) {
	const client = new MongoClient(cfg.database.MONGO_URI);
	try {
		await client.connect();
		const db = client.db(cfg.database.DATABASE_NAME);
		const runner = new MigrationRunner(db, migrations);
		await runner.migrate();
	} catch (e) {
		pino().error(e, "unable to migrate database")
	}
}
