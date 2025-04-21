import { Skeleton } from '@/components/ui/skeleton'

export default function DesignerLoading() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      <div className="border rounded-lg p-6 h-[600px] flex flex-col">
        <div className="flex-1 overflow-auto">
          <div className="space-y-4">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
