import { NextResponse } from 'next/server';
import { Feed } from '@/lib/db';

/**
 * GET handler for fetching distinct client names from the feeds collection
 * @returns JSON response with an array of unique client names
 */
export async function GET() {
  try {
    // Get distinct client names (transactionSourceName) from the Feed collection
    const clients = await Feed.distinct('transactionSourceName');
    
    // Return the distinct client names as JSON
    return NextResponse.json({ 
      clients,
      count: clients.length
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching client names:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch client names' },
      { status: 500 }
    );
  }
}
