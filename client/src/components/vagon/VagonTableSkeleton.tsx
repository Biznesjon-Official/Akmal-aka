import { Skeleton } from '@/components/ui/Skeleton';

export default function VagonTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: 6 }).map((_, i) => (
              <th key={i} className="px-6 py-3">
                <Skeleton className="h-4 w-full" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              <td className="px-6 py-4">
                <Skeleton className="h-5 w-24" />
              </td>
              <td className="px-6 py-4">
                <Skeleton className="h-5 w-20" />
              </td>
              <td className="px-6 py-4">
                <Skeleton className="h-5 w-16" />
              </td>
              <td className="px-6 py-4">
                <Skeleton className="h-5 w-16" />
              </td>
              <td className="px-6 py-4">
                <Skeleton className="h-5 w-16" />
              </td>
              <td className="px-6 py-4">
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
