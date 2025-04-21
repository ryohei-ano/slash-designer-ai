import { Skeleton } from '@/components/ui/skeleton'

export default function ChatLoading() {
  return (
    <div className="h-full">
      <div className="absolute inset-0 overflow-auto scrollbar-hide">
        <div className="flex flex-col items-center">
          <div className="w-full max-w-2xl space-y-10 pb-32 pt-12 px-4">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <div
                  key={i}
                  className={`flex w-full ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}
                >
                  {i % 2 === 0 ? (
                    <div className="flex flex-col items-start">
                      <Skeleton className="h-8 w-8 rounded-full mb-2" />
                      <div className="rounded-lg py-3">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-64" />
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-4 w-56" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-row-reverse gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="rounded-lg p-4 bg-secondary text-black px-4">
                        <Skeleton className="h-4 w-40" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 z-20">
        <div className="bg-background border rounded-xl shadow-lg p-2 flex-col gap-2">
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
