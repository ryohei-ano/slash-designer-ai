import { ReactNode } from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  try {
    // ユーザーがオンボーディングを完了しているか確認
    const { data: userWorkspaces, error } = await supabaseAdmin
      .from('user_workspaces')
      .select('workspace_id')
      .eq('user_id', userId)

    if (error) {
      console.error('ワークスペース取得エラー:', error)
    }

    // ワークスペースが存在しない場合はオンボーディングにリダイレクト
    if (!userWorkspaces || userWorkspaces.length === 0) {
      redirect('/onboarding')
    }

    // 注: ルートページ（/workspace）へのリダイレクトは
    // src/app/workspace/page.tsxで処理されるため、
    // このレイアウトコンポーネントでは処理しない

    // サブスクリプションチェック - このコメントを外すと実際に確認します
    // const { isActive } = await getUserSubscription(userId);

    // サブスクリプションがない場合、プランページにリダイレクト
    // if (!isActive) {
    //   redirect("/plan");
    // }
  } catch (error) {
    console.error('ワークスペース初期化中にエラーが発生しました:', error)
    // エラーが発生した場合でも、ワークスペースを表示
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden pt-16">
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <main className="flex-1 h-full">{children}</main>
      </div>
    </div>
  )
}
