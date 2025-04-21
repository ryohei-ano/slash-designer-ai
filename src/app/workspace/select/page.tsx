import { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getUserWorkspaces } from '@/app/actions/workspace'
import WorkspaceSelectionPage from '@/components/ui/workspace-selection-page'

export const metadata: Metadata = {
  title: 'ワークスペース選択',
  description: '利用するワークスペースを選択してください。',
}

export default async function SelectWorkspacePage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // 新規作成モードかどうか
  const isCreateMode = searchParams?.create === 'true'

  // ユーザーのワークスペース情報を取得
  const { workspaces, error } = await getUserWorkspaces(userId)

  // エラーがある場合やワークスペースがない場合はオンボーディングにリダイレクト
  if (error || (!isCreateMode && (!workspaces || workspaces.length === 0))) {
    redirect('/onboarding')
  }

  return (
    <div className="container mx-auto py-6">
      <WorkspaceSelectionPage workspaces={workspaces || []} isCreateMode={isCreateMode} />
    </div>
  )
}
