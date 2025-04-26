'use server'

import OpenAI from 'openai'
import {
  ChatMessage,
  addMessageToSession,
  updateSessionJsonData,
  DesignRequestData,
} from '@/lib/slack/session'
import {
  sendSlackMessage,
  sendResponseToUrl,
  formatAiResponseBlocks,
  createTaskCompletionBlocks,
} from '@/lib/slack/message'
import { saveDesignRequest } from '@/app/actions/design-requests'

// RequestData型の定義（design-requests.tsと同じ）
type RequestData = {
  title: string
  description: string
  category: string
  urgency: '通常' | '急ぎ'
}

// OpenAI APIの設定
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

/**
 * JSONデータを抽出する
 * @param text テキスト
 * @returns 抽出されたJSONデータ（抽出できない場合はnull）
 */
export async function extractJsonData(text: string): Promise<DesignRequestData | null> {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const jsonString = jsonMatch[0]
      return JSON.parse(jsonString)
    }
  } catch (error) {
    console.error('JSON解析エラー:', error)
  }
  return null
}

/**
 * OpenAIにメッセージを送信し、応答を取得する
 * @param messages メッセージ配列
 * @returns 応答テキスト
 */
export async function sendMessageToOpenAI(messages: ChatMessage[]): Promise<string> {
  try {
    // OpenAI APIキーのチェック
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAIのAPIキーが設定されていません')
    }

    // OpenAI APIを呼び出す
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
    })

    return response.choices[0]?.message?.content || '応答を生成できませんでした'
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw new Error(`OpenAI APIエラー: ${error instanceof Error ? error.message : '不明なエラー'}`)
  }
}

/**
 * OpenAIにメッセージを送信し、応答をSlackに返す
 * @param threadTs スレッドのタイムスタンプ（セッションID）
 * @param channelId チャンネルID
 * @param messages メッセージ配列
 * @param responseUrl レスポンスURL（オプション）
 * @returns 応答テキスト
 */
export async function processAiMessageAndSendToSlack(
  threadTs: string,
  channelId: string,
  messages: ChatMessage[],
  responseUrl?: string
): Promise<string> {
  try {
    // OpenAIに送信
    const aiResponse = await sendMessageToOpenAI(messages)

    // セッションにアシスタントのメッセージを追加
    await addMessageToSession(threadTs, {
      role: 'assistant',
      content: aiResponse,
    })

    // JSONデータを抽出
    const jsonData = await extractJsonData(aiResponse)
    if (jsonData) {
      await updateSessionJsonData(threadTs, jsonData)
    }

    // Slackにメッセージを送信
    if (responseUrl) {
      // response_urlが提供されている場合はそれを使用
      await sendResponseToUrl(responseUrl, {
        text: aiResponse,
        blocks: await formatAiResponseBlocks(aiResponse),
        thread_ts: threadTs,
        replace_original: false,
      })
    } else {
      // 通常のAPIを使用
      await sendSlackMessage(channelId, {
        text: aiResponse,
        blocks: await formatAiResponseBlocks(aiResponse),
        thread_ts: threadTs,
      })
    }

    return aiResponse
  } catch (error) {
    console.error('AI処理エラー:', error)

    // エラーメッセージをSlackに送信
    const errorMessage = `エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`

    if (responseUrl) {
      await sendResponseToUrl(responseUrl, {
        text: errorMessage,
        thread_ts: threadTs,
        replace_original: false,
      })
    } else {
      await sendSlackMessage(channelId, {
        text: errorMessage,
        thread_ts: threadTs,
      })
    }

    throw error
  }
}

/**
 * JSONデータからタスクを作成し、結果をSlackに通知する
 * @param threadTs スレッドのタイムスタンプ（セッションID）
 * @param channelId チャンネルID
 * @param jsonData JSONデータ
 * @param workspaceId ワークスペースID（オプション）
 * @returns 作成されたタスク
 */
export async function createTaskFromJsonAndNotify(
  threadTs: string,
  channelId: string,
  jsonData: DesignRequestData,
  workspaceId?: string
): Promise<{
  id: number
  title: string
  description: string
  category?: string
  urgency?: string
  status: string
  created_at: string
  updated_at: string
  workspace_id?: string
}> {
  try {
    // RequestData型に変換
    const requestData: RequestData = {
      title: jsonData.title,
      description: jsonData.description,
      // categoryがない場合はデフォルト値を設定
      category: jsonData.category || 'その他',
      // urgencyがない場合または無効な値の場合はデフォルト値を設定
      urgency: (jsonData.urgency === '急ぎ' ? '急ぎ' : '通常') as '通常' | '急ぎ',
    }

    // タスクを作成
    const result = await saveDesignRequest(requestData, workspaceId)

    if (!result.success) {
      throw new Error(result.error || 'タスクの作成に失敗しました')
    }

    // タスク作成の通知をSlackに送信
    await sendSlackMessage(channelId, {
      text: `デザイン依頼がタスクとして登録されました: ${jsonData.title}`,
      blocks: await createTaskCompletionBlocks(result.request.id, jsonData.title, workspaceId),
      thread_ts: threadTs,
    })

    return result.request
  } catch (error) {
    console.error('タスク作成エラー:', error)

    // エラーメッセージをSlackに送信
    await sendSlackMessage(channelId, {
      text: `タスクの作成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
      thread_ts: threadTs,
    })

    throw error
  }
}
