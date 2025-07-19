"use client";

import { useState } from 'react';
import TotalCard from './TotalCard';
import FeedGraphCard from './FeedGraphCard';
import StatusDistributionCard from './StatusDistributionCard';
import ProgressMetricsCard from './ProgressMetricsCard';
import ClientActivityCard from './ClientActivityCard';
import MetadataQualityCard from './MetadataQualityCard';
import RecordsPerFeedCard from './RecordsPerFeedCard';
import EnhancedDataGrid from './DataGridTable';
import { GridRowParams } from '@mui/x-data-grid';
import { IFeed } from '@/types';

// Define the Feed interface expected by dashboard components
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

// Utility function to convert IFeed[] to Feed[]
const convertToFeedFormat = (feeds: IFeed[]): Feed[] => {
  return feeds.map(feed => ({
    ...feed,
    timestamp: typeof feed.timestamp === 'string' ? feed.timestamp : feed.timestamp.toISOString()
  })) as Feed[];
};

interface SimpleDashboardWrapperProps {
  feeds: IFeed[];
  isLoading?: boolean;
}

export default function SimpleDashboardWrapper({ feeds, isLoading = false }: SimpleDashboardWrapperProps) {
  const [error] = useState<string | null>(null);
  
  // Convert IFeed[] to Feed[] format for compatibility with dashboard components
  const formattedFeeds = convertToFeedFormat(feeds);

  return (
    <div className="container mx-auto">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TotalCard 
          totalRecords={formattedFeeds.length}
          isFiltered={false}
        />
        
        <FeedGraphCard 
          feeds={formattedFeeds} 
          isLoading={isLoading} 
        />
      </div>
      
      {/* Analytics Cards - Row 1 */}
      {formattedFeeds.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <StatusDistributionCard feeds={formattedFeeds} />
          <ProgressMetricsCard feeds={formattedFeeds} />
        </div>
      )}
      
      {/* Analytics Cards - Row 2 */}
      {formattedFeeds.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ClientActivityCard feeds={formattedFeeds} />
          <MetadataQualityCard feeds={formattedFeeds} />
        </div>
      )}
      
      {/* Analytics Cards - Row 3 */}
      {formattedFeeds.length > 0 && (
        <div className="grid grid-cols-1 mb-6">
          <RecordsPerFeedCard feeds={formattedFeeds} />
        </div>
      )}
      
      {/* Feed Data Display */}
      <div className="bg-white rounded-lg shadow-sm">
        {error ? (
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Feed Data</h2>
            <div className="text-red-500 py-4">{error}</div>
          </div>
        ) : (
          <EnhancedDataGrid
            feeds={formattedFeeds}
            title="Feed Data"
            description={`Showing ${formattedFeeds.length} feed records`}
            loading={isLoading}
            enableFiltering={true}
            enableExport={true}
            onRowClick={(params: GridRowParams) => {
              // Handle row click if needed
              console.log('Row clicked:', params.row);
            }}
          />
        )}
      </div>
    </div>
  );
}
