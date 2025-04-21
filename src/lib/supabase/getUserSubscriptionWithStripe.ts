import { supabase } from '@/lib/supabase'
import Stripe from 'stripe'

// Stripeの型拡張
interface StripeSubscriptionWithPeriodEnd extends Stripe.Subscription {
  current_period_end: number;
}

interface StripeSubscriptionItemWithPeriodEnd extends Stripe.SubscriptionItem {
  current_period_end: number;
}

// supabaseがnullの場合に対応するためのダミークライアント
const safeSupabase = supabase || {
  from: () => ({
    select: () => ({
      eq: () => ({
        eq: () =>
          Promise.resolve({
            data: null,
            error: new Error('Supabaseクライアントが初期化されていません'),
          }),
      }),
    }),
  }),
}

// Stripe初期化時のエラーハンドリング
let stripe: Stripe | null = null
try {
  if (process.env.STRIPE_SECRET_KEY) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-03-31.basil', // または現在利用可能なバージョン
    })
  } else {
    console.warn('⚠️ STRIPE_SECRET_KEYが設定されていません')
  }
} catch (error) {
  console.error('❌ Stripe初期化エラー:', error)
}

const planMap: Record<string, string> = {
  price_1RCwPQQdTmGPjYUuEpVf6uq7: 'スタータープラン',
  price_1RCwOxQdTmGPjYUuTxxJoxKj: 'グロースプラン',
  price_1REY9IQdTmGPjYUuBZGlSylb: 'フリープラン',
}

export type UserSubscription = {
  planName: string
  nextBillingDate: Date
  status: string
  cancelAt: number | null
}

export async function getUserSubscriptionWithStripe(
  clerkUserId: string
): Promise<UserSubscription | null> {
  // 開発環境の場合、モックデータを返すオプション
  if (process.env.NODE_ENV === 'development' && process.env.MOCK_SUBSCRIPTION === 'true') {
    console.log('開発モード: モックサブスクリプションを返します')
    return {
      planName: '開発者プラン',
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
      status: 'active',
      cancelAt: null,
    }
  }

  if (!clerkUserId) {
    console.error('❌ ユーザーIDが提供されていません')
    return null
  }

  try {
    // デバッグ用に詳細なログを追加
    console.log(`[getUserSubscriptionWithStripe] 検索開始: clerkUserId=${clerkUserId}`)

    // まずすべての契約情報を取得
    const { data: allSubscriptions, error: listError } = await safeSupabase
      .from('subscriptions')
      .select('*')
      .eq('clerk_user_id', clerkUserId)

    // 詳細なログ出力を追加
    console.log(
      `[getUserSubscriptionWithStripe] 検索結果: userId=${clerkUserId}, allSubs=`,
      allSubscriptions,
      listError
    )

    if (listError) {
      console.error('❌ Supabaseから契約情報取得失敗:', listError)
      return null
    }

    if (!allSubscriptions || allSubscriptions.length === 0) {
      console.log(
        `[getUserSubscriptionWithStripe] ユーザー ${clerkUserId} の契約情報が見つかりません`
      )
      return null
    }

    // アクティブな契約を探す
    const activeSubscription = allSubscriptions.find((sub) => sub.is_active === true)
    console.log(`[getUserSubscriptionWithStripe] activeSub=`, activeSubscription)

    // アクティブな契約が見つからない、またはStripe IDがない場合
    if (!activeSubscription || !activeSubscription.stripe_subscription_id) {
      console.error('❌ アクティブな契約が見つかりません')
      return null
    }

    // Stripeクライアントがない場合
    if (!stripe) {
      console.error('❌ Stripeクライアントが初期化されていません')

      // 開発環境では代替データを返す
      if (process.env.NODE_ENV === 'development') {
        return {
          planName: planMap[activeSubscription.price_id] || '不明なプラン',
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active',
          cancelAt: null,
        }
      }
      return null
    }

    // 以下、アクティブな契約があった場合の処理
    const data = activeSubscription

    try {
      // Stripeから最新のサブスクリプション情報を取得
      const stripeSub = await stripe.subscriptions.retrieve(data.stripe_subscription_id)

      // Stripeのステータスが「active」ではない場合はnullを返す
      if (stripeSub.status !== 'active') {
        console.log('❌ Stripeのサブスクリプションが非アクティブ:', stripeSub.status)
        return null
      }

      // 期間終了日を取得
      const currentPeriodEnd =
        (stripeSub.items.data[0] as unknown as StripeSubscriptionItemWithPeriodEnd).current_period_end ||
        (stripeSub as unknown as StripeSubscriptionWithPeriodEnd).current_period_end ||
        0

      return {
        planName: planMap[data.price_id] || '不明なプラン',
        nextBillingDate: new Date(currentPeriodEnd * 1000),
        status: stripeSub.status,
        cancelAt: stripeSub.cancel_at,
      }
    } catch (err) {
      console.error('❌ Stripeから契約詳細取得失敗:', err)

      // 開発環境では代替データを返す
      if (process.env.NODE_ENV === 'development') {
        return {
          planName: planMap[data.price_id] || '不明なプラン',
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active',
          cancelAt: null,
        }
      }
      return null
    }
  } catch (error) {
    console.error('❌ サブスクリプション取得中の予期せぬエラー:', error)
    return null
  }
}
