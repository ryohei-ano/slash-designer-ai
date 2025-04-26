'use server'

import { DESIGN_CHAT_SYSTEM_PROMPT } from '@/lib/prompts'

/**
 * チャットメッセージの型定義
 */
export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * デザイン依頼のJSONデータの型定義
 */
export type DesignRequestData = {
  title: string
  description: string
  category?: string
  urgency?: string
  [key: string]: unknown // その他の追加フィールド
}

/**
 * セッションの型定義
 */
export type ChatSession = {
  threadTs: string
  channelId: string
  userId: string
  teamId: string
  messages: ChatMessage[]
  startTime: number
  lastActivityTime: number
  responseUrl?: string
  workspaceId?: string
  jsonData?: DesignRequestData
}

// メモリ内セッションストア（本番環境ではRedisなどの外部ストレージを使用することを推奨）
const sessions = new Map<string, ChatSession>()

// セッションのタイムアウト時間（ミリ秒）
const SESSION_TIMEOUT = 15 * 60 * 1000 // 15分

/**
 * 新しいチャットセッションを作成する
 * @param threadTs スレッドのタイムスタンプ（セッションID）
 * @param channelId チャンネルID
 * @param userId ユーザーID
 * @param teamId チームID
 * @param initialMessage 初期メッセージ（オプション）
 * @param responseUrl レスポンスURL（オプション）
 * @param workspaceId ワークスペースID（オプション）
 * @returns 作成されたセッション
 */
export async function createChatSession(
  threadTs: string,
  channelId: string,
  userId: string,
  teamId: string,
  initialMessage?: string,
  responseUrl?: string,
  workspaceId?: string
): Promise<ChatSession> {
  // システムプロンプトを含む初期メッセージ配列
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: DESIGN_CHAT_SYSTEM_PROMPT,
    },
  ]

  // 初期メッセージが提供された場合は追加
  if (initialMessage) {
    messages.push({
      role: 'user',
      content: initialMessage,
    })
  }

  // 新しいセッションを作成
  const session: ChatSession = {
    threadTs,
    channelId,
    userId,
    teamId,
    messages,
    startTime: Date.now(),
    lastActivityTime: Date.now(),
    responseUrl,
    workspaceId,
  }

  // セッションをストアに保存
  sessions.set(threadTs, session)

  return session
}

/**
 * セッションを取得する
 * @param threadTs スレッドのタイムスタンプ（セッションID）
 * @returns セッション（存在しない場合はnull）
 */
export async function getChatSession(threadTs: string): Promise<ChatSession | null> {
  return sessions.get(threadTs) || null
}

/**
 * セッションにメッセージを追加する
 * @param threadTs スレッドのタイムスタンプ（セッションID）
 * @param message 追加するメッセージ
 * @returns 更新されたセッション（存在しない場合はnull）
 */
export async function addMessageToSession(
  threadTs: string,
  message: ChatMessage
): Promise<ChatSession | null> {
  const session = sessions.get(threadTs)
  if (!session) return null

  // メッセージを追加して最終アクティビティ時間を更新
  session.messages.push(message)
  session.lastActivityTime = Date.now()

  // セッションを更新
  sessions.set(threadTs, session)

  return session
}

/**
 * セッションのJSONデータを更新する
 * @param threadTs スレッドのタイムスタンプ（セッションID）
 * @param jsonData 更新するJSONデータ
 * @returns 更新されたセッション（存在しない場合はnull）
 */
export async function updateSessionJsonData(
  threadTs: string,
  jsonData: DesignRequestData
): Promise<ChatSession | null> {
  const session = sessions.get(threadTs)
  if (!session) return null

  // JSONデータを更新
  session.jsonData = jsonData
  session.lastActivityTime = Date.now()

  // セッションを更新
  sessions.set(threadTs, session)

  return session
}

/**
 * セッションが有効期限切れかどうかを確認する
 * @param threadTs スレッドのタイムスタンプ（セッションID）
 * @returns 有効期限切れかどうか
 */
export async function isSessionExpired(threadTs: string): Promise<boolean> {
  const session = sessions.get(threadTs)
  if (!session) return true

  const currentTime = Date.now()
  return currentTime - session.lastActivityTime > SESSION_TIMEOUT
}

/**
 * セッションの残り時間（分）を取得する
 * @param threadTs スレッドのタイムスタンプ（セッションID）
 * @returns 残り時間（分）、セッションが存在しない場合は0
 */
export async function getSessionRemainingMinutes(threadTs: string): Promise<number> {
  const session = sessions.get(threadTs)
  if (!session) return 0

  const currentTime = Date.now()
  const elapsedMs = currentTime - session.lastActivityTime
  const remainingMs = Math.max(0, SESSION_TIMEOUT - elapsedMs)

  return Math.ceil(remainingMs / (60 * 1000))
}

/**
 * セッションを削除する
 * @param threadTs スレッドのタイムスタンプ（セッションID）
 */
export async function deleteChatSession(threadTs: string): Promise<void> {
  sessions.delete(threadTs)
}

/**
 * 期限切れのセッションをクリーンアップする
 * 定期的に実行することを推奨（例：1時間ごと）
 */
export async function cleanupExpiredSessions(): Promise<void> {
  const currentTime = Date.now()

  for (const [threadTs, session] of sessions.entries()) {
    if (currentTime - session.lastActivityTime > SESSION_TIMEOUT) {
      sessions.delete(threadTs)
    }
  }
}

// 開発用：すべてのセッションを取得（デバッグ目的）
export async function getAllSessions(): Promise<Map<string, ChatSession>> {
  return sessions
}
