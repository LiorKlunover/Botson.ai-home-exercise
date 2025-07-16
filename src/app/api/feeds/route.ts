import { NextResponse } from 'next/server';
import { Feed } from '@/lib/db';

/**
 * GET handler for fetching feeds
 * @returns JSON response with the first 5 feeds
 */
export async function GET() {
  try {
    // Fetch only the first 5 feeds from the database
    const feeds = await Feed.find({}).limit(5);
    
    // Return the feeds as JSON
    return NextResponse.json({ 
      success: true, 
      data: feeds,
      count: feeds.length,
      limit: 5
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching feeds:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feeds' },
      { status: 500 }
    );
  }
}
