import { NextResponse } from 'next/server';
import { Feed } from '@/lib/db';

/**
 * GET handler for fetching distinct country names from the feeds collection
 * @returns JSON response with an array of unique country codes
 */
export async function GET() {
  try {
    // Get distinct country codes from the Feed collection
    const countries = await Feed.distinct('country_code');
    
    // Return the distinct country codes as JSON
    return NextResponse.json({ 
      countries,
      count: countries.length
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching country names:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch country names' },
      { status: 500 }
    );
  }
}
