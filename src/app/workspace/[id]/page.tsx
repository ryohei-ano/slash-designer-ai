import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserWorkspaces } from '@/app/actions/workspace'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Settings, Users } from 'lucide-react'
import { TaskBoard } from '@/components/ui/task-board'

// ワークスペース情報を取得
async function getWorkspaceData(userId: string, workspaceId: string) {
  try {
    const { workspaces, error } = await getUserWorkspaces(userId)

    if (error) {
      throw new Error(error)
    }

    const currentWorkspace = workspaces.find((w) => w.id === workspaceId)

    if (!currentWorkspace) {
      return null
    }

    return currentWorkspace
  } catch (error) {
    console.error('ワークスペースデータ取得エラー:', error)
    return null
  }
}

// ワークスペースヘッダーコンポーネント
function WorkspaceHeader({ name, memberCount = 1 }: { name: string; memberCount?: number }) {
  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-2xl font-bold">{name}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{memberCount}人</span>
        </div>
        <Button variant="outline" size="sm" className="gap-1">
          <Users className="h-4 w-4" />
          メンバーを招待
        </Button>
        <Button variant="outline" size="sm" className="gap-1">
          <Settings className="h-4 w-4" />
          設定
        </Button>
      </div>
    </div>
  )
}

// ローディングコンポーネント
function WorkspaceLoading() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-3">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <Card key={i} className="h-[calc(100vh-16rem)]">
              <CardContent className="p-4">
                <Skeleton className="h-6 w-24 mb-4" />
                <div className="space-y-3">
                  {Array(5)
                    .fill(0)
                    .map((_, j) => (
                      <Skeleton key={j} className="h-24 w-full" />
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  )
}

export default async function WorkspacePage({ params }: { params: { id: string } }) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const workspaceId = params.id
  const workspace = await getWorkspaceData(userId, workspaceId)

  if (!workspace) {
    redirect('/workspace/select')
  }

  return (
    <div className="space-y-6">
      <WorkspaceHeader name={workspace.name} />

      <Suspense fallback={<WorkspaceLoading />}>
        <TaskBoard workspaceId={workspaceId} />
      </Suspense>
    </div>
  )
}
