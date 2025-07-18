import 'dotenv/config';
import express from "express";
import type { Request, Response } from "express";
type Express = ReturnType<typeof express>;
import { MongoClient } from "mongodb";
import { callAgent } from './agent.ts';

const app: Express = express();
app.use(express.json());

// Hardcoded MongoDB URI to ensure connection works
const MONGODB_URI = "mongodb+srv://lior345622:JKTAas1uTa0psQgT@cluster0.zttbjsy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
console.log('Using MongoDB URI:', MONGODB_URI);

// Initialize MongoDB client
const client = new MongoClient(MONGODB_URI);

async function startServer() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // Set up basic Express route
    // curl -X GET http://localhost:3000/
    app.get('/', (req: Request, res: Response) => {
      res.send('LangGraph Agent Server');
    });

    // API endpoint to start a new conversation
    // curl -X POST -H "Content-Type: application/json" -d '{"message": "Show me feeds from India with completed status"}' http://localhost:3000/chat
    app.post('/chat', async (req: Request, res: Response) => {
      const initialMessage = req.body.message;
      const threadId = Date.now().toString(); // Simple thread ID generation
      try {
        console.log(`Processing chat request with message: ${initialMessage}`);
        const response = await callAgent(client, initialMessage, threadId);
        res.json({ threadId, response });
      } catch (error) {
        console.error('Error starting conversation:', error instanceof Error ? error.message : String(error));
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
        res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) });
      }
    });
    
    // Advanced API endpoint with filter parameters
    // curl -X POST -H "Content-Type: application/json" -d '{"message": "Show me feed details", "filters": {"country_code": "IN", "status": "completed"}}' http://localhost:3000/chat/filtered
    app.post('/chat/filtered', async (req: Request, res: Response) => {
      const { message, filters } = req.body;
      const threadId = Date.now().toString();
      
      try {
        // Construct a more specific query using the filters
        let enhancedMessage = message;
        
        if (filters) {
          enhancedMessage += " with the following filters: ";
          const filterParts: string[] = [];
          
          if (filters.country_code) {
            filterParts.push(`country code ${filters.country_code}`);
          }
          
          if (filters.currency_code) {
            filterParts.push(`currency code ${filters.currency_code}`);
          }
          
          if (filters.status) {
            filterParts.push(`status ${filters.status}`);
          }
          
          if (filters.transactionSourceName) {
            filterParts.push(`transaction source ${filters.transactionSourceName}`);
          }
          
          if (filters.date_from && filters.date_to) {
            filterParts.push(`date range from ${filters.date_from} to ${filters.date_to}`);
          } else if (filters.date_from) {
            filterParts.push(`date from ${filters.date_from}`);
          } else if (filters.date_to) {
            filterParts.push(`date until ${filters.date_to}`);
          }
          
          if (filters.min_records) {
            filterParts.push(`minimum ${filters.min_records} records`);
          }
          
          if (filters.min_jobs) {
            filterParts.push(`minimum ${filters.min_jobs} jobs`);
          }
          
          enhancedMessage += filterParts.join(", ");
        }
        
        console.log(`Processing filtered chat request with message: ${enhancedMessage}`);
        const response = await callAgent(client, enhancedMessage, threadId);
        res.json({ threadId, response, appliedFilters: filters || {} });
      } catch (error) {
        console.error('Error in filtered chat:', error instanceof Error ? error.message : String(error));
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
        res.status(500).json({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) });
      }
    });

    // API endpoint to send a message in an existing conversation
    // curl -X POST -H "Content-Type: application/json" -d '{"message": "What team members did you recommend?"}' http://localhost:3000/chat/123456789
    app.post('/chat/:threadId', async (req: Request, res: Response) => {
      const { threadId } = req.params;
      const { message } = req.body;
      try {
        const response = await callAgent(client, message, threadId);
        res.json({ response });
      } catch (error) {
        console.error('Error in chat:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

startServer();