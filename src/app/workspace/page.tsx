import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserWorkspaces } from '@/app/actions/workspace'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'

// ユーザーのワークスペース情報を取得
async function getWorkspaceData(userId: string) {
  try {
    const { workspaces, error } = await getUserWorkspaces(userId)

    if (error) {
      throw new Error(error)
    }

    return { workspaces }
  } catch (error) {
    console.error('ワークスペースデータ取得エラー:', error)
    return { workspaces: [] }
  }
}

export default async function WorkspacePage() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const { workspaces } = await getWorkspaceData(userId)

  // ワークスペースが存在しない場合はオンボーディングにリダイレクト
  if (!workspaces || workspaces.length === 0) {
    redirect('/onboarding')
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ワークスペースを選択</CardTitle>
          <CardDescription>左側のサイドバーからワークスペースを選択してください</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg">
            <div className="flex flex-col items-center text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground mb-4"
              >
                <rect width="7" height="7" x="3" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="14" rx="1" />
                <rect width="7" height="7" x="3" y="14" rx="1" />
              </svg>
              <p className="text-sm text-muted-foreground">
                サイドバーからワークスペースを選択すると、
                <br />
                タスク看板やプロジェクト情報が表示されます
              </p>
            </div>
          </div>

          {workspaces.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">最近のワークスペース:</p>
              {workspaces.slice(0, 3).map((workspace) => (
                <Button
                  key={workspace.id}
                  variant="outline"
                  className="w-full justify-between"
                  asChild
                >
                  <a href={`/workspace/${workspace.id}`}>
                    {workspace.name}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
