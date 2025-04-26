'use server'

import crypto from 'crypto'

/**
 * Slackからのリクエストを検証する
 * @param signature Slackからのリクエストに含まれるX-Slack-Signatureヘッダー
 * @param timestamp Slackからのリクエストに含まれるX-Slack-Request-Timestampヘッダー
 * @param body リクエストボディ
 * @returns 検証結果（boolean）
 */
export async function verifySlackRequest(
  signature: string | null,
  timestamp: string | null,
  body: string
): Promise<boolean> {
  // 環境変数からSlackの署名シークレットを取得
  const signingSecret = process.env.SLACK_SIGNING_SECRET

  // 必要なパラメータが不足している場合は検証失敗
  if (!signature || !timestamp || !signingSecret) {
    console.error('Slack検証に必要なパラメータが不足しています')
    return false
  }

  // タイムスタンプが5分以上前の場合はリプレイアタック防止のため検証失敗
  const currentTime = Math.floor(Date.now() / 1000)
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    console.error('Slackリクエストのタイムスタンプが古すぎます')
    return false
  }

  try {
    // 署名の計算
    const baseString = `v0:${timestamp}:${body}`
    const hmac = crypto.createHmac('sha256', signingSecret)
    const calculatedSignature = `v0=${hmac.update(baseString).digest('hex')}`

    // 署名の比較（タイミング攻撃を防ぐためにcrypto.timingSafeEqualを使用）
    const signatureBuffer = Buffer.from(signature)
    const calculatedBuffer = Buffer.from(calculatedSignature)

    return crypto.timingSafeEqual(signatureBuffer, calculatedBuffer)
  } catch (error) {
    console.error('Slack署名の検証中にエラーが発生しました:', error)
    return false
  }
}

/**
 * Slackワークスペースのプラン情報を取得する
 * @param teamId Slackチーム（ワークスペース）ID
 * @returns プラン情報（isPaid: 有料プランかどうか, planType: プランタイプ）
 */
export async function detectSlackPlan(
  teamId: string
): Promise<{ isPaid: boolean; planType: string }> {
  try {
    // 環境変数からSlackのボットトークンを取得
    const botToken = process.env.SLACK_BOT_TOKEN

    if (!botToken) {
      console.error('SLACK_BOT_TOKENが設定されていません')
      return { isPaid: false, planType: 'unknown' }
    }

    // Slack APIを使用してチームの情報を取得
    const response = await fetch(`https://slack.com/api/team.info?team=${teamId}`, {
      headers: {
        Authorization: `Bearer ${botToken}`,
      },
    })

    const data = await response.json()

    // APIレスポンスにエラーがある場合
    if (!data.ok) {
      console.error('Slack API エラー:', data.error)
      return { isPaid: false, planType: 'unknown' }
    }

    // プランタイプを確認
    return {
      isPaid: data.team.is_paid, // 有料プランかどうか
      planType: data.team.plan, // 'free', 'standard', 'plus', 'enterprise'
    }
  } catch (error) {
    console.error('プラン検出エラー:', error)
    return { isPaid: false, planType: 'unknown' }
  }
}
