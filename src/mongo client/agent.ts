import { ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { StateGraph } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { MongoClient } from "mongodb";
import { z } from "zod";
import "dotenv/config";


const GOOGLE_API_KEY="AIzaSyBrDfsaE1ZlXcuMnil8_8WxWxLHJ0Y7q1U"


export async function callAgent(client: MongoClient, query: string, thread_id: string) {
  console.log(`Agent called with query: ${query}`);

  // Get the database and collection - using the correct names from the seed script
  const dbName = "myDatabase";
  const db = client.db(dbName);
  const collection = db.collection("feeds embedded");

  // Define the graph state
  const GraphState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
      reducer: (x, y) => x.concat(y),
    }),
  });

  // Define the tools for the agent to use
  const feedLookupTool = tool(
    async ({ 
      query, 
      n = 50, 
      country_code, 
      currency_code, 
      status, 
      transactionSourceName, 
      date_from, 
      date_to,
      min_records,
      min_jobs 
    }) => {
      console.log("Feed lookup tool called");

      const dbConfig = {
        collection: collection,
        indexName: "vector_index",
        textKey: "embedding_text",
        embeddingKey: "embedding",
      };

      // Initialize vector store
      const vectorStore = new MongoDBAtlasVectorSearch(
        new GoogleGenerativeAIEmbeddings(
          {model: "models/gemini-embedding-exp-03-07"
          ,apiKey: GOOGLE_API_KEY
          }
        ),
        dbConfig
      );

      // Define a type for filter values that can be used in MongoDB queries
      type FilterValue = string | number | Date | { $gte?: number | Date; $lte?: Date; };
      
      // Build filter based on provided parameters
      const filter: Record<string, FilterValue> = {};
      
      // Add string filters
      if (country_code) {
        filter.country_code = country_code;
      }
      if (currency_code) {
        filter.currency_code = currency_code;
      }
      if (status) {
        filter.status = status;
      }
      if (transactionSourceName) {
        filter.transactionSourceName = transactionSourceName;
      }
      
      // Add date range filters
      if (date_from || date_to) {
        filter.timestamp = {};
        if (date_from) {
          filter.timestamp.$gte = new Date(date_from);
        }
        if (date_to) {
          filter.timestamp.$lte = new Date(date_to);
        }
      }
      
      // Add numeric filters
      if (min_records) {
        filter.recordCount = { $gte: min_records };
      }
      if (min_jobs) {
        filter['progress.TOTAL_JOBS_IN_FEED'] = { $gte: min_jobs };
      }

      // Debug logging
      console.log('Feed lookup filter:', JSON.stringify(filter));
      console.log('Query:', query);
      console.log('Parameters:', { country_code, currency_code, status, transactionSourceName, date_from, date_to, min_records, min_jobs });
      
      // Perform direct MongoDB query to verify data exists
      try {
        // Check myDatabase specifically
        const myDb = client.db('myDatabase');
        const collections = await myDb.listCollections().toArray();
        console.log(`Collections in myDatabase:`, collections.map(c => c.name));
        
        // Check the feeds embedded collection
        try {
          const feedsEmbeddedCollection = myDb.collection('feeds embedded');
          const count = await feedsEmbeddedCollection.countDocuments({});
          console.log(`myDatabase.feeds embedded has ${count} documents`);
          
          if (count > 0) {
            // Check for our specific document
            const directQueryFilter = { ...filter };
            const directResults = await feedsEmbeddedCollection.find(directQueryFilter).limit(5).toArray();
            console.log(`Query on myDatabase.feeds embedded found ${directResults.length} results:`, 
              directResults.length > 0 ? JSON.stringify(directResults.map(r => ({ 
                country_code: r.country_code, 
                transactionSourceName: r.transactionSourceName,
                status: r.status
              }))) : 'No results');
            
            // If we found results, also check a sample document structure
            if (directResults.length > 0) {
              console.log('Sample document keys:', Object.keys(directResults[0]));
            }
          }
          
          // If no results with filter, try to get a sample document
          if (count > 0) {
            const sampleDoc = await feedsEmbeddedCollection.findOne({});
            if (sampleDoc) {
              console.log('Sample document from collection:', JSON.stringify({
                country_code: sampleDoc.country_code,
                transactionSourceName: sampleDoc.transactionSourceName,
                status: sampleDoc.status
              }));
            }
          }
        } catch (collErr: unknown) {
          const errorMessage = collErr instanceof Error ? collErr.message : String(collErr);
          console.log(`Error checking myDatabase.feeds embedded:`, errorMessage);
        }
      } catch (err) {
        console.error('Error in direct MongoDB query:', err);
      }

      // Perform similarity search with optional filters
      try {
        const result = await vectorStore.similaritySearchWithScore(query, n, filter);
        console.log(`Vector search returned ${result.length} results`);
        
        // If vector search returns no results but we know data exists, fall back to direct query
        if (result.length === 0) {
          console.log('Vector search returned no results, falling back to direct query');
          const directResults = await collection.find(filter).limit(n).toArray();
          
          if (directResults.length > 0) {
            // Format results similar to vectorStore.similaritySearchWithScore
            const formattedResults = directResults.map(doc => {
              // Create a document with pageContent from metadata or construct a summary
              const pageContent = doc.embedding_text || 
                `Feed from ${doc.country_code} in ${doc.currency_code}. ` +
                `Status: ${doc.status}, Transaction source: ${doc.transactionSourceName}. ` +
                `Record count: ${doc.recordCount}, Timestamp: ${doc.timestamp}`;
              
              return [{ pageContent, metadata: doc }, 1.0]; // Score of 1.0 indicates direct match
            });
            
            console.log(`Direct query fallback returned ${formattedResults.length} results`);
            return JSON.stringify(formattedResults);
          }
        }
        
        return JSON.stringify(result);
      } catch (searchErr) {
        console.error('Error in vector search:', searchErr);
        // Fall back to direct query on error
        const directResults = await collection.find(filter).limit(n).toArray();
        
        if (directResults.length > 0) {
          // Format results similar to vectorStore.similaritySearchWithScore
          const formattedResults = directResults.map(doc => {
            // Create a document with pageContent from metadata or construct a summary
            const pageContent = doc.embedding_text || 
              `Feed from ${doc.country_code} in ${doc.currency_code}. ` +
              `Status: ${doc.status}, Transaction source: ${doc.transactionSourceName}. ` +
              `Record count: ${doc.recordCount}, Timestamp: ${doc.timestamp}`;
            
            return [{ pageContent, metadata: doc }, 1.0]; // Score of 1.0 indicates direct match
          });
          
          console.log(`Error fallback returned ${formattedResults.length} results`);
          return JSON.stringify(formattedResults);
        }
        
        throw searchErr;
      }
    },
    {
      name: "feed_lookup",
      description: "Searches for feed data based on various criteria",
      schema: z.object({
        query: z.string().describe("The search query for semantic search"),
        country_code: z.string().optional().describe("Filter by country code (e.g., 'US', 'IN', 'DE')"),
        currency_code: z.string().optional().describe("Filter by currency code (e.g., 'USD', 'EUR')"),
        status: z.string().optional().describe("Filter by feed status (e.g., 'completed')"),
        transactionSourceName: z.string().optional().describe("Filter by transaction source (e.g., 'Deal1', 'Deal2')"),
        date_from: z.string().optional().describe("Filter by start date in ISO format (e.g., '2025-07-01')"),
        date_to: z.string().optional().describe("Filter by end date in ISO format (e.g., '2025-07-31')"),
        min_records: z.number().optional().describe("Filter by minimum number of records"),
        min_jobs: z.number().optional().describe("Filter by minimum number of jobs in feed"),
        n: z
          .number()
          .optional()
          .default(50)
          .describe("Number of results to return"),
      }),
    }
  );

  const tools = [feedLookupTool];
  
  // We can extract the state typing via `GraphState.State`
  const toolNode = new ToolNode<typeof GraphState.State>(tools);

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash-preview-05-20",
    temperature: 0,
    apiKey: "AIzaSyBrDfsaE1ZlXcuMnil8_8WxWxLHJ0Y7q1U"
  }).bindTools(tools);

  // Define the function that determines whether to continue or not
  function shouldContinue(state: typeof GraphState.State) {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1] as AIMessage;

    // If the LLM makes a tool call, then we route to the "tools" node
    if (lastMessage.tool_calls?.length) {
      return "tools";
    }
    // Otherwise, we stop (reply to the user)
    return "__end__";
  }

  // Define the function that calls the model
  async function callModel(state: typeof GraphState.State) {
    // Define the system message
    const systemMessage = `You are a helpful AI assistant that can answer questions about feed data.
You have access to a feed lookup tool that can search for feed data based on various criteria.
The feed lookup tool accepts the following parameters:
- query: The search query for semantic search
- country_code: Filter by country code (e.g., 'US', 'IN', 'DE')
- currency_code: Filter by currency code (e.g., 'USD', 'EUR')
- status: Filter by feed status (e.g., 'completed')
- transactionSourceName: Filter by transaction source (e.g., 'Deal1', 'Deal2')
- date_from: Filter by start date in ISO format (e.g., '2025-07-01')
- date_to: Filter by end date in ISO format (e.g., '2025-07-31')
- min_records: Filter by minimum number of records
- min_jobs: Filter by minimum number of jobs in feed
- n: Number of results to return (default: 10)

When answering questions about feed data, use the feed lookup tool to search for relevant data.
Be sure to include all relevant filters in your search to provide the most accurate response.

IMPORTANT: When the feed lookup tool returns results, you MUST analyze the results and provide a detailed summary of the feed data.
Include information such as:
- Country code and currency code
- Transaction source name
- Status of the feed
- Record counts and job counts
- Timestamp information
- Any other relevant metrics

If multiple records are found, summarize the common patterns and any notable differences.
If no data is found, clearly state that no matching feed data was found for the specific criteria.

Always respond based on the actual data returned by the feed lookup tool, not based on general knowledge.`;

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are a helpful AI assistant, collaborating with other assistants. Use the provided tools to progress towards answering the question. If you are unable to fully answer, that's OK, another assistant with different tools will help where you left off. Execute what you can to make progress. If you or any of the other assistants have the final answer or deliverable, prefix your response with FINAL ANSWER so the team knows to stop. You have access to the following tools: {tool_names}.
{system_message}
Current time: {time}.`,
      ],
      new MessagesPlaceholder("messages"),
    ]);

    const formattedPrompt = await prompt.formatMessages({
      system_message: systemMessage,
      time: new Date().toISOString(),
      tool_names: tools.map((tool) => tool.name).join(", "),
      messages: state.messages,
    });

    const result = await model.invoke(formattedPrompt);

    return { messages: [result] };
  }

  // Define a new graph
  const workflow = new StateGraph(GraphState)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

  // Initialize the MongoDB memory to persist state between graph runs
  const checkpointer = new MongoDBSaver({ client, dbName });

  // This compiles it into a LangChain Runnable.
  // Note that we're passing the memory when compiling the graph
  const app = workflow.compile({ checkpointer });

  // Use the Runnable
  const finalState = await app.invoke(
    {
      messages: [new HumanMessage(query)],
    },
    { recursionLimit: 15, configurable: { thread_id: thread_id } }
  );

  // console.log(JSON.stringify(finalState.messages, null, 2));
  console.log(finalState.messages[finalState.messages.length - 1].content);
  
  return finalState.messages[finalState.messages.length - 1].content;
} 