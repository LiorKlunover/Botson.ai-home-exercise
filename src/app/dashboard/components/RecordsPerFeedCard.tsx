"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

interface RecordsPerFeedCardProps {
  feeds: Feed[];
}

interface DailyRecordData {
  date: string;
  avgRecords: number;
  totalFeeds: number;
}

export default function RecordsPerFeedCard({ feeds }: RecordsPerFeedCardProps) {
  const [recordsData, setRecordsData] = useState<DailyRecordData[]>([]);

  useEffect(() => {
    if (!feeds || feeds.length === 0) {
      setRecordsData([]);
      return;
    }

    // Group feeds by date and calculate average records per feed
    const feedsByDay: Record<string, { totalRecords: number; feedCount: number }> = {};
    
    feeds.forEach(feed => {
      if (!feed.timestamp) return;
      
      // Convert timestamp to YYYY-MM-DD format
      const date = new Date(feed.timestamp);
      const dateStr = date.toISOString().split('T')[0];
      
      if (!feedsByDay[dateStr]) {
        feedsByDay[dateStr] = { totalRecords: 0, feedCount: 0 };
      }
      
      // Add record count for this feed
      const recordCount = feed.recordCount || feed.progress?.TOTAL_RECORDS_IN_FEED || 0;
      feedsByDay[dateStr].totalRecords += recordCount;
      feedsByDay[dateStr].feedCount += 1;
    });

    // Convert to array format for the chart
    const chartData = Object.entries(feedsByDay).map(([date, data]) => ({
      date,
      avgRecords: Math.round(data.totalRecords / data.feedCount),
      totalFeeds: data.feedCount
    }));

    // Sort by date
    chartData.sort((a, b) => a.date.localeCompare(b.date));
    
    setRecordsData(chartData);
  }, [feeds]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Records Per Feed</CardTitle>
        <CardDescription>
          Average number of records per feed over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {recordsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={recordsData}
                margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                  tickMargin={10}
                />
                <YAxis 
                  yAxisId="left"
                  tick={{ fontSize: 12 }}
                  tickMargin={10}
                  domain={['auto', 'auto']}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 12 }}
                  tickMargin={10}
                  domain={[0, 'auto']}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'avgRecords') return [`${value} records`, 'Avg Records'];
                    return [`${value} feeds`, 'Feed Count'];
                  }}
                  labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="avgRecords" 
                  name="Average Records"
                  stroke="#0ea5e9" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="totalFeeds" 
                  name="Total Feeds"
                  stroke="#f97316" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No records data available to display</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
