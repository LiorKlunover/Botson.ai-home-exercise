"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChartIcon } from "lucide-react";

interface TotalCardProps {
  totalRecords: number;
  filteredRecords?: number;
  isFiltered: boolean;
}

export default function TotalCard({ totalRecords, filteredRecords, isFiltered }: TotalCardProps) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium">Total Records</CardTitle>
        <CardDescription>
          {isFiltered ? "Filtered from total dataset" : "All records in the database"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <BarChartIcon className="h-4 w-4 text-green-500" />
          <div className="text-2xl font-bold">
            {isFiltered ? (
              <>
                {filteredRecords?.toLocaleString() || 0}
                <span className="text-sm font-normal text-gray-500 ml-2">
                  of {totalRecords.toLocaleString()}
                </span>
              </>
            ) : (
              totalRecords.toLocaleString()
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
