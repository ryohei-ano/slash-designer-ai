import { ReactNode } from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { cache } from 'react'
import { WorkspaceSidebar } from '@/components/ui/workspace-sidebar'
import { Toaster } from '@/components/ui/toaster'

// ユーザーのワークスペース存在確認をキャッシュ
const checkUserWorkspaces = cache(async (userId: string) => {
  try {
    // ユーザーがオンボーディングを完了しているか確認
    const { data: userWorkspaces, error } = await supabaseAdmin
      .from('user_workspaces')
      .select('workspace_id')
      .eq('user_id', userId)

    if (error) {
      console.error('ワークスペース取得エラー:', error)
      return { error }
    }

    // ワークスペースが存在しない場合はオンボーディングにリダイレクト
    if (!userWorkspaces || userWorkspaces.length === 0) {
      return { redirect: '/onboarding' }
    }

    return { hasWorkspaces: true }
  } catch (error) {
    console.error('ワークスペース初期化中にエラーが発生しました:', error)
    return { error }
  }
})

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // キャッシュされた関数を使用してワークスペースの存在を確認
  const result = await checkUserWorkspaces(userId)

  // リダイレクトが必要な場合
  if (result.redirect) {
    redirect(result.redirect)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* サイドバー */}
      <WorkspaceSidebar />

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-auto">
        <main className="h-full">{children}</main>
      </div>

      <Toaster />
    </div>
  )
}
