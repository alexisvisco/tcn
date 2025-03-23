import mongoose, {Document, Model, Schema} from 'mongoose';

export interface ICard extends Document {
	id: string;
	name: string;
	type: string;
	imageUrl?: string;
	attributes: {
		inkCost?: number;
		color?: string;
		rarity?: string;
	};
	createdAt?: Date;
	updatedAt?: Date;
}

export const cardSchema = new Schema<ICard>({
	id: {
		type: String,
		required: true,
		unique: true
	},
	name: {
		type: String,
		required: true,
	},
	imageUrl: {
		type: String,
	},
	type: {
		type: String,
		required: true,
	},
	attributes: {
		type: Object,
		required: true,
		inkCost: {
			type: Number,
		},
		color: {
			type: String,
		},
		rarity: {
			type: String,
		}
	}
}, {
	timestamps: true,
	strict: true,
	collection: 'cards'
});

export function cardGameCollection(): Model<ICard> {
	return mongoose.model('Card', cardSchema);
}
