"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

// Use the same Feed interface as in the dashboard page
interface Feed {
  transactionSourceName: string;
  country_code: string;
  currency_code: string;
  status: string;
  timestamp: string;
  recordCount: number;
  progress: {
    SWITCH_INDEX: boolean;
    TOTAL_RECORDS_IN_FEED: number;
    TOTAL_JOBS_FAIL_INDEXED: number;
    TOTAL_JOBS_IN_FEED: number;
    TOTAL_JOBS_SENT_TO_ENRICH: number;
    TOTAL_JOBS_DONT_HAVE_METADATA: number;
    TOTAL_JOBS_DONT_HAVE_METADATA_V2: number;
    TOTAL_JOBS_SENT_TO_INDEX: number;
  };
  noCoordinatesCount: number;
  uniqueRefNumberCount: number;
}

interface FeedGraphCardProps {
  feeds: Feed[];
  isLoading?: boolean;
}

interface DailyFeedCount {
  date: string;
  count: number;
}

export default function FeedGraphCard({ feeds, isLoading = false }: FeedGraphCardProps) {
  const [dailyData, setDailyData] = useState<DailyFeedCount[]>([]);

  useEffect(() => {
    if (!feeds || feeds.length === 0) {
      setDailyData([]);
      return;
    }

    // Process the feeds to count by day
    const feedsByDay = feeds.reduce<Record<string, number>>((acc, feed) => {
      if (!feed.timestamp) return acc;
      
      // Convert timestamp to YYYY-MM-DD format
      const date = new Date(feed.timestamp);
      const dateStr = date.toISOString().split('T')[0];
      
      // Increment count for this date
      acc[dateStr] = (acc[dateStr] || 0) + 1;
      return acc;
    }, {});

    // Convert to array format for the chart
    const chartData = Object.entries(feedsByDay).map(([date, count]) => ({
      date,
      count
    }));

    // Sort by date
    chartData.sort((a, b) => a.date.localeCompare(b.date));
    
    setDailyData(chartData);
  }, [feeds]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Feeds Per Day</CardTitle>
        <CardDescription>
          Distribution of feed records over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-2"></div>
                <p className="text-gray-500">Loading feed data...</p>
              </div>
            </div>
          ) : dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                  tickMargin={10}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickMargin={10}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value} feeds`, 'Count']}
                  labelFormatter={(label: string) => `Date: ${new Date(label).toLocaleDateString()}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#0ea5e9" 
                  fillOpacity={1} 
                  fill="url(#colorCount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No feed data available to display</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
