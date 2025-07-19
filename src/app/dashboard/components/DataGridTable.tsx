"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import {
  DataGrid,
  GridColDef,
  GridToolbarContainer,
  GridToolbarFilterButton,
  GridToolbarExport,
  GridToolbarColumnsButton,
  GridRowParams,
  GridPaginationModel,
  GridSortModel,
  GridFilterModel
} from "@mui/x-data-grid";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { Button, TextField, Card, CardContent, CardHeader, Typography } from "@mui/material";
import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import FilterPanel from "./FilterPanel";

// Define the Feed schema using Zod for validation
const FeedSchema = z.object({
  _id: z.string().optional(),
  transactionSourceName: z.string().optional(),
  country_code: z.string().optional(),
  currency_code: z.string().optional(),
  status: z.string().optional(),
  timestamp: z.string().optional(),
  recordCount: z.number().optional(),
  progress: z.object({
    SWITCH_INDEX: z.boolean().optional(),
    TOTAL_RECORDS_IN_FEED: z.number().optional(),
    TOTAL_JOBS_FAIL_INDEXED: z.number().optional(),
    TOTAL_JOBS_IN_FEED: z.number().optional(),
    TOTAL_JOBS_SENT_TO_ENRICH: z.number().optional(),
    TOTAL_JOBS_DONT_HAVE_METADATA: z.number().optional(),
    TOTAL_JOBS_DONT_HAVE_METADATA_V2: z.number().optional(),
    TOTAL_JOBS_SENT_TO_INDEX: z.number().optional(),
  }).optional(),
  noCoordinatesCount: z.number().optional(),
  uniqueRefNumberCount: z.number().optional(),
});

// TypeScript type derived from the Zod schema
type Feed = z.infer<typeof FeedSchema> & { id: string };

interface EnhancedDataGridProps {
  feeds: unknown[]; // Using unknown here as input, we'll validate with Zod
  title?: string;
  description?: string;
  onRowClick?: (params: GridRowParams) => void;
  loading?: boolean;
  enableFiltering?: boolean;
  enableExport?: boolean;
}

// Custom toolbar component with simplified props
interface CustomToolbarProps {
  onFilterClick?: () => void;
  enableFiltering?: boolean;
  enableExport?: boolean;
}

function CustomToolbar({ onFilterClick, enableFiltering = true, enableExport = true }: CustomToolbarProps): React.ReactElement {
  return (
    <GridToolbarContainer className="flex justify-between p-2">
      <div className="flex gap-2">
        <GridToolbarColumnsButton />
        {enableFiltering && <GridToolbarFilterButton />}
        {enableExport && <GridToolbarExport />}
      </div>
      {enableFiltering && onFilterClick && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<FilterListIcon />}
          onClick={onFilterClick}
        >
          Advanced Filters
        </Button>
      )}
    </GridToolbarContainer>
  );
}

// Create a simple theme for the DataGrid with proper typing
import type {} from '@mui/x-data-grid/themeAugmentation';

const dataGridTheme = createTheme({
  components: {
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          '& .MuiDataGrid-cell:focus': {
            outline: 'none',
          },
        },
        columnHeaders: {
          backgroundColor: '#f9fafb',
        },
      },
    },
  },
});

export default function EnhancedDataGrid({ 
  feeds, 
  title = "Feed Data",
  description, 
  onRowClick,
  loading: externalLoading,
  enableFiltering = true,
  enableExport = true
}: EnhancedDataGridProps) {
  // State management
  const [rows, setRows] = useState<Feed[]>([]);
  const [searchText, setSearchText] = useState("");
  const [filteredRows, setFilteredRows] = useState<Feed[]>([]);
  const [loading, setLoading] = useState(externalLoading ?? true);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  
  // Using the MUI GridFilterModel type for client-side filtering
  const [filterModel, setFilterModel] = useState<GridFilterModel>({
    items: [],
    quickFilterValues: [],
  });
  
  // Apply filter model changes to filtered rows
  useEffect(() => {
    if (filterModel.quickFilterValues && filterModel.quickFilterValues.length > 0) {
      const filtered = rows.filter(row => {
        const searchTerms = filterModel.quickFilterValues || [];
        return searchTerms.every(term => {
          if (typeof term !== 'string') return false;
          const searchTerm = term.toLowerCase();
          return (
            (row.transactionSourceName?.toLowerCase().includes(searchTerm)) ||
            (row.country_code?.toLowerCase().includes(searchTerm)) ||
            (row.status?.toLowerCase().includes(searchTerm))
          );
        });
      });
      setFilteredRows(filtered);
    } else {
      // Reset to all rows when no filters are applied
      setFilteredRows(rows);
    }
  }, [filterModel, rows]);
  
  // Filter panel state
  const [currentFilters, setCurrentFilters] = useState({
    countries: [] as string[],
    clients: [] as string[],
    page: 1,
    pageSize: 10,
    startDate: null as string | null,
    endDate: null as string | null,
  });

  // Define columns for the DataGrid with proper types
  const columns: GridColDef[] = [
    { 
      field: "transactionSourceName", 
      headerName: "Client", 
      flex: 1,
      minWidth: 150,
      filterable: true,
    },
    { 
      field: "country_code", 
      headerName: "Country", 
      width: 120,
      filterable: true,
    },
    { 
      field: "status", 
      headerName: "Status", 
      width: 150,
      filterable: true,
    },
    { 
      field: "timestamp", 
      headerName: "Date", 
      width: 180,
      filterable: true,
    },
    { 
      field: "recordCount", 
      headerName: "Records", 
      type: "number",
      width: 120,
      filterable: true,
    },
  ];

  // Toggle filter panel visibility
  const toggleFilterPanel = useCallback(() => {
    setShowFilterPanel(prev => !prev);
  }, []);

  // Handle filter changes from FilterPanel
  const handleFilterChange = useCallback((filters: {
    countries: string[];
    clients: string[];
    page: number;
    pageSize: number;
    startDate: string | null;
    endDate: string | null;
  }) => {
    setCurrentFilters(filters);
    
    // Apply filters to the data
    let filtered = [...rows];
    
    // Apply country filter
    if (filters.countries.length > 0) {
      filtered = filtered.filter(row => 
        row.country_code && filters.countries.includes(row.country_code)
      );
    }
    
    // Apply client filter
    if (filters.clients.length > 0) {
      filtered = filtered.filter(row => 
        row.transactionSourceName && filters.clients.includes(row.transactionSourceName)
      );
    }
    
    // Apply date range filter
    if (filters.startDate || filters.endDate) {
      filtered = filtered.filter(row => {
        if (!row.timestamp) return false;
        
        const rowDate = new Date(row.timestamp);
        if (filters.startDate && new Date(filters.startDate) > rowDate) return false;
        if (filters.endDate && new Date(filters.endDate) < rowDate) return false;
        
        return true;
      });
    }
    
    setFilteredRows(filtered);
    
    // Update pagination
    setPaginationModel({
      page: filters.page - 1, // Convert from 1-indexed to 0-indexed
      pageSize: filters.pageSize,
    });
  }, [rows]);

  // Process feeds data when it changes
  useEffect(() => {
    if (feeds && feeds.length > 0) {
      try {
        // Validate and transform feeds with Zod schema
        const processedRows = feeds.map((feed, index) => {
          // Parse with Zod schema to validate
          const validatedFeed = FeedSchema.parse(feed);
          return {
            ...validatedFeed,
            id: validatedFeed._id || `feed-${index}`
          } as Feed;
        });
        
        setRows(processedRows);
        setFilteredRows(processedRows);
      } catch (error) {
        console.error("Feed validation error:", error);
        setRows([]);
        setFilteredRows([]);
      }
    } else {
      setRows([]);
      setFilteredRows([]);
    }
    
    if (externalLoading === undefined) {
      setLoading(false);
    }
  }, [feeds, externalLoading]);

  // Basic search handler with debounce
  const handleSearch = useCallback((searchValue: string) => {
    setSearchText(searchValue);
    
    if (!searchValue.trim()) {
      setFilteredRows(rows);
      return;
    }
    
    const lowerSearch = searchValue.toLowerCase();
    const filtered = rows.filter(row => {
      return (
        (row.transactionSourceName?.toLowerCase().includes(lowerSearch)) ||
        (row.country_code?.toLowerCase().includes(lowerSearch)) ||
        (row.status?.toLowerCase().includes(lowerSearch))
      );
    });
    
    setFilteredRows(filtered);
    
    // Update filter model to keep UI state consistent
    setFilterModel(prev => ({
      ...prev,
      quickFilterValues: searchValue ? [searchValue] : []
    }));
  }, [rows]);
  
  // Simple sort handler
  const handleSortModelChange = useCallback((sortModel: GridSortModel) => {
    if (sortModel.length === 0) return;
    
    const { field, sort } = sortModel[0];
    const sorted = [...filteredRows].sort((a, b) => {
      const aValue = a[field as keyof Feed];
      const bValue = b[field as keyof Feed];
      
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return sort === 'asc' ? -1 : 1;
      if (bValue === undefined) return sort === 'asc' ? 1 : -1;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sort === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      
      return sort === 'asc' 
        ? Number(aValue) - Number(bValue)
        : Number(bValue) - Number(aValue);
    });
    
    setFilteredRows(sorted);
  }, [filteredRows]);

  return (
    <Card>
      <CardHeader 
        title={<Typography variant="h6">{title}</Typography>}
        subheader={description}
      />
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Search input */}
          <div className="flex items-center gap-2 max-w-md">
            <TextField
              variant="outlined"
              size="small"
              placeholder="Search..."
              fullWidth
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1 }} />
              }}
            />
          </div>
          
          {/* Filter panel */}
          {showFilterPanel && (
            <div className="p-4 border rounded">
              <FilterPanel
                onFilterChange={handleFilterChange}
              />
            </div>
          )}
          
          {/* DataGrid */}
          <div style={{ height: 500, width: '100%' }}>
            <ThemeProvider theme={dataGridTheme}>
              <DataGrid
                rows={filteredRows}
                columns={columns}
                loading={loading}
                disableColumnMenu
                disableRowSelectionOnClick
                onRowClick={onRowClick}
                sortingMode="client"
                filterMode="client"
                onSortModelChange={handleSortModelChange}
                onFilterModelChange={(newModel: GridFilterModel) => {
                  // Safely update filter model
                  setFilterModel(newModel);
                  // Filtering is handled by the useEffect that watches filterModel
                }}
                onPaginationModelChange={(model) => {
                  setPaginationModel(model);
                  if (showFilterPanel && handleFilterChange) {
                    handleFilterChange({
                      ...currentFilters,
                      page: model.page + 1,
                      pageSize: model.pageSize
                    });
                  }
                }}
                initialState={{
                  pagination: {
                    paginationModel
                  }
                }}
                slots={{
                  toolbar: () => (
                    <CustomToolbar 
                      enableFiltering={enableFiltering}
                      enableExport={enableExport}
                      onFilterClick={toggleFilterPanel}
                    />
                  )
                }}
                pageSizeOptions={[5, 10, 25, 50]}
                density="standard"
                sx={{
                  '& .MuiDataGrid-cell:hover': {
                    cursor: onRowClick ? 'pointer' : 'default',
                  }
                }}
              />
            </ThemeProvider>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
