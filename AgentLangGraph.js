// Simple implementation of the callAgent function for the chat server
import { MongoClient } from "mongodb";

/**
 * Processes a user query and generates an AI response
 * @param {MongoClient} client - MongoDB client
 * @param {string} query - User's message
 * @param {string} thread_id - Thread ID for conversation tracking
 * @returns {Promise<string>} - AI response
 */
export async function callAgent(client, query, thread_id) {
  console.log(`Processing query: "${query}" for thread: ${thread_id}`);
  
  try {
    // Connect to the database
    const db = client.db("myDatabase");
    const collection = db.collection("feeds");
    
    // Simple response generation based on query keywords
    if (query.toLowerCase().includes("feed") || query.toLowerCase().includes("feeds")) {
      // Try to find feeds in the database
      const feedsQuery = {};
      
      // Add filters based on query keywords
      if (query.toLowerCase().includes("india")) {
        feedsQuery.country_code = "IN";
      }
      
      if (query.toLowerCase().includes("completed")) {
        feedsQuery.status = "completed";
      }
      
      // Execute the query
      const feeds = await collection.find(feedsQuery).limit(5).toArray();
      
      if (feeds && feeds.length > 0) {
        return `I found ${feeds.length} feeds matching your criteria. Here's a summary:\n\n${
          feeds.map((feed, index) => 
            `Feed ${index + 1}:\n` +
            `- Country: ${feed.country_code || 'Not specified'}\n` +
            `- Status: ${feed.status || 'Not specified'}\n` +
            `- Transaction Source: ${feed.transactionSourceName || 'Not specified'}\n` +
            `- Records: ${feed.recordCount || 'Unknown'}\n`
          ).join('\n')
        }`;
      } else {
        return "I couldn't find any feeds matching your criteria. Please try a different query or check if the database has been populated with feed data.";
      }
    } else if (query.toLowerCase().includes("hello") || query.toLowerCase().includes("hi")) {
      return "Hello! I'm your AI chat assistant. I can help you query feed data from the MongoDB database. Try asking about feeds from specific countries or with specific statuses.";
    } else {
      return "I'm not sure how to respond to that query. Try asking about feeds in the database, for example: 'Show me feeds from India with completed status'.";
    }
  } catch (error) {
    console.error("Error in callAgent:", error);
    return "Sorry, I encountered an error while processing your request. Please try again later.";
  }
}
