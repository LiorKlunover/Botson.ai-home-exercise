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
import { MongoClient, Collection, Db } from "mongodb";
import { z } from "zod";
import "dotenv/config";
import { feedLookupSystemMessage } from "./systempromts";
import { IFeed } from "@/types";

// Global variables
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const DB_NAME = "myDatabase";
const COLLECTION_NAME = "feeds embedded";
const VECTOR_INDEX_NAME = "vector_index";
const MODEL_NAME = "gemini-2.5-flash-preview-05-20";
const EMBEDDING_MODEL = "models/gemini-embedding-exp-03-07";
const DEFAULT_RESULT_LIMIT = 50;
const RECURSION_LIMIT = 15;

// Type definitions
type FilterValue = string | number | Date | { $gte?: number | Date; $lte?: Date; };

// Define the graph state with proper reducers
const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  feeds: Annotation<IFeed[]>({
    reducer: (x, y) => [...x, ...y],
    default: () => [],
  }),
});

// Database setup functions
function getDatabase(client: MongoClient): Db {
  return client.db(DB_NAME);
}

function getCollection(db: Db): Collection {
  return db.collection(COLLECTION_NAME);
}

function createVectorStore(collection: Collection): MongoDBAtlasVectorSearch {
  const dbConfig = {
    collection: collection,
    indexName: VECTOR_INDEX_NAME,
    textKey: "embedding_text",
    embeddingKey: "embedding",
  };

  return new MongoDBAtlasVectorSearch(
    new GoogleGenerativeAIEmbeddings({
      model: EMBEDDING_MODEL,
      apiKey: GOOGLE_API_KEY
    }),
    dbConfig
  );
}

// Filter building function
function buildFilter(params: {
  country_code?: string;
  currency_code?: string;
  status?: string;
  transactionSourceName?: string;
  date_from?: string;
  date_to?: string;
  min_records?: number;
  min_jobs?: number;
}): Record<string, FilterValue> {
  const filter: Record<string, FilterValue> = {};
  
  // Add string filters
  if (params.country_code) filter.country_code = params.country_code;
  if (params.currency_code) filter.currency_code = params.currency_code;
  if (params.status) filter.status = params.status;
  if (params.transactionSourceName) filter.transactionSourceName = params.transactionSourceName;
  
  // Add date range filters
  if (params.date_from || params.date_to) {
    filter.timestamp = {};
    if (params.date_from) filter.timestamp.$gte = new Date(params.date_from);
    if (params.date_to) filter.timestamp.$lte = new Date(params.date_to);
  }
  
  // Add numeric filters
  if (params.min_records) filter.recordCount = { $gte: params.min_records };
  if (params.min_jobs) filter['progress.TOTAL_JOBS_IN_FEED'] = { $gte: params.min_jobs };

  return filter;
}

// Debug logging functions
async function logDatabaseInfo(client: MongoClient): Promise<void> {
  try {
    const myDb = client.db(DB_NAME);
    const collections = await myDb.listCollections().toArray();
    console.log(`Collections in ${DB_NAME}:`, collections.map(c => c.name));
  } catch (err) {
    console.error('Error logging database info:', err);
  }
}

async function logCollectionInfo(collection: Collection, filter: Record<string, FilterValue>): Promise<void> {
  try {
    const count = await collection.countDocuments({});
    console.log(`${COLLECTION_NAME} has ${count} documents`);
    
    if (count > 0) {
      const directResults = await collection.find(filter).limit(5).toArray();
      console.log(`Query found ${directResults.length} results:`, 
        directResults.length > 0 ? JSON.stringify(directResults.map(r => ({ 
          country_code: r.country_code, 
          transactionSourceName: r.transactionSourceName,
          status: r.status
        }))) : 'No results');
      
      if (directResults.length > 0) {
        console.log('Sample document keys:', Object.keys(directResults[0]));
      }
      
      // Log sample document if no results with filter
      if (directResults.length === 0) {
        const sampleDoc = await collection.findOne({});
        if (sampleDoc) {
          console.log('Sample document from collection:', JSON.stringify({
            country_code: sampleDoc.country_code,
            transactionSourceName: sampleDoc.transactionSourceName,
            status: sampleDoc.status
          }));
        }
      }
    }
  } catch (collErr: unknown) {
    const errorMessage = collErr instanceof Error ? collErr.message : String(collErr);
    console.log(`Error checking ${COLLECTION_NAME}:`, errorMessage);
  }
}

// Result formatting function
interface FeedDocument {
  embedding_text?: string;
  country_code?: string;
  currency_code?: string;
  status?: string;
  transactionSourceName?: string;
  recordCount?: number;
  timestamp?: Date;
  progress?: Record<string, unknown>;
  [key: string]: unknown;
}

// Updated search functions to return properly formatted feed documents
async function performVectorSearch(
  vectorStore: MongoDBAtlasVectorSearch, 
  query: string, 
  n: number, 
  filter: Record<string, FilterValue>
): Promise<FeedDocument[]> {
  try {
    const result = await vectorStore.similaritySearchWithScore(query, n, filter);
    console.log(`Vector search returned ${result.length} results`);
    return result.map(([doc]) => ({
      ...doc.metadata,
      embedding_text: doc.pageContent,
    })) as FeedDocument[];
  } catch (searchErr) {
    console.error('Error in vector search:', searchErr);
    throw searchErr;
  }
}

async function performDirectQuery(
  collection: Collection, 
  filter: Record<string, FilterValue>, 
  n: number
): Promise<FeedDocument[]> {
  const directResults = await collection.find(filter).limit(n).toArray();
  console.log(`Direct query returned ${directResults.length} results`);
  return directResults as FeedDocument[];
}

// Main feed lookup function - Fixed to always return valid JSON
async function performFeedLookup(
  client: MongoClient,
  params: {
    query: string;
    n?: number;
    country_code?: string;
    currency_code?: string;
    status?: string;
    transactionSourceName?: string;
    date_from?: string;
    date_to?: string;
    min_records?: number;
    min_jobs?: number;
  }
): Promise<string> {
  try {
    console.log("Feed lookup tool called");
    
    const { query, n = DEFAULT_RESULT_LIMIT, ...filterParams } = params;
    const filter = buildFilter(filterParams);
    
    // Debug logging
    console.log('Feed lookup filter:', JSON.stringify(filter));
    console.log('Query:', query);
    console.log('Parameters:', filterParams);
    
    const db = getDatabase(client);
    const collection = getCollection(db);
    const vectorStore = createVectorStore(collection);
    
    // Log database and collection info
    await logDatabaseInfo(client);
    await logCollectionInfo(collection, filter);
    
    // Perform vector search first
    let results: FeedDocument[] = [];
    try {
      const vectorResult = await performVectorSearch(vectorStore, query, n, filter);
      if (vectorResult.length > 0) {
        results = vectorResult;
      } else {
        results = await performDirectQuery(collection, filter, n);
      }
    } catch (searchErr) {
      console.log('Vector search failed, falling back to direct query');
      results = await performDirectQuery(collection, filter, n);
    }

    console.log(`Feed lookup returning ${results.length} results`);
    
    // Return serializable JSON string that can be parsed later
    const serializedResults = results.map(doc => ({
      ...doc,
      timestamp: doc.timestamp instanceof Date ? doc.timestamp.toISOString() : doc.timestamp
    }));
    
    return JSON.stringify(serializedResults);
    
  } catch (error) {
    console.error('Error in performFeedLookup:', error);
    // Return empty array as JSON string instead of throwing
    return JSON.stringify([]);
  }
}

// Tool creation function - Fixed schema validation
function createFeedLookupTool(client: MongoClient) {
  return tool(
    async (params) => {
      // Validate required parameters
      if (!params.query || typeof params.query !== 'string') {
        console.error('Invalid query parameter:', params.query);
        return JSON.stringify([]);
      }
      
      return performFeedLookup(client, params);
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
        n: z.number().optional().default(DEFAULT_RESULT_LIMIT).describe("Number of results to return"),
      }),
    }
  );
}

// Updated process tool response function with better error handling
async function processToolResponse(state: typeof GraphState.State) {
  console.log('Processing tool responses...');
  
  // Get all tool messages from the current batch
  const toolMessages = state.messages.filter(m => m.getType() === 'tool');
  
  if (toolMessages.length === 0) {
    console.log('No tool messages found');
    return { feeds: [] };
  }

  const allFeeds: IFeed[] = [];

  for (const toolMessage of toolMessages) {
    if ('content' in toolMessage && typeof toolMessage.content === 'string') {
      try {
        console.log('Processing tool message content...');
        
        // Check if content starts with "Error:" - this indicates a validation error
        if (toolMessage.content.startsWith('Error:')) {
          console.error('Tool returned error:', toolMessage.content);
          continue; // Skip this message and continue with others
        }
        
        // Parse the JSON response from the tool
        const feedDocs = JSON.parse(toolMessage.content) as FeedDocument[];
        
        if (Array.isArray(feedDocs)) {
          // Convert each document to IFeed format
          const feeds = feedDocs.map(doc => ({
            country_code: doc.country_code || '',
            currency_code: doc.currency_code || '',
            status: doc.status || '',
            transactionSourceName: doc.transactionSourceName || '',
            recordCount: doc.recordCount || 0,
            timestamp: doc.timestamp ? new Date(doc.timestamp) : new Date(),
            progress: doc.progress || {},
            // Include any additional properties
            ...Object.fromEntries(
              Object.entries(doc).filter(([key]) => 
                !['country_code', 'currency_code', 'status', 'transactionSourceName', 
                  'recordCount', 'timestamp', 'progress', 'embedding_text'].includes(key)
              )
            ),
          }) as IFeed);
          
          allFeeds.push(...feeds);
          console.log(`Processed ${feeds.length} feeds from tool response`);
        }
      } catch (error) {
        console.error('Error parsing tool response:', error);
        console.error('Tool content preview:', toolMessage.content.substring(0, 200));
        // Don't throw here, just continue processing other messages
      }
    }
  }

  console.log(`Total feeds processed: ${allFeeds.length}`);
  return { feeds: allFeeds };
}

// Model creation function
import { StructuredTool } from "@langchain/core/tools";

function createModel(tools: StructuredTool[]) {
  return new ChatGoogleGenerativeAI({
    model: MODEL_NAME,
    temperature: 0,
    apiKey: GOOGLE_API_KEY
  }).bindTools(tools);
}

// Workflow control functions
function shouldContinue(state: typeof GraphState.State) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;
  
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }
  return "__end__";
}

async function callModel(state: typeof GraphState.State, tools: StructuredTool[]) {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are a helpful AI assistant, collaborating with other assistants. Use the provided tools to progress towards answering the question. If you are unable to fully answer, that's OK, another assistant with different tools will help where you left off. Execute what you can to make progress. 

When you retrieve feed data, the system will automatically update the feed state. You currently have ${state.feeds.length} feeds in the state.

When using the feed_lookup tool, always provide a descriptive query string for semantic search. For example:
- "feed data for US Deal4" instead of just "all records"
- "completed transaction feeds" for status searches
- "recent feed processing data" for time-based queries

If you or any of the other assistants have the final answer or deliverable, prefix your response with FINAL ANSWER so the team knows to stop. You have access to the following tools: {tool_names}.
{system_message}
Current time: {time}.`,
    ],
    new MessagesPlaceholder("messages"),
  ]);

  const formattedPrompt = await prompt.formatMessages({
    system_message: feedLookupSystemMessage,
    time: new Date().toISOString(),
    tool_names: tools.map((tool) => tool.name).join(", "),
    messages: state.messages,
  });

  const model = createModel(tools);
  const result = await model.invoke(formattedPrompt);

  return { messages: [result] };
}

// Workflow creation function
function createWorkflow(client: MongoClient) {
  const feedLookupTool = createFeedLookupTool(client);
  const tools = [feedLookupTool];
  const toolNode = new ToolNode<typeof GraphState.State>(tools);

  const workflow = new StateGraph(GraphState)
    .addNode("agent", (state) => callModel(state, tools))
    .addNode("tools", toolNode)
    .addNode("process_tool", processToolResponse)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "process_tool") // Tools output goes to process_tool
    .addEdge("process_tool", "agent"); // Then back to agent

  const checkpointer = new MongoDBSaver({ client, dbName: DB_NAME });
  return workflow.compile({ checkpointer });
}

// Response type including both text and feeds
export interface AgentResponse {
  text: string;
  feeds: IFeed[];
}

// Main agent function
export async function callAgent(client: MongoClient, query: string, thread_id: string): Promise<AgentResponse> {
  console.log(`Agent called with query: ${query}`);

  const app = createWorkflow(client);

  // Initialize with empty feeds array
  const initialFeeds: IFeed[] = [];

  const finalState = await app.invoke(
    {
      messages: [new HumanMessage(query)],
      feeds: initialFeeds,
    },
    { recursionLimit: RECURSION_LIMIT, configurable: { thread_id: thread_id } }
  );

  const responseText = finalState.messages[finalState.messages.length - 1].content as string;
  
  // Log the final state for debugging
  console.log("Final response text:", responseText.substring(0, 200) + '...');
  console.log(`Final state contains ${finalState.feeds.length} feeds`);
  
  // Log some details about the feeds for debugging
  if (finalState.feeds.length > 0) {
    console.log("Final state feeds:", finalState.feeds.slice(0, 3).map(feed => ({
      country: feed.country_code,
      source: feed.transactionSourceName,
      status: feed.status,
      recordCount: feed.recordCount
    })));
  }
  
  return {
    text: responseText,
    feeds: finalState.feeds,
  };
}