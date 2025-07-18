"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

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

interface StatusDistributionCardProps {
  feeds: Feed[];
}

interface StatusCount {
  name: string;
  value: number;
}

// Define colors for different statuses
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function StatusDistributionCard({ feeds }: StatusDistributionCardProps) {
  const [statusData, setStatusData] = useState<StatusCount[]>([]);

  useEffect(() => {
    if (!feeds || feeds.length === 0) {
      setStatusData([]);
      return;
    }

    // Count feeds by status
    const statusCounts: Record<string, number> = {};
    
    feeds.forEach(feed => {
      if (feed.status) {
        statusCounts[feed.status] = (statusCounts[feed.status] || 0) + 1;
      }
    });

    // Convert to array format for the chart
    const chartData = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value
    }));

    // Sort by count (descending)
    chartData.sort((a, b) => b.value - a.value);
    
    setStatusData(chartData);
  }, [feeds]);

  // Custom renderer for the labels
  const renderCustomizedLabel = (props: { cx: number; cy: number; midAngle?: number; innerRadius: number; outerRadius: number; percent?: number }) => {
    const { cx, cy, midAngle = 0, innerRadius, outerRadius, percent = 0 } = props;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Status Distribution</CardTitle>
        <CardDescription>
          Distribution of feeds by status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} feeds`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No status data available to display</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
