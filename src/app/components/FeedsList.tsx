"use client";

import { useEffect, useState } from 'react';
import { IFeed } from '@/types';

interface ApiResponse {
  success: boolean;
  data: IFeed[];
  error?: string;
}

export function FeedsList() {
  const [feeds, setFeeds] = useState<IFeed[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeeds = async () => {
      try {
        const response = await fetch('/api/feeds');
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data: ApiResponse = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch feeds');
        }
        
        setFeeds(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Failed to fetch feeds:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeeds();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 rounded-md">
        <h2 className="text-red-600 font-semibold">Error loading feeds</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Feed Processing Records</h2>
      {feeds.length === 0 ? (
        <p className="text-gray-500">No feeds found</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {feeds.map((feed) => (
            <div 
              key={feed._id?.toString()} 
              className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Source:</span>
                <span>{feed.transactionSourceName}</span>
              </div>
              
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Status:</span>
                <span className={`px-2 py-1 rounded text-xs ${feed.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {feed.status}
                </span>
              </div>
                
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Country/Currency:</span>
                <span>{feed.country_code}/{feed.currency_code}</span>
              </div>
                
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Record Count:</span>
                <span>{feed.recordCount.toLocaleString()}</span>
              </div>
                
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Unique References:</span>
                <span>{feed.uniqueRefNumberCount.toLocaleString()}</span>
              </div>
                
              <div className="mt-3 pt-3 border-t">
                <h4 className="font-semibold mb-2">Progress</h4>
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span>Total Records:</span>
                    <span>{feed.progress.TOTAL_RECORDS_IN_FEED.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jobs in Feed:</span>
                    <span>{feed.progress.TOTAL_JOBS_IN_FEED.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jobs Indexed:</span>
                    <span>{feed.progress.TOTAL_JOBS_SENT_TO_INDEX.toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="mt-3 text-xs text-gray-500">
                  {typeof feed.timestamp === 'string' ? (
                    <time dateTime={feed.timestamp}>
                      {new Date(feed.timestamp).toLocaleString()}
                    </time>
                  ) : (
                    <time dateTime={feed.timestamp instanceof Date ? feed.timestamp.toISOString() : ''}>
                      {feed.timestamp instanceof Date ? feed.timestamp.toLocaleString() : ''}
                    </time>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
