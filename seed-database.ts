import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { MongoClient } from "mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import fs from "fs";
import path from "path";
import "dotenv/config";

// Load environment variables from .env file
const MONGODB_URI = process.env.MONGODB_URI;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Check for required API keys
if (!GOOGLE_API_KEY) {
  console.error('GOOGLE_API_KEY environment variable is not defined');
  process.exit(1);
}

// Make sure we have a MongoDB connection string
if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not defined');
  process.exit(1);
}

const client = new MongoClient(MONGODB_URI);

async function seedDatabase(): Promise<void> {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const db = client.db("myDatabase");
    const collection = db.collection("feeds embedded");

    await collection.deleteMany({});
    // Load transformedFeeds.json data from the root directory
    const filePath = path.resolve(process.cwd(), "../../transformedFeeds.json");
    console.log(`Loading feed data from ${filePath}...`);
    
    // Define a type that matches the structure in the JSON file
    type FeedData = {
      _id: string;
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
      timestamp: string;
      transactionSourceName: string;
      noCoordinatesCount: number;
      recordCount: number;
      uniqueRefNumberCount: number;
    };
    
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as FeedData[];
    console.log(`Successfully loaded ${data.length} feed records`);

    // Create summaries for each feed record
    const recordsWithSummaries = await Promise.all(
      data.map(async (record) => {
        const basicInfo = `Feed from ${record.country_code} in ${record.currency_code}`;
        const progressInfo = `Total records: ${record.progress.TOTAL_RECORDS_IN_FEED}, Jobs in feed: ${record.progress.TOTAL_JOBS_IN_FEED}`;
        const statusInfo = `Status: ${record.status}, Transaction source: ${record.transactionSourceName}`;
        const counts = `Record count: ${record.recordCount}, Unique ref numbers: ${record.uniqueRefNumberCount}`;
        
        const summary = `${basicInfo}. ${progressInfo}. ${statusInfo}. ${counts}. Timestamp: ${record.timestamp}`;
        
        return {
          pageContent: summary,
          metadata: {...record},
        };
      })
    );
    
    console.log(`Processing ${recordsWithSummaries.length} feed records...`);
    
    for (const record of recordsWithSummaries) {
      await MongoDBAtlasVectorSearch.fromDocuments(
        [record],
        new GoogleGenerativeAIEmbeddings(
            {
                model: "models/gemini-embedding-exp-03-07",
                apiKey: GOOGLE_API_KEY
            }
        ),
        {
          collection,
          indexName: "vector_index",
          textKey: "embedding_text",
          embeddingKey: "embedding",
        }
      );

      console.log("Successfully processed & saved feed record:", record.metadata._id);
    }

    // Also insert the raw data without embeddings
    // Remove _id field to let MongoDB generate new ObjectIds
    const feedsForMongo = data.map((feed) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { _id, ...feedWithoutId } = feed;
      return feedWithoutId;
    });
    await collection.insertMany(feedsForMongo);
    console.log("Successfully inserted all feed records into the database");

    console.log("Database seeding completed");

  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await client.close();
  }
}

seedDatabase().catch(console.error);