import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const ProgramSkeleton: React.FC = () => {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Program name skeleton */}
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
            {/* Program ID skeleton */}
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          {/* Status badge skeleton */}
          <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Business name skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
        
        {/* Dates skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        
        {/* Metrics skeleton */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        
        {/* Actions skeleton */}
        <div className="flex gap-2 pt-2">
          <div className="h-9 bg-gray-200 rounded flex-1"></div>
          <div className="h-9 w-9 bg-gray-200 rounded"></div>
          <div className="h-9 w-9 bg-gray-200 rounded"></div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgramSkeleton;

