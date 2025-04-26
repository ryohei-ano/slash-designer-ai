/**
 * Slackブロック要素の型定義
 */
export type SlackBlock = {
  type: string
  text?: {
    type: string
    text: string
    emoji?: boolean
  }
  elements?: Array<{
    type: string
    text?: {
      type: string
      text: string
      emoji?: boolean
    }
    url?: string
    action_id?: string
  }>
}

/**
 * Slackメッセージの型定義
 */
export type SlackMessage = {
  text?: string
  blocks?: SlackBlock[]
  thread_ts?: string
  response_type?: 'ephemeral' | 'in_channel'
  replace_original?: boolean
  delete_original?: boolean
}

/**
 * Slackにメッセージを送信する
 * @param channelId 送信先チャンネルID
 * @param message 送信するメッセージ
 * @returns 送信結果
 */
export async function sendSlackMessage(channelId: string, message: SlackMessage) {
  try {
    const botToken = process.env.SLACK_BOT_TOKEN

    if (!botToken) {
      throw new Error('SLACK_BOT_TOKENが設定されていません')
    }

    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${botToken}`,
      },
      body: JSON.stringify({
        channel: channelId,
        ...message,
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      throw new Error(`Slack API エラー: ${data.error}`)
    }

    return data
  } catch (error) {
    console.error('メッセージ送信エラー:', error)
    throw error
  }
}

/**
 * Slackのresponse_urlを使用してメッセージを送信する
 * @param responseUrl Slackから提供されたresponse_url
 * @param message 送信するメッセージ
 * @returns 送信結果
 */
export async function sendResponseToUrl(responseUrl: string, message: SlackMessage) {
  try {
    const response = await fetch(responseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Response URL エラー: ${errorText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Response URL 送信エラー:', error)
    throw error
  }
}

/**
 * Slackのスラッシュコマンドに即時レスポンスを返す
 * @param message レスポンスメッセージ
 * @returns レスポンスオブジェクト
 */
export async function createCommandResponse(message: SlackMessage) {
  return new Response(JSON.stringify(message), {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

/**
 * AIの応答をブロックに変換する
 * @param text AIからの応答テキスト
 * @returns Slackのブロック形式
 */
export async function formatAiResponseBlocks(text: string): Promise<SlackBlock[]> {
  return Promise.resolve([
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: text,
      },
    },
  ])
}

/**
 * タスク作成完了通知のブロックを生成する
 * @param taskId タスクID
 * @param title タスクのタイトル
 * @param workspaceId ワークスペースID
 * @returns Slackのブロック形式
 */
export async function createTaskCompletionBlocks(
  taskId: number,
  title: string,
  workspaceId?: string
): Promise<SlackBlock[]> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app-url.com'
  const taskUrl = workspaceId
    ? `${appUrl}/workspace/${workspaceId}/tasks/${taskId}`
    : `${appUrl}/dashboard/tasks`

  return Promise.resolve([
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:white_check_mark: *デザイン依頼がタスクとして登録されました*\n*タイトル:* ${title}\n*タスクID:* #${taskId}`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'タスクを表示',
            emoji: true,
          },
          url: taskUrl,
          action_id: 'view_task',
        },
      ],
    },
  ])
}
