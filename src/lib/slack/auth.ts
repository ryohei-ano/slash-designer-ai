import { createHmac } from 'crypto'

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

  // 署名の検証
  const baseString = `v0:${timestamp}:${body}`
  const hmac = createHmac('sha256', signingSecret)
  const calculatedSignature = `v0=${hmac.update(baseString).digest('hex')}`

  // 開発環境では署名検証をスキップするオプション
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_SLACK_SIGNATURE_CHECK === 'true') {
    console.warn(
      '開発環境で署名検証をスキップしています。本番環境では必ず署名検証を有効にしてください。'
    )
    return true
  }

  return calculatedSignature === signature
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
