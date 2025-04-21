import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { SubscribeButton } from "@/components/ui/SubscribeButton"
import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { supabase, supabaseAdmin } from "@/lib/supabase"

export default async function PlanPage() {
  const { userId } = await auth()
  const user = await currentUser()
  
  // 未ログインならサインインへ
  if (!userId) {
    redirect("/sign-in")
  }
  
  // ユーザーがオンボーディングを完了しているか確認
  const { data: userWorkspaces } = await supabaseAdmin
    .from("user_workspaces")
    .select("workspace_id")
    .eq("user_id", userId);

  // ワークスペースが存在しない場合はオンボーディングにリダイレクト
  if (!userWorkspaces || userWorkspaces.length === 0) {
    redirect("/onboarding");
  }
  
  // デバッグ情報をログに出力
  console.log("User verification status:", {
    userId,
    primaryEmailId: user?.primaryEmailAddressId,
    hasEmail: !!user?.emailAddresses?.length,
    provider: user?.externalAccounts?.[0]?.provider,
  })
  
  // アクティブな契約があるかチェック
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("clerk_user_id", userId);
  
  console.log("[PlanPage] Subscriptions:", subscriptions);
  
  // アクティブな契約があればワークスペース選択画面にリダイレクト
  if (subscriptions && subscriptions.length > 0) {
    const activeSubscription = subscriptions.find(sub => sub.is_active === true);
    if (activeSubscription) {
      console.log("[PlanPage] Active subscription found, redirecting to workspace selection");
      redirect("/workspace/select");
    }
  }
  
  // メール認証が未完了の場合、提案メッセージを表示
  if (user?.emailAddresses?.length && !user?.emailAddresses[0]?.verification?.status) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <h1 className="text-3xl font-bold text-center">メール認証が必要です</h1>
        <p className="text-center mb-6">
          お送りしたメールから認証を完了してください。認証後、このページをリロードすると
          プラン選択が可能になります。
        </p>
        <div className="flex justify-center">
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 cursor-pointer"
          >
            ページを再読み込み
          </button>
        </div>
      </main>
    )
  }
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <h1 className="text-3xl font-bold text-center">プランを選択してください</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* プラン1 */}
        <Card>
          <CardHeader>
            <CardTitle>スタータープラン</CardTitle>
            <p className="text-sm text-muted-foreground">基本機能のみが使えるプランです</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">¥98,000/月</p>
          </CardContent>
          <CardFooter>
            <SubscribeButton priceId="price_1RCwPQQdTmGPjYUuEpVf6uq7" />
          </CardFooter>
        </Card>

        {/* プラン2 */}
        <Card>
          <CardHeader>
            <CardTitle>グロースプラン</CardTitle>
            <p className="text-sm text-muted-foreground">全機能を無制限に使えるプランです</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">¥198,000/月</p>
          </CardContent>
          <CardFooter>
            <SubscribeButton priceId="price_1RCwOxQdTmGPjYUuTxxJoxKj" />
          </CardFooter>
        </Card>
      </div>
    </main>
  )
}
