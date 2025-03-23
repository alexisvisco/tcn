import mongoose from 'mongoose';
import type {Config} from "./config.ts";
import pino from "pino";

export async function connectMongoDB(cfg: Config) {
	try {
		return await mongoose.connect(cfg.database.MONGO_URI, {
			appName: "cardnexus-test",
			dbName: cfg.database.DATABASE_NAME,
		});
	} catch (error) {
		pino().error(error, `unable to connect to mongodb database`)
	}
}
