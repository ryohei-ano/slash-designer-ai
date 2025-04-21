import { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Toaster } from '@/components/ui/toaster'
import WorkspaceChat from '@/components/ui/workspace-chat'
import { getUserWorkspaces } from '@/app/actions/workspace'

export const metadata: Metadata = {
  title: 'チャット | ワークスペース',
  description: 'ワークスペースに関する質問ができます。',
}

export default async function ChatPage({ params }: { params: { id: string } }) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const workspaceId = params.id

  // ユーザーのワークスペース情報を取得
  const { workspaces, error } = await getUserWorkspaces(userId)

  if (error || workspaces.length === 0) {
    redirect('/onboarding')
  }

  // 指定されたIDのワークスペースを検索
  const currentWorkspace = workspaces.find((w) => w.id === workspaceId)

  // 指定されたワークスペースが見つからない場合
  if (!currentWorkspace) {
    // 複数のワークスペースがある場合は選択画面にリダイレクト
    if (workspaces.length > 1) {
      redirect('/workspace/select')
    }
    // 1つだけの場合はそのワークスペースのページにリダイレクト
    else {
      redirect(`/workspace/${workspaces[0].id}/chat`)
    }
  }

  return (
    <div className="h-full">
      <WorkspaceChat workspaceId={currentWorkspace.id} workspaceName={currentWorkspace.name} />
      <Toaster />
    </div>
  )
}
