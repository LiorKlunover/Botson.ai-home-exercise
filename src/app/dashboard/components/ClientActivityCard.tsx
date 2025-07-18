"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

interface ClientActivityCardProps {
  feeds: Feed[];
}

interface ClientCount {
  name: string;
  count: number;
}

export default function ClientActivityCard({ feeds }: ClientActivityCardProps) {
  const [clientData, setClientData] = useState<ClientCount[]>([]);

  useEffect(() => {
    if (!feeds || feeds.length === 0) {
      setClientData([]);
      return;
    }

    // Count feeds by client (transactionSourceName)
    const clientCounts: Record<string, number> = {};
    
    feeds.forEach(feed => {
      if (feed.transactionSourceName) {
        clientCounts[feed.transactionSourceName] = (clientCounts[feed.transactionSourceName] || 0) + 1;
      }
    });

    // Convert to array format for the chart
    const chartData = Object.entries(clientCounts).map(([name, count]) => ({
      name,
      count
    }));

    // Sort by count (descending)
    chartData.sort((a, b) => b.count - a.count);
    
    // Limit to top 10 clients for better visualization
    setClientData(chartData.slice(0, 10));
  }, [feeds]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Client Activity</CardTitle>
        <CardDescription>
          Distribution of feeds by client (top 10)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {clientData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={clientData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.1} />
                <XAxis type="number" />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={120}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value} feeds`, 'Count']}
                  labelFormatter={(label) => `Client: ${label}`}
                />
                <Bar 
                  dataKey="count" 
                  fill="#8884d8" 
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No client data available to display</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
