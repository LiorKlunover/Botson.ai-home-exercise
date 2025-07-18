import { NextResponse } from 'next/server';
import { Feed } from '@/lib/db';
import { z } from 'zod';

// Define input validation schema using Zod
const queryParamsSchema = z.object({
  countries: z.array(z.string()).optional(),
  clients: z.array(z.string()).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().default(10)
});

interface MongoFilter {
  country_code?: { $in: string[] };
  transactionSourceName?: { $in: string[] };
}

/**
 * GET handler for fetching feeds with filtering and pagination
 * @param request - The incoming request with query parameters
 * @returns JSON response with feeds, pagination info, and filter options
 */
export async function GET(request: Request) {
  try {
    // Get URL and parse query parameters
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const rawCountries = searchParams.getAll('countries');
    const rawClients = searchParams.getAll('clients');
    const rawPage = searchParams.get('page') || '1';
    const rawPageSize = searchParams.get('pageSize') || '10';
    
    // Validate input parameters
    const validatedParams = queryParamsSchema.parse({
      countries: rawCountries.length > 0 ? rawCountries : undefined,
      clients: rawClients.length > 0 ? rawClients : undefined,
      page: rawPage,
      pageSize: rawPageSize
    });
    
    const { countries, clients, page, pageSize } = validatedParams;
    const skip = (page - 1) * pageSize;
    
    // Build filter object
    const filter: MongoFilter = {};
    
    // Add country filter if provided
    if (countries && countries.length > 0) {
      filter.country_code = { $in: countries };
    }
    
    // Add client filter if provided
    if (clients && clients.length > 0) {
      filter.transactionSourceName = { $in: clients };
    }
    
    // Get total count for pagination
    const totalCount = await Feed.countDocuments(filter);
    console.log('Filter:', filter);
    console.log('Skip:', skip);
    console.log('Page size:', pageSize);
    // Fetch feeds with pagination
    const feeds = await Feed.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(pageSize);
    
    // Get distinct countries and clients for filter options
    const allCountries = await Feed.distinct('country_code');
    const allClients = await Feed.distinct('transactionSourceName');
    console.log('Total count:', totalCount);

    // Return response with feeds, pagination info, and filter options
    return NextResponse.json({
      feeds,
      pagination: {
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
        totalCount
      },
      filterOptions: {
        countries: allCountries,
        clients: allClients
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching feeds:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feeds' },
      { status: 500 }
    );
  }
}
