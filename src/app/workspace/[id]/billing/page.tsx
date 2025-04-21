import { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Toaster } from '@/components/ui/toaster'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SubscribeButton } from '@/components/ui/SubscribeButton'
import { ManageSubscriptionButton } from '@/components/ui/ManageSubscriptionButton'
import { getUserSubscription } from '@/lib/supabase'

export const metadata: Metadata = {
  title: 'お支払い | ワークスペース',
  description: 'サブスクリプションの管理ができます。',
}

export default async function BillingPage({ params }: { params: { id: string } }) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  // サブスクリプション情報を取得
  const { isActive } = await getUserSubscription(userId)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-[900] tracking-tight">お支払い</h1>
        <p className="text-muted-foreground">サブスクリプションの管理ができます。</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>フリープラン</CardTitle>
            <CardDescription>基本的な機能が利用できます</CardDescription>
            <p className="text-3xl font-bold">¥0</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>✓ 基本的なAIチャット</li>
              <li>✓ 1ワークスペース</li>
              <li>✓ 基本的なデザイン依頼</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>プロプラン</CardTitle>
            <CardDescription>高度な機能が利用できます</CardDescription>
            <p className="text-3xl font-bold">
              ¥2,980<span className="text-sm font-normal">/月</span>
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>✓ 高度なAIチャット</li>
              <li>✓ 3ワークスペースまで</li>
              <li>✓ 優先的なデザイン依頼</li>
              <li>✓ 優先サポート</li>
            </ul>

            <div className="mt-6">
              {isActive ? (
                <ManageSubscriptionButton />
              ) : (
                <SubscribeButton priceId="price_1RCwOxQdTmGPjYUuTxxJoxKj" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </div>
  )
}
