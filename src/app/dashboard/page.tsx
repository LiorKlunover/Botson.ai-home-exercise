"use client";

import { useState, useEffect } from 'react';
import FilterPanel from './components/FilterPanel';
import TotalCard from './components/TotalCard';
import FeedGraphCard from './components/FeedGraphCard';

interface Filters {
  countries: string[];
  clients: string[];
  page: number;
  pageSize: number;
  startDate: string | null;
  endDate: string | null;
}

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

interface FeedData {
  feeds: Feed[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
  };
  filterOptions: {
    countries: string[];
    clients: string[];
  };
}

export default function Dashboard() {
  const [filters, setFilters] = useState<Filters>({
    countries: [],
    clients: [],
    page: 1,
    pageSize: 10,
    startDate: null,
    endDate: null
  });
  const [feedData, setFeedData] = useState<FeedData | null>(null);
  const [originalTotalCount, setOriginalTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch feed data when filters change
  useEffect(() => {
    const fetchFeeds = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Build query parameters
        const params = new URLSearchParams();
        
        // Add countries to query params
        filters.countries.forEach(country => {
          params.append('countries', country);
        });
        
        // Add clients to query params
        filters.clients.forEach(client => {
          params.append('clients', client);
        });
        
        // Add pagination params
        params.append('page', filters.page.toString());
        params.append('pageSize', filters.pageSize.toString());
        
        // Fetch data from API
        const response = await fetch(`/api/GetFeeds?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch feeds');
        }
        
        const data: FeedData = await response.json();
        
        // Store the original total count from the API
        setOriginalTotalCount(data.pagination.totalCount);
        
        // Apply date filtering on the client side
        if (filters.startDate || filters.endDate) {
          console.log("Data feeds before filter:", data.feeds.length);

          const filteredFeeds = filterFeedsByDate(data.feeds, filters.startDate, filters.endDate);
          console.log("Data feeds after filter:", filteredFeeds.length);
          // Update pagination info for filtered data
          const totalFilteredCount = filteredFeeds.length;
          const startIndex = (filters.page - 1) * filters.pageSize;
          const endIndex = Math.min(startIndex + filters.pageSize, totalFilteredCount);
          
          // Create a new FeedData object with the filtered feeds
          const filteredData: FeedData = {
            feeds: filteredFeeds.slice(startIndex, endIndex),
            pagination: {
              page: filters.page,
              pageSize: filters.pageSize,
              totalCount: totalFilteredCount,
              totalPages: Math.ceil(totalFilteredCount / filters.pageSize)
            },
            filterOptions: data.filterOptions
          };
          
          setFeedData(filteredData);
        } else {
          setFeedData(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error fetching feeds:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFeeds();
  }, [filters]);
  
  // Filter feeds by date
  const filterFeedsByDate = (feeds: Feed[], startDate: string | null, endDate: string | null) => {
    if (!startDate && !endDate) return feeds;
    
    console.log("Start date:", startDate);
    console.log("End date:", endDate);
    
    return feeds.filter(feed => {
      if (!feed.timestamp) {
        console.log("Feed missing timestamp:", feed);
        return false;
      }
      
      // Parse the feed timestamp - ensure it's a valid date
      let feedDate: Date;
      try {
        feedDate = new Date(feed.timestamp);
        if (isNaN(feedDate.getTime())) {
          console.log("Invalid feed date:", feed.timestamp);
          return false;
        }
      } catch (err) {
        console.log("Error parsing feed date:", feed.timestamp, err);
        return false;
      }
      
      // Format date as YYYY-MM-DD for comparison
      const feedDateStr = feedDate.toISOString().split('T')[0];
      console.log("Feed date string:", feedDateStr, "from", feed.timestamp);
      
      if (startDate && endDate) {
        // Simple string comparison works for YYYY-MM-DD format
        const result = feedDateStr >= startDate && feedDateStr <= endDate;
        console.log(`Comparing ${feedDateStr} with range ${startDate} to ${endDate}: ${result}`);
        return result;
      } else if (startDate) {
        const result = feedDateStr >= startDate;
        console.log(`Comparing ${feedDateStr} with start date ${startDate}: ${result}`);
        return result;
      } else if (endDate) {
        const result = feedDateStr <= endDate;
        console.log(`Comparing ${feedDateStr} with end date ${endDate}: ${result}`);
        return result;
      }
      
      return true;
    });
  };
  
  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
    console.log("Filter change:", newFilters);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <FilterPanel onFilterChange={handleFilterChange} />
      
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TotalCard 
          totalRecords={originalTotalCount}
          filteredRecords={feedData?.pagination.totalCount}
          isFiltered={!!(filters.startDate || filters.endDate || filters.countries.length > 0 || filters.clients.length > 0)}
        />
        
        {feedData && (
          <FeedGraphCard feeds={feedData.feeds} />
        )}
      </div>
      
      {/* Selected Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-xl font-semibold mb-4">Selected Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-md font-medium mb-2">Countries</h3>
            {filters.countries.length > 0 ? (
              <ul className="list-disc list-inside">
                {filters.countries.map(country => (
                  <li key={country} className="text-gray-700">{country}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No countries selected</p>
            )}
          </div>
          
          <div>
            <h3 className="text-md font-medium mb-2">Clients</h3>
            {filters.clients.length > 0 ? (
              <ul className="list-disc list-inside">
                {filters.clients.map(client => (
                  <li key={client} className="text-gray-700">{client}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 italic">No clients selected</p>
            )}
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p>Page: {filters.page} | Items per page: {filters.pageSize}</p>
          {(filters.startDate || filters.endDate) && (
            <p className="mt-1">
              Date Range: {filters.startDate ? new Date(filters.startDate).toLocaleDateString() : 'Any'} - {filters.endDate ? new Date(filters.endDate).toLocaleDateString() : 'Any'}
            </p>
          )}
        </div>
      </div>
      
      {/* Feed Data Display */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Feed Data</h2>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-pulse text-gray-500">Loading feed data...</div>
          </div>
        ) : error ? (
          <div className="text-red-500 py-4">{error}</div>
        ) : !feedData || feedData.feeds.length === 0 ? (
          <div className="py-4 text-gray-500">
            <p>No feed data available for the selected filters.</p>
            <p className="mt-2 text-sm">Try adjusting your filter criteria or page settings.</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {feedData.feeds.map((feed, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feed.transactionSourceName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feed.country_code}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          feed.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          feed.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {feed.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{feed.recordCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(feed.timestamp).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              <p>Showing {feedData.feeds.length} of {feedData.pagination.totalCount} total feeds</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
