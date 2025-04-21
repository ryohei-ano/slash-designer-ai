'use server'

import Stripe from 'stripe'
import { supabase } from '@/lib/supabase'
import { auth } from '@clerk/nextjs/server'
import { revalidatePath } from 'next/cache'

/**
 * サブスクリプション情報をデータベースに保存する関数
 * @param clerkUserId ClerkユーザーのユニークなユーザーID
 * @param stripeCustomerId StripeカスタマーのユニークなカスタマーID
 * @param priceId Stripeの価格ID
 * @param subscriptionId StripeサブスクリプションのユニークなサブスクリプションID
 */
export async function saveSubscription(
  clerkUserId: string,
  stripeCustomerId: string,
  priceId: string,
  subscriptionId: string
) {
  const { error } = await supabase.from('subscriptions').insert({
    clerk_user_id: clerkUserId,
    stripe_customer_id: stripeCustomerId,
    price_id: priceId,
    stripe_subscription_id: subscriptionId,
    is_active: true,
  })

  if (error) {
    throw new Error('Supabase保存失敗: ' + error.message)
  }
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
})

/**
 * Stripeカスタマーポータルセッションを作成するサーバーアクション
 * @returns カスタマーポータルのURL
 */
export async function createCustomerPortalSession(): Promise<{
  url: string | null
  error?: string
}> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { url: null, error: '未ログイン' }
    }

    // SupabaseからStripeのcustomerIdを取得
    console.log(`[createCustomerPortalSession] 検索開始: clerkUserId=${userId}`)

    const { data, error } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('clerk_user_id', userId)
      .maybeSingle()

    console.log(
      `[createCustomerPortalSession] 検索結果: clerkUserId=${userId}, data=`,
      data,
      'error=',
      error
    )

    if (!data || error) {
      console.error(`❌ 契約情報が見つかりません: userId=${userId}, error=`, error)
      return { url: null, error: '契約情報が見つかりません' }
    }

    const returnUrl =
      process.env.NODE_ENV === 'production'
        ? `${process.env.NEXT_PUBLIC_APP_URL}/workspace/select`
        : 'http://localhost:3000/workspace/select'

    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: returnUrl,
    })

    return { url: session.url }
  } catch (error) {
    console.error('カスタマーポータルセッション作成エラー:', error)
    return { url: null, error: 'セッション作成に失敗しました' }
  }
}

/**
 * Stripeチェックアウトセッションを作成するサーバーアクション
 * @param priceId Stripeの価格ID
 * @returns チェックアウトセッションのURL
 */
export async function createCheckoutSession(
  priceId: string
): Promise<{ url: string | null; error?: string }> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return { url: null, error: '未ログイン' }
    }

    console.log(`[createCheckoutSession] リクエスト受信: clerkUserId=${userId}, priceId=${priceId}`)

    if (!priceId) {
      console.error('❌ priceIdが提供されていません')
      return { url: null, error: 'priceId が必要です' }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url:
        process.env.NODE_ENV === 'production'
          ? `${process.env.NEXT_PUBLIC_APP_URL}/workspace/select?subscription=pending`
          : 'http://localhost:3000/workspace/select?subscription=pending',
      cancel_url:
        process.env.NODE_ENV === 'production'
          ? `${process.env.NEXT_PUBLIC_APP_URL}/plan`
          : 'http://localhost:3000/plan',
      metadata: {
        clerkUserId: userId,
        priceId: priceId,
      },
    })

    console.log(
      `[createCheckoutSession] セッション作成成功: sessionId=${session.id}, url=${session.url}`
    )
    return { url: session.url }
  } catch (error) {
    console.error('❌ Checkoutセッション作成失敗:', error)
    return { url: null, error: '内部エラー' }
  }
}

/**
 * フリープランをユーザーに割り当てるサーバーアクション
 * 新規ユーザー登録時に自動的に呼び出すことも可能
 */
export async function assignFreeSubscription(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // ユーザーがすでにサブスクリプションを持っているかチェック
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('clerk_user_id', userId)
      .maybeSingle()

    if (existingSubscription) {
      return { success: true, error: 'ユーザーはすでにサブスクリプションを持っています' }
    }

    // フリープランのPrice ID
    const FREE_PLAN_PRICE_ID = 'price_1REY9IQdTmGPjYUuBZGlSylb'

    // Stripeカスタマーを作成
    const customer = await stripe.customers.create({
      metadata: {
        clerkUserId: userId,
      },
    })

    console.log(`[assignFreeSubscription] Stripeカスタマー作成成功: customerId=${customer.id}`)

    // フリープランのサブスクリプションを作成
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: FREE_PLAN_PRICE_ID }],
      metadata: {
        clerkUserId: userId,
      },
    })

    console.log(
      `[assignFreeSubscription] Stripeサブスクリプション作成成功: subscriptionId=${subscription.id}`
    )

    // サブスクリプション情報をデータベースに保存
    const { error } = await supabase.from('subscriptions').insert({
      clerk_user_id: userId,
      stripe_customer_id: customer.id,
      price_id: FREE_PLAN_PRICE_ID,
      stripe_subscription_id: subscription.id,
      is_active: true,
    })

    if (error) {
      throw new Error('Supabase保存失敗: ' + error.message)
    }

    console.log(`[assignFreeSubscription] フリープランの割り当て完了: userId=${userId}`)
    return { success: true }
  } catch (error) {
    console.error('フリープラン割り当てエラー:', error)
    return { success: false, error: 'フリープランの割り当てに失敗しました' }
  }
}
