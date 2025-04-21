import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Stripeの型拡張
interface StripeSubscriptionWithPeriodEnd extends Stripe.Subscription {
  current_period_end: number;
}
import { saveSubscription } from '@/app/actions/subscription'
import { updateSubscriptionStatus } from '@/lib/supabase/updateSubscriptionStatus'
import { supabase } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil', // 最新安定版。API更新あったら都度確認してなおす
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') as string

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
  } catch (err) {
    console.error('❌ Webhook署名検証失敗:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Stripe の Checkout セッション完了イベント
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const clerkUserId = session.metadata?.clerkUserId
    const stripeCustomerId = session.customer as string
    const priceId = session.metadata?.priceId
    const subscriptionId = session.subscription as string

    console.log('✅ Checkout完了イベント受信:', {
      clerkUserId,
      stripeCustomerId,
      priceId,
      subscriptionId,
      sessionId: session.id,
      metadata: session.metadata,
    })

    if (!clerkUserId || !priceId) {
      console.error('❌ ClerkUserId または priceId がありません')
      return NextResponse.json({ error: 'Metadata missing' }, { status: 400 })
    }

    try {
      const stripeSub = await stripe.subscriptions.retrieve(subscriptionId)
      console.log('✅ Stripe契約情報取得成功:', {
        status: stripeSub.status,
        items: stripeSub.items?.data?.length,
      })

      // ✅ Step 1: Supabase に保存（新規）
      try {
        await saveSubscription(clerkUserId, stripeCustomerId, priceId, subscriptionId)
        console.log('✅ Supabaseに初回保存成功')
      } catch (saveError) {
        console.error('❌ Supabase保存エラー:', saveError)
        throw saveError
      }

      // ✅ Step 2: ステータス更新
      // Stripeの型定義に合わせて期間終了日を取得
      const nextBillingUnix = (stripeSub as unknown as StripeSubscriptionWithPeriodEnd).current_period_end ?? 0

      try {
        await updateSubscriptionStatus(clerkUserId, {
          nextBillingDate: nextBillingUnix ? new Date(nextBillingUnix * 1000) : null,
          isActive: stripeSub.status === 'active',
        })
        console.log('✅ Supabaseステータス更新成功')
      } catch (updateError) {
        console.error('❌ Supabaseステータス更新エラー:', updateError)
        throw updateError
      }

      console.log('✅ Supabaseに初回保存 & is_active 更新 完了')
    } catch (err) {
      console.error('❌ Stripe契約情報の取得エラー:', err)
    }
  }

  // サブスクリプション更新イベント
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription
    const subscriptionId = subscription.id

    try {
      // DBからClerkユーザーIDを取得
      const { data, error } = await supabase
        .from('subscriptions')
        .select('clerk_user_id')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle()

      if (error || !data) {
        console.error('❌ サブスクリプションからClerkユーザーID取得失敗:', error)
        return NextResponse.json({ error: 'User not found' }, { status: 400 })
      }

      const clerkUserId = data.clerk_user_id

      // ステータス更新
      // Stripeの型定義に合わせて期間終了日を取得
      const periodEnd = (subscription as unknown as StripeSubscriptionWithPeriodEnd).current_period_end ?? 0
      await updateSubscriptionStatus(clerkUserId, {
        nextBillingDate: periodEnd ? new Date(periodEnd * 1000) : null,
        isActive: subscription.status === 'active',
      })

      console.log('✅ サブスクリプション更新イベント処理完了')
    } catch (err) {
      console.error('❌ サブスクリプション更新処理エラー:', err)
    }
  }

  // サブスクリプション削除イベント
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription
    const subscriptionId = subscription.id

    try {
      // DBからClerkユーザーIDを取得
      const { data, error } = await supabase
        .from('subscriptions')
        .select('clerk_user_id')
        .eq('stripe_subscription_id', subscriptionId)
        .maybeSingle()

      if (error || !data) {
        console.error('❌ サブスクリプションからClerkユーザーID取得失敗:', error)
        return NextResponse.json({ error: 'User not found' }, { status: 400 })
      }

      const clerkUserId = data.clerk_user_id

      // ステータス更新（非アクティブに）
      await updateSubscriptionStatus(clerkUserId, {
        nextBillingDate: null,
        isActive: false,
      })

      console.log('✅ サブスクリプション削除イベント処理完了')
    } catch (err) {
      console.error('❌ サブスクリプション削除処理エラー:', err)
    }
  }

  // Stripe にはすぐレスポンス返す（タイムアウト防止）
  return NextResponse.json({ received: true })
}
