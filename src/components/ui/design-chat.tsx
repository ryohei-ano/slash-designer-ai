'use client'

import { useState, FormEvent, useRef, useEffect } from 'react'
import { saveDesignRequest } from '@/app/actions/design-requests'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { SendIcon, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import ReactMarkdown from 'react-markdown'

// localStorageキーのベース名
const STORAGE_KEY_BASE = 'design_chat_data'

// ユーザー・ワークスペース固有のlocalStorageキーを生成する関数
const getStorageKey = (
  userId: string | null | undefined,
  workspaceId: string | undefined
): string => {
  if (!userId) return STORAGE_KEY_BASE
  if (!workspaceId) return `${STORAGE_KEY_BASE}_${userId}`
  return `${STORAGE_KEY_BASE}_${userId}_${workspaceId}`
}

// ユーザーのチャットデータをクリアする関数
export const clearUserChatData = (
  userId: string | null | undefined,
  workspaceId: string | undefined
): void => {
  if (userId) {
    localStorage.removeItem(getStorageKey(userId, workspaceId))
  }
}

// メッセージの型定義
type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

// JSONデータの型定義
type RequestData = {
  title: string
  description: string
  category: string
  urgency: '通常' | '急ぎ'
}

// 保存データの型定義
interface StoredChatData {
  messages: Message[]
  inputValue: string
  jsonData: RequestData | null
}

export default function DesignChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [jsonData, setJsonData] = useState<RequestData | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)
  const [isSendingTypingIndicator, setIsSendingTypingIndicator] = useState(false)
  const [isComposing, setIsComposing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useUser()

  // 現在のワークスペースIDを取得
  const pathname = window.location.pathname
  const workspaceIdMatch = pathname.match(/\/workspace\/([^\/]+)/)
  const workspaceId = workspaceIdMatch ? workspaceIdMatch[1] : undefined

  // ユーザー・ワークスペース固有のストレージキー
  const storageKey = getStorageKey(user?.id, workspaceId)

  // 保存データを復元
  useEffect(() => {
    // ユーザー情報がロードされるまで待機
    if (!user) return

    try {
      const savedData = localStorage.getItem(storageKey)
      if (savedData) {
        const parsedData: StoredChatData = JSON.parse(savedData)
        // 保存されたメッセージがある場合のみ復元
        if (parsedData.messages && parsedData.messages.length > 0) {
          setMessages(parsedData.messages)
          setInput(parsedData.inputValue || '')
          setJsonData(parsedData.jsonData)
          // ウェルカムメッセージは既に表示されているため、初期表示は不要
          return
        }
      }

      // 保存データがなければウェルカムメッセージを表示
      setIsSendingTypingIndicator(true)
      setTimeout(() => {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content:
              'こんにちは！デザイン依頼を受け付けています。どのようなデザインが必要ですか？ランディングページ、ロゴ、SNS用クリエイティブなど、お気軽にご相談ください。',
          },
        ])
        setIsSendingTypingIndicator(false)
      }, 1000)
    } catch (error) {
      console.error('保存データの読み込みエラー:', error)
    }
  }, [user, storageKey])

  // データ変更時に保存
  useEffect(() => {
    // 初期ロード時またはユーザーがロードされていない場合は保存しない
    if (messages.length === 0 || !user) return

    try {
      const dataToSave: StoredChatData = {
        messages,
        inputValue: input,
        jsonData,
      }
      localStorage.setItem(storageKey, JSON.stringify(dataToSave))
    } catch (error) {
      console.error('データ保存エラー:', error)
    }
  }, [messages, input, jsonData, user, storageKey])

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

  // JSONデータを抽出
  const extractJsonData = (text: string): RequestData | null => {
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

  // リクエスト保存処理（Server Actionを使用）
  const saveRequest = async () => {
    if (!jsonData) return

    setIsSaving(true)
    try {
      // Server Actionを使用してデータを保存
      const result = await saveDesignRequest(jsonData, workspaceId)

      if (!result.success) {
        throw new Error(result.error || 'リクエストの保存に失敗しました')
      }

      toast({
        title: 'デザイン依頼を受け付けました',
        description: 'タスク一覧から進捗を確認できます',
      })

      // チャットデータをクリア
      localStorage.removeItem(storageKey)

      // タスク一覧へリダイレクト
      if (workspaceId) {
        router.push(`/workspace/${workspaceId}/tasks`)
      } else {
        router.push('/workspace/select')
      }
    } catch (error) {
      console.error('保存エラー:', error)
      toast({
        title: 'エラーが発生しました',
        description: error instanceof Error ? error.message : 'リクエストの保存に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // メッセージ送信処理
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // テキストエリアの高さをリセット
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    setIsSendingTypingIndicator(true)

    try {
      const apiMessages = messages
        .filter((msg) => msg.id !== 'welcome')
        .concat(userMessage)
        .map(({ role, content }) => ({ role, content }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('APIエラー:', errorText)
        throw new Error(errorText || 'APIリクエストに失敗しました')
      }

      setIsSendingTypingIndicator(false)

      const reader = response.body?.getReader()
      if (!reader) throw new Error('レスポンスの読み込みに失敗しました')

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      }

      setMessages((prev) => [...prev, aiMessage])

      const decoder = new TextDecoder()
      let done = false
      let fullResponse = ''

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading

        if (value) {
          const text = decoder.decode(value)
          fullResponse += text

          setMessages((prevMessages) => {
            const lastMessage = prevMessages[prevMessages.length - 1]
            if (lastMessage.role === 'assistant') {
              return [
                ...prevMessages.slice(0, -1),
                { ...lastMessage, content: lastMessage.content + text },
              ]
            }
            return prevMessages
          })
        }
      }

      const extractedJson = extractJsonData(fullResponse)
      if (extractedJson) {
        setJsonData(extractedJson)
      }
    } catch (error) {
      console.error('チャットエラー:', error)
      setIsSendingTypingIndicator(false)

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '申し訳ありません、エラーが発生しました。もう一度お試しください。',
        },
      ])
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

  // 説明文の短縮表示
  const getShortenedDescription = (description: string): string => {
    if (description.length <= 150) return description
    return description.substring(0, 150) + '...'
  }

  return (
    <Card className="w-full h-[calc(100vh-8rem)] flex flex-col">
      <CardContent className="flex-1 px-6 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex gap-3 max-w-[80%] ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {message.role === 'user' ? (
                    <Avatar className="h-8 w-8">
                      {user?.imageUrl ? (
                        <AvatarImage src={user.imageUrl} alt={user.firstName || 'ユーザー'} />
                      ) : (
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {user?.firstName?.[0] || 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  ) : (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-pink-100 text-pink-500">AI</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-lg px-4 py-3 ${
                      message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}
                  >
                    {message.role === 'assistant' ? (
                      <div className="text-sm prose-sm max-w-none prose-headings:my-2 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isSendingTypingIndicator && (
              <div className="flex justify-start">
                <div className="flex gap-3 max-w-[80%]">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-pink-100 text-pink-500">AI</AvatarFallback>
                  </Avatar>
                  <div className="rounded-lg px-4 py-3 bg-muted">
                    <div className="flex space-x-1 items-center h-5">
                      <div
                        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      ></div>
                      <div
                        className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                        style={{ animationDelay: '150ms' }}
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
        </ScrollArea>
      </CardContent>

      <Separator />

      {jsonData && (
        <div className="px-6 py-4 bg-muted/30 border-t">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium flex items-center">
                <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
                依頼内容の確認
              </h3>
              <Badge
                variant={jsonData.urgency === '急ぎ' ? 'destructive' : 'outline'}
                className={`px-3 py-1 ${jsonData.urgency === '急ぎ' ? 'bg-red-500' : ''}`}
              >
                {jsonData.urgency === '急ぎ' ? (
                  <AlertCircle className="mr-1 h-3 w-3" />
                ) : (
                  <Clock className="mr-1 h-3 w-3" />
                )}
                {jsonData.urgency}
              </Badge>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">タイトル</p>
                  <h4 className="text-base font-bold">{jsonData.title}</h4>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">カテゴリ</p>
                  <Badge variant="secondary" className="mt-1">
                    {jsonData.category}
                  </Badge>
                </div>

                <div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">詳細</p>
                    {jsonData.description.length > 150 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      >
                        {isDescriptionExpanded ? '折りたたむ' : 'もっと見る'}
                      </Button>
                    )}
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap">
                    {isDescriptionExpanded
                      ? jsonData.description
                      : getShortenedDescription(jsonData.description)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setJsonData(null)}>
                修正する
              </Button>
              <Button onClick={saveRequest} disabled={isSaving} className="min-w-[120px]">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '依頼を確定'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <CardFooter className="p-4 flex-col gap-2">
        <div className="w-full relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder="依頼内容を入力... (Shift + Enterで改行、Ctrl + Enterで送信)"
            className="min-h-[60px] max-h-[150px] pr-14 resize-none"
            disabled={isLoading || isSaving}
          />
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || isSaving || !input.trim()}
            size="icon"
            className="absolute right-2 bottom-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendIcon className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground text-right w-full">
          Shift + Enter: 改行　|　Ctrl + Enter: 送信
        </div>
      </CardFooter>
    </Card>
  )
}
