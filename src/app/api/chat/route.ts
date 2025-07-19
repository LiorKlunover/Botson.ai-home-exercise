import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { callAgent } from "./agent";
import { z } from "zod";

// Input validation schema
const requestSchema = z.object({
  query: z.string().min(1, "Query cannot be empty").max(1000, "Query too long"),
  thread_id: z.string().min(1, "Thread ID is required")
});

// MongoDB connection
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
let client: MongoClient;

// Define global MongoDB client type
declare global {
  var mongoClient: MongoClient | undefined;
}

if (!global.mongoClient) {
  global.mongoClient = new MongoClient(uri);
  client = global.mongoClient;
} else {
  client = global.mongoClient;
}

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const { query, thread_id } = requestSchema.parse(body);

    // Connect to MongoDB if not already connected
    try {
      // Check if we need to connect
      const isConnected = await client.db().command({ ping: 1 })
        .then(() => true)
        .catch(() => false);
      
      if (!isConnected) {
        await client.connect();
      }
    } catch (error) {
      // If any error occurs during connection check, try to connect
      await client.connect();
    }

    // Call the agent with the query
    const response = await callAgent(client, query, thread_id);

    // Return the response with both text and feeds
    return NextResponse.json({ 
      text: response.text,
      feeds: response.feeds 
    }, { status: 200 });
  } catch (error) {
    console.error("Error in chat API:", error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.format() },
        { status: 400 }
      );
    }
    
    // Handle other errors
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
