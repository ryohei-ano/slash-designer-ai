import { Skeleton } from "@/components/ui/skeleton";

export default function SelectWorkspaceLoading() {
  return (
    <div className="container max-w-4xl mx-auto py-16 px-4">
      <Skeleton className="h-10 w-64 mx-auto mb-8" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="border rounded-lg p-6 space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-4 w-full" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-3 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-56" />
      </div>
    </div>
  );
}
