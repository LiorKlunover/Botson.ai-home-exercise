"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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

interface ProgressMetricsCardProps {
  feeds: Feed[];
}

interface MetricData {
  name: string;
  successRate: number;
  failureRate: number;
  missingMetadataRate: number;
  count?: number; // Optional count for aggregation
  timestamp?: string; // Optional timestamp for sorting
}

export default function ProgressMetricsCard({ feeds }: ProgressMetricsCardProps) {
  const [metricsData, setMetricsData] = useState<MetricData[]>([]);

  useEffect(() => {
    if (!feeds || feeds.length === 0) {
      setMetricsData([]);
      return;
    }

    // Calculate metrics for each feed
    const metrics = feeds.map(feed => {
      const totalJobs = feed.progress?.TOTAL_JOBS_IN_FEED || 0;
      
      // Calculate rates (as percentages)
      const successRate = totalJobs > 0 
        ? ((feed.progress?.TOTAL_JOBS_SENT_TO_INDEX || 0) / totalJobs) * 100 
        : 0;
        
      const failureRate = totalJobs > 0 
        ? ((feed.progress?.TOTAL_JOBS_FAIL_INDEXED || 0) / totalJobs) * 100 
        : 0;
        
      const missingMetadataRate = totalJobs > 0 
        ? (((feed.progress?.TOTAL_JOBS_DONT_HAVE_METADATA || 0) + 
           (feed.progress?.TOTAL_JOBS_DONT_HAVE_METADATA_V2 || 0)) / totalJobs) * 100 
        : 0;

      // Use date as name for the chart
      const date = new Date(feed.timestamp);
      const name = date.toLocaleDateString();

      return {
        name,
        successRate: parseFloat(successRate.toFixed(1)),
        failureRate: parseFloat(failureRate.toFixed(1)),
        missingMetadataRate: parseFloat(missingMetadataRate.toFixed(1)),
        timestamp: feed.timestamp // Used for sorting
      };
    });

    // Group by date (in case there are multiple feeds per day)
    const groupedByDate: Record<string, MetricData> = {};
    
    metrics.forEach(metric => {
      if (!groupedByDate[metric.name]) {
        groupedByDate[metric.name] = {
          name: metric.name,
          successRate: 0,
          failureRate: 0,
          missingMetadataRate: 0,
          count: 0
        };
      }
      
      groupedByDate[metric.name].successRate += metric.successRate;
      groupedByDate[metric.name].failureRate += metric.failureRate;
      groupedByDate[metric.name].missingMetadataRate += metric.missingMetadataRate;
      groupedByDate[metric.name].count = (groupedByDate[metric.name].count || 0) + 1;
    });
    
    // Calculate averages for each date
    const aggregatedMetrics = Object.values(groupedByDate).map(group => ({
      name: group.name,
      successRate: parseFloat((group.successRate / (group.count || 1)).toFixed(1)),
      failureRate: parseFloat((group.failureRate / (group.count || 1)).toFixed(1)),
      missingMetadataRate: parseFloat((group.missingMetadataRate / (group.count || 1)).toFixed(1))
    }));

    // Sort by date
    aggregatedMetrics.sort((a, b) => {
      const dateA = new Date(a.name.split('/').reverse().join('-'));
      const dateB = new Date(b.name.split('/').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    });
    
    // Limit to most recent 10 days for better visualization
    setMetricsData(aggregatedMetrics.slice(-10));
  }, [feeds]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Processing Metrics</CardTitle>
        <CardDescription>
          Success, failure, and missing metadata rates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {metricsData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metricsData}
                margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                  tickMargin={10}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickMargin={10}
                  unit="%"
                />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, '']}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                />
                <Legend />
                <Bar 
                  dataKey="successRate" 
                  name="Success Rate" 
                  fill="#4ade80" 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="failureRate" 
                  name="Failure Rate" 
                  fill="#f87171" 
                  radius={[4, 4, 0, 0]} 
                />
                <Bar 
                  dataKey="missingMetadataRate" 
                  name="Missing Metadata" 
                  fill="#fbbf24" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No metrics data available to display</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
