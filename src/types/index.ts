import { Document } from 'mongoose';

// Feed data model for the feeds collection based on actual DB structure
export interface IFeed extends Document {
  country_code: string;
  currency_code: string;
  progress: {
    SWITCH_INDEX: boolean;
    TOTAL_RECORDS_IN_FEED: number;
    TOTAL_JOBS_FAIL_INDEXED: number;
    TOTAL_JOBS_IN_FEED: number;
    TOTAL_JOBS_SENT_TO_ENRICH: number;
    TOTAL_JOBS_DONT_HAVE_METADATA: number;
    TOTAL_JOBS_DONT_HAVE_METADATA_V2: number;
    TOTAL_JOBS_SENT_TO_INDEX: number;
  };
  status: string;
  timestamp: Date | string;
  transactionSourceName: string;
  noCoordinatesCount: number;
  recordCount: number;
  uniqueRefNumberCount: number;
}

