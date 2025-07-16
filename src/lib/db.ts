import mongoose, { Schema, model, Model } from 'mongoose';
import { IFeed } from '@/types';


// Define the schema
const feedSchema = new Schema<IFeed>({
  country_code: { type: String, required: true },
  currency_code: { type: String, required: true },
  progress: {
    SWITCH_INDEX: { type: Boolean, required: true },
    TOTAL_RECORDS_IN_FEED: { type: Number, required: true },
    TOTAL_JOBS_FAIL_INDEXED: { type: Number, required: true },
    TOTAL_JOBS_IN_FEED: { type: Number, required: true },
    TOTAL_JOBS_SENT_TO_ENRICH: { type: Number, required: true },
    TOTAL_JOBS_DONT_HAVE_METADATA: { type: Number, required: true },
    TOTAL_JOBS_DONT_HAVE_METADATA_V2: { type: Number, required: true },
    TOTAL_JOBS_SENT_TO_INDEX: { type: Number, required: true },
  },
  status: { type: String, required: true },
  timestamp: { type: Date, required: true },
  transactionSourceName: { type: String, required: true },
  noCoordinatesCount: { type: Number, required: true },
  recordCount: { type: Number, required: true },
  uniqueRefNumberCount: { type: Number, required: true },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields
});

// Create and export the model
export const Feed: Model<IFeed> = mongoose.models.Feed || model<IFeed>('Feed', feedSchema);
