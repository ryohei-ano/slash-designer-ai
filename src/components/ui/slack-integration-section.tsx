'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { getSlackIntegration, deleteSlackIntegration } from '@/app/actions/slack-integration'
import { Loader2, CheckCircle, AlertCircle, Trash2, Link } from 'lucide-react'

interface SlackIntegration {
  id: string
  slack_team_id: string
  slack_team_name: string
  updated_at: string
  created_at: string
}

interface SlackIntegrationSectionProps {
  workspaceId: string
}

export default function SlackIntegrationSection({ workspaceId }: SlackIntegrationSectionProps) {
  const [integration, setIntegration] = useState<SlackIntegration | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  // 連携情報を取得
  useEffect(() => {
    const fetchIntegration = async () => {
      try {
        setIsLoading(true)
        const result = await getSlackIntegration(workspaceId)

        if (result.success) {
          setIntegration(result.integration)
        } else {
          console.error('Slack連携情報取得エラー:', result.error)
          toast({
            title: 'エラーが発生しました',
            description: result.error,
            variant: 'destructive',
          })
        }
      } catch (error) {
        console.error('Slack連携情報取得エラー:', error)
        toast({
          title: 'エラーが発生しました',
          description: error instanceof Error ? error.message : '不明なエラー',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchIntegration()
  }, [workspaceId, toast])

  // Slack連携を開始
  const handleConnect = () => {
    // ワークスペースIDをBase64エンコードしてstateパラメータに設定
    const state = Buffer.from(JSON.stringify({ workspaceId })).toString('base64')

    // Slack OAuth認証URLを構築
    const clientId = process.env.NEXT_PUBLIC_SLACK_CLIENT_ID
    const redirectUri = `${window.location.origin}/api/slack/oauth`
    const scope = 'commands,chat:write,channels:history'

    const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

    // 新しいウィンドウでSlack認証ページを開く
    window.location.href = authUrl
  }

  // Slack連携を解除
  const handleDisconnect = async () => {
    try {
      setIsDeleting(true)

      const result = await deleteSlackIntegration(workspaceId)

      if (result.success) {
        setIntegration(null)
        toast({
          title: 'Slack連携を解除しました',
          description: 'Slackとの連携を解除しました。',
        })
      } else {
        console.error('Slack連携解除エラー:', result.error)
        toast({
          title: 'エラーが発生しました',
          description: result.error,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Slack連携解除エラー:', error)
      toast({
        title: 'エラーが発生しました',
        description: error instanceof Error ? error.message : '不明なエラー',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <svg
            className="mr-2 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5.8 11.3 2 22l10.7-3.79" />
            <path d="M4 3h.01" />
            <path d="M22 8h.01" />
            <path d="M15 2h.01" />
            <path d="M22 20h.01" />
            <path d="m22 2-17 7 10 5 7-16" />
          </svg>
          Slack連携
        </CardTitle>
        <CardDescription>
          Slackとの連携を設定すると、Slackから直接デザイン依頼を作成できます。
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : integration ? (
          <div className="space-y-4">
            <div className="flex items-center">
              <Badge variant="default" className="mr-2 bg-green-500">
                <CheckCircle className="mr-1 h-3 w-3" />
                連携済み
              </Badge>
              <span className="text-sm text-muted-foreground">
                {new Date(integration.updated_at).toLocaleString('ja-JP')}に連携
              </span>
            </div>

            <div className="rounded-md bg-muted p-4">
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Slackワークスペース:</span>
                  <span className="ml-2">{integration.slack_team_name}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">チームID:</span>
                  <span className="ml-2 font-mono text-xs">{integration.slack_team_id}</span>
                </div>
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground">
                    Slackで <code>/designer バナー作りたい</code> のように入力するだけで、
                    このワークスペースにデザイン依頼を作成できます。
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center">
              <Badge variant="outline" className="mr-2">
                <AlertCircle className="mr-1 h-3 w-3" />
                未連携
              </Badge>
            </div>

            <div className="rounded-md bg-muted p-4">
              <p className="text-sm text-muted-foreground">
                Slackと連携すると、Slackから直接デザイン依頼を作成できます。
                「Slackと連携する」ボタンをクリックして、連携を開始してください。
              </p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-end space-x-2">
        {integration ? (
          <Button variant="destructive" onClick={handleDisconnect} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                解除中...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                連携を解除
              </>
            )}
          </Button>
        ) : (
          <Button onClick={handleConnect}>
            <Link className="mr-2 h-4 w-4" />
            Slackと連携する
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
