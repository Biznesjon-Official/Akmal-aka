import { Skeleton } from '@/components/ui/Skeleton';

export default function DeliveryTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {['Soni', 'Oy', 'Kodlar', 'Marshrut', 'Vazn', 'Tarif', 'To\'lov', 'Qarz', 'Status', 'Amallar'].map((header, i) => (
              <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              <td className="px-4 py-4 whitespace-nowrap">
                <Skeleton className="h-5 w-12" />
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <Skeleton className="h-5 w-20" />
              </td>
              <td className="px-4 py-4">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <Skeleton className="h-5 w-16" />
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <Skeleton className="h-5 w-24" />
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <Skeleton className="h-5 w-24" />
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <Skeleton className="h-5 w-24" />
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <Skeleton className="h-6 w-20 rounded-full" />
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="flex items-center justify-end gap-2">
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
