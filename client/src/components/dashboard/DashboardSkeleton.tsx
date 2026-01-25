import { Skeleton, StatCardSkeleton } from '@/components/ui/Skeleton';
import { memo } from 'react';

// Memoized skeleton components
const MemoizedStatCardSkeleton = memo(StatCardSkeleton);
const MemoizedSkeleton = memo(Skeleton);

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <MemoizedSkeleton className="h-8 w-64" />
        <MemoizedSkeleton className="h-4 w-96" />
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-2">
        <MemoizedSkeleton className="h-10 w-32 rounded-lg" />
        <MemoizedSkeleton className="h-10 w-32 rounded-lg" />
        <MemoizedSkeleton className="h-10 w-32 rounded-lg" />
      </div>

      {/* Stats Cards - Reduced to 3 for faster loading */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MemoizedStatCardSkeleton />
        <MemoizedStatCardSkeleton />
        <MemoizedStatCardSkeleton />
      </div>

      {/* Main Chart - Single chart for faster loading */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <MemoizedSkeleton className="h-6 w-48" />
        <MemoizedSkeleton className="h-64 w-full" />
      </div>

      {/* Quick Stats - Reduced items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <MemoizedSkeleton className="h-6 w-32" />
          <div className="space-y-2">
            <MemoizedSkeleton className="h-4 w-full" />
            <MemoizedSkeleton className="h-4 w-3/4" />
            <MemoizedSkeleton className="h-4 w-1/2" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <MemoizedSkeleton className="h-6 w-32" />
          <div className="space-y-2">
            <MemoizedSkeleton className="h-4 w-full" />
            <MemoizedSkeleton className="h-4 w-3/4" />
            <MemoizedSkeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(DashboardSkeleton);
