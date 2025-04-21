import { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TasksTable } from "@/components/ui/tasks-table";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "タスク | ワークスペース",
  description: "デザイン依頼のタスク一覧を確認できます。",  
};

export default async function TasksPage({
  params
}: {
  params: { id: string }
}) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  const workspaceId = params.id;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-[900] tracking-tight">タスク一覧</h1>
        <p className="text-muted-foreground">
          デザイン依頼の進捗状況を確認できます。
        </p>
      </div>
      
      <TasksTable workspaceId={workspaceId} />
      <Toaster />
    </div>
  );
}
