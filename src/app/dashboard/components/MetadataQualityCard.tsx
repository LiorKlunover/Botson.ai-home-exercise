"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

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

interface MetadataQualityCardProps {
  feeds: Feed[];
}

interface MetadataData {
  name: string;
  value: number;
}

// Define colors for the pie chart
const COLORS = ['#4ade80', '#f87171'];

export default function MetadataQualityCard({ feeds }: MetadataQualityCardProps) {
  const [metadataData, setMetadataData] = useState<MetadataData[]>([]);
  const [totalJobs, setTotalJobs] = useState<number>(0);
  const [missingMetadata, setMissingMetadata] = useState<number>(0);

  useEffect(() => {
    if (!feeds || feeds.length === 0) {
      setMetadataData([]);
      setTotalJobs(0);
      setMissingMetadata(0);
      return;
    }

    // Calculate total jobs and missing metadata counts
    let totalJobsCount = 0;
    let missingMetadataCount = 0;
    
    feeds.forEach(feed => {
      if (feed.progress) {
        const jobsInFeed = feed.progress.TOTAL_JOBS_IN_FEED || 0;
        const missingMetadataV1 = feed.progress.TOTAL_JOBS_DONT_HAVE_METADATA || 0;
        const missingMetadataV2 = feed.progress.TOTAL_JOBS_DONT_HAVE_METADATA_V2 || 0;
        
        totalJobsCount += jobsInFeed;
        missingMetadataCount += (missingMetadataV1 + missingMetadataV2);
      }
    });
    
    setTotalJobs(totalJobsCount);
    setMissingMetadata(missingMetadataCount);

    // Create data for the pie chart
    const completeMetadata = totalJobsCount - missingMetadataCount;
    
    const chartData = [
      { name: 'Complete Metadata', value: completeMetadata },
      { name: 'Missing Metadata', value: missingMetadataCount }
    ];
    
    setMetadataData(chartData);
  }, [feeds]);

  // Calculate the percentage of missing metadata
  const missingMetadataPercentage = totalJobs > 0 
    ? ((missingMetadata / totalJobs) * 100).toFixed(1)
    : '0';

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Metadata Quality</CardTitle>
        <CardDescription>
          {totalJobs > 0 
            ? `${missingMetadataPercentage}% of records are missing metadata (${missingMetadata} of ${totalJobs})`
            : 'No metadata quality data available'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {metadataData.length > 0 && totalJobs > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metadataData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent ? (percent * 100).toFixed(0) : 0)}%`}
                >
                  {metadataData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} records`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No metadata quality data available to display</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
