'use client'

import { FormEvent, useRef, useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, ArrowUp } from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import ReactMarkdown from 'react-markdown'
import { useChatStore, Message } from '@/store/chatStore'
import { useWorkspaceStore } from '@/store/workspaceStore'

interface WorkspaceChatProps {
  workspaceId: string
  workspaceName?: string
}

export default function WorkspaceChat({ workspaceId, workspaceName }: WorkspaceChatProps) {
  const [isComposing, setIsComposing] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()
  const { user } = useUser()

  // Zustandストアから状態とアクションを取得
  const {
    messages: allMessages,
    inputValues,
    conversationIds,
    isLoading,
    isStreaming,
    isSendingTypingIndicator,
    setMessages,
    addMessage,
    updateLastMessage,
    setInput,
    setConversationId,
    setIsLoading,
    setIsStreaming,
    setIsSendingTypingIndicator,
    setError,
    clearChat,
    getChatId,
  } = useChatStore()

  // ワークスペースストアから状態を取得
  const { isLoading: isWorkspaceLoading, currentWorkspace } = useWorkspaceStore()

  // 現在のチャットID
  const chatId = getChatId(user?.id, workspaceId, 'workspace')

  // 現在のチャットのメッセージと入力値
  const messages = useMemo(() => allMessages[chatId] || [], [allMessages, chatId])
  const input = inputValues[chatId] || ''
  const conversationId = conversationIds[chatId]

  // ワークスペース切り替えイベントのリスナー
  useEffect(() => {
    // ワークスペース切り替えイベントのハンドラー
    const handleWorkspaceSwitched = (event: CustomEvent) => {
      const { workspaceId: newWorkspaceId } = event.detail

      // 現在表示中のワークスペースと異なる場合はトランジション効果を表示
      if (newWorkspaceId !== workspaceId) {
        setIsTransitioning(true)
      }
    }

    // イベントリスナーを追加
    window.addEventListener('workspace-switched', handleWorkspaceSwitched as EventListener)

    // クリーンアップ関数
    return () => {
      window.removeEventListener('workspace-switched', handleWorkspaceSwitched as EventListener)
    }
  }, [workspaceId])

  // ワークスペース切り替え時のトランジション効果
  useEffect(() => {
    // ワークスペースが読み込み中または現在のワークスペースIDが一致しない場合
    if (isWorkspaceLoading || (currentWorkspace && currentWorkspace.id !== workspaceId)) {
      setIsTransitioning(true)
    } else {
      // トランジション効果のために少し遅延させる
      const timer = setTimeout(() => {
        setIsTransitioning(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isWorkspaceLoading, currentWorkspace, workspaceId])

  // 初期メッセージの表示
  useEffect(() => {
    // ユーザー情報がロードされるまで待機
    if (!user) return

    // 保存されたメッセージがある場合は表示しない
    if (messages.length > 0) return

    // ウェルカムメッセージを表示
    setIsSendingTypingIndicator(true)
    setTimeout(() => {
      setMessages(chatId, [
        {
          id: 'welcome',
          role: 'assistant',
          content: `こんにちは！${workspaceName || 'ワークスペース'}のデザインアシスタントを務めさせていただきます、mocaです✨ デザインに関する質問やご依頼があればお気軽にどうぞ。`,
        },
      ])
      setIsSendingTypingIndicator(false)
    }, 1000)
  }, [user, chatId, messages.length, workspaceName, setMessages, setIsSendingTypingIndicator])

  // メッセージが追加されたらスクロール
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isSendingTypingIndicator])

  // テキストエリアの高さを自動調整
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }, [input])

  // メッセージ送信処理
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    }

    // ユーザーメッセージを追加
    addMessage(chatId, userMessage)
    setInput(chatId, '')
    setIsLoading(true)

    // テキストエリアの高さをリセット
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    setIsSendingTypingIndicator(true)

    try {
      const response = await fetch('/api/workspace-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          workspaceId,
          conversationId,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('APIエラー:', errorText)
        throw new Error(errorText || 'APIリクエストに失敗しました')
      }

      setIsSendingTypingIndicator(false)

      // 会話IDを取得
      const newConversationId = response.headers.get('x-conversation-id')
      if (newConversationId) {
        setConversationId(chatId, newConversationId)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('レスポンスの読み込みに失敗しました')

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      }

      // AIメッセージを追加
      addMessage(chatId, aiMessage)
      setIsStreaming(true)

      const decoder = new TextDecoder()
      let done = false

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading

        if (value) {
          const text = decoder.decode(value)

          // 最後のメッセージを更新
          updateLastMessage(chatId, messages[messages.length - 1].content + text)
        }
      }

      setIsStreaming(false)
    } catch (error) {
      console.error('チャットエラー:', error)
      setIsSendingTypingIndicator(false)
      setIsStreaming(false)

      // エラーメッセージを追加
      addMessage(chatId, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '申し訳ありません、エラーが発生しました。もう一度お試しください。',
      })

      setError(error instanceof Error ? error.message : 'チャット処理中にエラーが発生しました')

      toast({
        title: 'エラーが発生しました',
        description:
          error instanceof Error ? error.message : 'チャット処理中にエラーが発生しました',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // キーボードショートカット処理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposing) return

    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isLoading && input.trim()) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
  }

  // 会話をクリア
  const clearConversation = () => {
    clearChat(chatId)

    // ウェルカムメッセージを表示
    setMessages(chatId, [
      {
        id: 'welcome',
        role: 'assistant',
        content: `こんにちは！${workspaceName || 'ワークスペース'}様のデザインアシスタントを務めます、Mocaです👋 デザインに関する質問があればお気軽にどうぞ。`,
      },
    ])
  }

  return (
    <div className="relative h-full flex flex-col">
      <div className="absolute top-0 right-0 p-4 z-10">
        <Button variant="ghost" size="sm" onClick={clearConversation} className="text-xs">
          会話をクリア
        </Button>
      </div>

      {isTransitioning ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="absolute inset-0 overflow-auto scrollbar-hide">
          <div className="flex flex-col items-center">
            <div className="w-full max-w-2xl space-y-10 pb-32 pt-12 px-4">
              {messages.map((message, index) => {
                // 最新のAIメッセージかどうかを判定
                const isLatestAIMessage =
                  message.role === 'assistant' &&
                  messages.findIndex((m, i) => i > index && m.role === 'assistant') === -1

                return (
                  <div
                    key={message.id}
                    className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'user' ? (
                      <div className="flex flex-row-reverse gap-3">
                        {
                          <Avatar className="h-8 w-8">
                            {user?.imageUrl ? (
                              <AvatarImage src={user.imageUrl} alt={user.firstName || 'ユーザー'} />
                            ) : (
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {user?.firstName?.[0] || 'U'}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        }
                        <div className="rounded-lg p-4 bg-secondary text-black px-4">
                          <p className="text-base whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-start">
                        {isLatestAIMessage && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-100 text-blue-500">
                              AI
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div className="rounded-lg py-3">
                          <div className="text-base prose-base max-w-none prose-headings:my-2 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 leading-loose">
                            {isLatestAIMessage && isStreaming ? (
                              <div className="relative">
                                <ReactMarkdown>{message.content}</ReactMarkdown>
                                <div className="absolute bottom-0 right-0 animate-pulse">▋</div>
                              </div>
                            ) : (
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {isSendingTypingIndicator && (
                <div className="flex justify-start w-full">
                  <div className="flex flex-col items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-100 text-blue-500">AI</AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg py-3">
                      <div className="flex space-x-1 items-center h-5">
                        <div
                          className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                          style={{ animationDelay: '150ms' }}
                        ></div>
                        <div
                          className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                          style={{ animationDelay: '0ms' }}
                        ></div>
                        <div
                          className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                          style={{ animationDelay: '300ms' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 z-20">
        <div className="bg-background border rounded-xl shadow-lg p-2 flex-col gap-2">
          <div className="w-full relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(chatId, e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="デザインについて質問しよう"
              className="min-h-[80px] max-h-[150px] pr-14 resize-none rounded-lg border-0 focus-visible:ring-0 shadow-none text-base"
              style={{ fontSize: '16px' }}
              disabled={isLoading || isSendingTypingIndicator}
            />
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || isSendingTypingIndicator || !input.trim()}
              size="icon"
              className="absolute right-2 rounded-full bottom-2"
            >
              {isLoading || isSendingTypingIndicator ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
