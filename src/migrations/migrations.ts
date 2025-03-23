import type {Migration} from "../helper/mongodb_migrations.js";
import type {Db} from "mongodb";

export const migrations: Migration[] = [
	{
		version: 1,
		name: "Create indexes for card collection",
		up: async (db: Db) => {
			await db.collection("cards").createIndex({ type: 1 }, { name: "card_type_idx" });
			await db.collection("cards").createIndex({ name: 'text' }, { name: "card_name_text_idx" });
		},
		down: async (db: Db) => {
			await db.collection("cards").dropIndex("card_type_idx");
			await db.collection("cards").dropIndex("card_name_text_idx");
		}
	},
];
