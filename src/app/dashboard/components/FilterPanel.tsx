"use client";

import { useState, useEffect } from 'react';

interface FilterPanelProps {
  onFilterChange: (filters: {
    countries: string[];
    clients: string[];
    page: number;
    pageSize: number;
    startDate: string | null;
    endDate: string | null;
  }) => void;
}

interface CountryData {
  countries: string[];
  count: number;
}

interface ClientData {
  clients: string[];
  count: number;
}

export default function FilterPanel({ onFilterChange }: FilterPanelProps) {
  const [countries, setCountries] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(-1); // -1 represents 'All'
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch countries and clients on component mount
  useEffect(() => {
    const fetchFilters = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch initial data from GetFeeds to get everything at once
        const feedsResponse = await fetch('/api/GetFeeds?page=1&pageSize=1');
        if (!feedsResponse.ok) {
          throw new Error('Failed to fetch data');
        }
        const feedsData = await feedsResponse.json();
        
        // Update state with fetched data
        setCountries(feedsData.filterOptions.countries || []);
        setClients(feedsData.filterOptions.clients || []);
        setTotalPages(feedsData.pagination.totalPages || 1);
        
        // If we couldn't get data from GetFeeds, fall back to individual endpoints
        if (!feedsData.filterOptions.countries || !feedsData.filterOptions.clients) {
          // Fetch countries
          const countriesResponse = await fetch('/api/GetCountry');
          if (!countriesResponse.ok) {
            throw new Error('Failed to fetch countries');
          }
          const countriesData: CountryData = await countriesResponse.json();
          
          // Fetch clients
          const clientsResponse = await fetch('/api/GetClients');
          if (!clientsResponse.ok) {
            throw new Error('Failed to fetch clients');
          }
          const clientsData: ClientData = await clientsResponse.json();
          
          // Update state with fetched data
          setCountries(countriesData.countries);
          setClients(clientsData.clients);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error fetching filter data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchFilters();
  }, []);
  
  // Effect to update parent component with initial filter values
  useEffect(() => {
    // Initial notification to parent with default values
    onFilterChange({
      countries: selectedCountries,
      clients: selectedClients,
      page: currentPage,
      pageSize,
      startDate: startDate || null,
      endDate: endDate || null
    });
    // We only want this to run once on mount, so we disable the exhaustive-deps rule
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Handle country selection change
  const handleCountryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(
      event.target.selectedOptions,
      option => option.value
    );
    setSelectedCountries(selectedOptions);
    
    // Reset to first page when filters change
    setCurrentPage(1);
    
    // Notify parent component about filter changes
    onFilterChange({
      countries: selectedOptions,
      clients: selectedClients,
      page: 1, // Reset to first page when filters change
      pageSize,
      startDate: startDate || null,
      endDate: endDate || null
    });
  };
  
  // Handle client selection change
  const handleClientChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(
      event.target.selectedOptions,
      option => option.value
    );
    setSelectedClients(selectedOptions);
    
    // Reset to first page when filters change
    setCurrentPage(1);
    
    // Notify parent component about filter changes
    onFilterChange({
      countries: selectedCountries,
      clients: selectedOptions,
      page: 1, // Reset to first page when filters change
      pageSize,
      startDate: startDate || null,
      endDate: endDate || null
    });
  };
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    
    onFilterChange({
      countries: selectedCountries,
      clients: selectedClients,
      page: newPage,
      pageSize,
      startDate: startDate || null,
      endDate: endDate || null
    });
  };
  
  // Handle page size change
  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = parseInt(event.target.value, 10);
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
    
    onFilterChange({
      countries: selectedCountries,
      clients: selectedClients,
      page: 1,
      pageSize: newPageSize,
      startDate: startDate || null,
      endDate: endDate || null
    });
  };
  
  // Handle start date change
  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(event.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
    
    onFilterChange({
      countries: selectedCountries,
      clients: selectedClients,
      page: 1,
      pageSize,
      startDate: event.target.value || null,
      endDate: endDate || null
    });
  };

  // Handle end date change
  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(event.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
    
    onFilterChange({
      countries: selectedCountries,
      clients: selectedClients,
      page: 1,
      pageSize,
      startDate: startDate || null,
      endDate: event.target.value || null
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
      <h2 className="text-lg font-medium mb-4">Filters</h2>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-4">
          <div className="animate-pulse text-gray-500">Loading filters...</div>
        </div>
      ) : error ? (
        <div className="text-red-500 py-2">{error}</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="countries" className="block text-sm font-medium text-gray-700 mb-1">
                Countries
              </label>
              <select
                id="countries"
                multiple
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={selectedCountries}
                onChange={handleCountryChange}
                size={4}
              >
                {countries.map(country => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple</p>
            </div>
            
            <div>
              <label htmlFor="clients" className="block text-sm font-medium text-gray-700 mb-1">
                Clients
              </label>
              <select
                id="clients"
                multiple
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={selectedClients}
                onChange={handleClientChange}
                size={4}
              >
                {clients.map(client => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple</p>
            </div>
            
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                id="startDate"
                type="date"
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={startDate}
                onChange={handleStartDateChange}
              />
            </div>
            
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                id="endDate"
                type="date"
                className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={endDate}
                onChange={handleEndDateChange}
              />
            </div>
          </div>
          
          {/* Pagination Controls */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center space-x-2">
                <label htmlFor="pageSize" className="text-sm font-medium text-gray-700">
                  Items per page:
                </label>
                <select
                  id="pageSize"
                  className="border border-gray-300 rounded-md shadow-sm py-1 px-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  value={pageSize}
                  onChange={handlePageSizeChange}
                >
                  <option value="-1">All</option>
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className={`px-2 py-1 border border-gray-300 rounded-md text-sm ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                  aria-label="First page"
                >
                  &laquo;
                </button>
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`px-2 py-1 border border-gray-300 rounded-md text-sm ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                  aria-label="Previous page"
                >
                  &lsaquo;
                </button>
                
                <span className="px-3 py-1 text-sm">
                  Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages || 1}</span>
                </span>
                
                <button
                  onClick={() => handlePageChange(Math.min(totalPages || 1, currentPage + 1))}
                  disabled={currentPage >= (totalPages || 1)}
                  className={`px-2 py-1 border border-gray-300 rounded-md text-sm ${currentPage >= (totalPages || 1) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                  aria-label="Next page"
                >
                  &rsaquo;
                </button>
                <button
                  onClick={() => handlePageChange(totalPages || 1)}
                  disabled={currentPage >= (totalPages || 1)}
                  className={`px-2 py-1 border border-gray-300 rounded-md text-sm ${currentPage >= (totalPages || 1) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                  aria-label="Last page"
                >
                  &raquo;
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
