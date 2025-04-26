'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useEffect } from 'react'

// メッセージの型定義
export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

// チャットの種類
export type ChatType = 'workspace' | 'design'

// チャットストアの状態の型定義
interface ChatState {
  // 状態
  messages: Record<string, Message[]> // キーはチャットID（ワークスペースIDなど）
  inputValues: Record<string, string> // キーはチャットID
  conversationIds: Record<string, string | undefined> // キーはチャットID
  activeWorkspaceId: string | null // 現在アクティブなワークスペースID
  isLoading: boolean
  isStreaming: boolean
  isSendingTypingIndicator: boolean
  error: string | null

  // アクション
  setMessages: (chatId: string, messages: Message[]) => void
  addMessage: (chatId: string, message: Message) => void
  updateLastMessage: (chatId: string, content: string) => void
  setInput: (chatId: string, input: string) => void
  setConversationId: (chatId: string, conversationId: string | undefined) => void
  setActiveWorkspaceId: (workspaceId: string | null) => void
  setIsLoading: (isLoading: boolean) => void
  setIsStreaming: (isStreaming: boolean) => void
  setIsSendingTypingIndicator: (isSending: boolean) => void
  setError: (error: string | null) => void
  clearChat: (chatId: string) => void
  clearAllChats: () => void
  clearWorkspaceChats: (workspaceId: string) => void

  // ワークスペースチャット用のヘルパー関数
  getChatId: (userId: string | null | undefined, workspaceId: string, chatType: ChatType) => string
}

// Zustandストアの作成
export const useChatStore = create<ChatState>()(
  persist(
    (set, _get) => ({
      // 初期状態
      messages: {},
      inputValues: {},
      conversationIds: {},
      activeWorkspaceId: null,
      isLoading: false,
      isStreaming: false,
      isSendingTypingIndicator: false,
      error: null,

      // メッセージを設定するアクション
      setMessages: (chatId: string, messages: Message[]) =>
        set((state) => ({
          messages: { ...state.messages, [chatId]: messages },
        })),

      // メッセージを追加するアクション
      addMessage: (chatId: string, message: Message) =>
        set((state) => ({
          messages: {
            ...state.messages,
            [chatId]: [...(state.messages[chatId] || []), message],
          },
        })),

      // 最後のメッセージを更新するアクション（ストリーミング用）
      updateLastMessage: (chatId: string, content: string) =>
        set((state) => {
          const chatMessages = state.messages[chatId] || []
          if (chatMessages.length === 0) return state

          const lastIndex = chatMessages.length - 1
          const lastMessage = chatMessages[lastIndex]

          if (lastMessage.role !== 'assistant') return state

          const updatedMessages = [...chatMessages]
          updatedMessages[lastIndex] = { ...lastMessage, content }

          return {
            messages: { ...state.messages, [chatId]: updatedMessages },
          }
        }),

      // 入力テキストを設定するアクション
      setInput: (chatId: string, input: string) =>
        set((state) => ({
          inputValues: { ...state.inputValues, [chatId]: input },
        })),

      // 会話IDを設定するアクション
      setConversationId: (chatId: string, conversationId: string | undefined) =>
        set((state) => ({
          conversationIds: { ...state.conversationIds, [chatId]: conversationId },
        })),

      // ローディング状態を設定するアクション
      setIsLoading: (isLoading: boolean) => set({ isLoading }),

      // ストリーミング状態を設定するアクション
      setIsStreaming: (isStreaming: boolean) => set({ isStreaming }),

      // タイピングインジケータの状態を設定するアクション
      setIsSendingTypingIndicator: (isSendingTypingIndicator: boolean) =>
        set({ isSendingTypingIndicator }),

      // エラーを設定するアクション
      setError: (error: string | null) => set({ error }),

      // 特定のチャットをクリアするアクション
      clearChat: (chatId: string) =>
        set((state) => ({
          messages: { ...state.messages, [chatId]: [] },
          inputValues: { ...state.inputValues, [chatId]: '' },
          conversationIds: { ...state.conversationIds, [chatId]: undefined },
        })),

      // すべてのチャットをクリアするアクション
      clearAllChats: () =>
        set({
          messages: {},
          inputValues: {},
          conversationIds: {},
          error: null,
        }),

      // 特定のワークスペースに関連するチャットをクリアするアクション
      clearWorkspaceChats: (workspaceId: string) =>
        set((state) => {
          const newMessages = { ...state.messages }
          const newInputValues = { ...state.inputValues }
          const newConversationIds = { ...state.conversationIds }

          // ワークスペースIDを含むキーを検索して削除
          Object.keys(newMessages).forEach((key) => {
            if (key.includes(workspaceId)) {
              delete newMessages[key]
              delete newInputValues[key]
              delete newConversationIds[key]
            }
          })

          return {
            messages: newMessages,
            inputValues: newInputValues,
            conversationIds: newConversationIds,
          }
        }),

      // アクティブなワークスペースIDを設定するアクション
      setActiveWorkspaceId: (workspaceId: string | null) => set({ activeWorkspaceId: workspaceId }),

      // チャットIDを生成するヘルパー関数
      getChatId: (userId, workspaceId, chatType) => {
        const baseKey = chatType === 'workspace' ? 'workspace_chat' : 'design_chat'
        return userId ? `${baseKey}_${userId}_${workspaceId}` : `${baseKey}_${workspaceId}`
      },
    }),
    {
      name: 'chat-storage',
      // 永続化する状態のみを選択
      partialize: (state) => ({
        messages: state.messages,
        inputValues: state.inputValues,
        conversationIds: state.conversationIds,
      }),
    }
  )
)
