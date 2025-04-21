import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TaskDetailLoading({
  params
}: {
  params?: { id: string }
}) {
  // ワークスペースIDがない場合は空文字列を使用
  const workspaceId = params?.id || "";

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          asChild
        >
          <Link href={`/workspace/${workspaceId}/tasks`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            タスク一覧に戻る
          </Link>
        </Button>
      </div>
      
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-[900] tracking-tight">タスク詳細</h1>
        <p className="text-muted-foreground">
          デザイン依頼の詳細情報を確認できます。
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
            <CardTitle>
              <Skeleton className="h-8 w-3/4" />
            </CardTitle>
            <CardDescription>
              <Skeleton className="h-4 w-40" />
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">依頼内容</h3>
            <Skeleton className="h-32 w-full" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">基本情報</h3>
              <div className="space-y-2">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">ID</span>
                  <Skeleton className="h-5 w-12" />
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">カテゴリ</span>
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">ステータス</span>
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">緊急度</span>
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-muted-foreground">依頼日時</span>
                  <Skeleton className="h-5 w-32" />
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">成果物</h3>
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
