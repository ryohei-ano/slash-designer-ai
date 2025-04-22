import { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { getTaskById } from '@/app/actions/tasks'
import { Toaster } from '@/components/ui/toaster'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  CheckCircle,
  Hourglass,
  FileText,
  Calendar,
  Download,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ja } from 'date-fns/locale'

export const metadata: Metadata = {
  title: 'タスク詳細 | ワークスペース',
  description: 'デザイン依頼の詳細情報を確認できます。',
}

// ステータスに対応するバッジの色とアイコン
const getStatusBadge = (status: string) => {
  switch (status) {
    case '受付中':
      return {
        variant: 'outline' as const,
        icon: <Clock className="mr-1 h-4 w-4" />,
        label: '受付中',
      }
    case '作業中':
      return {
        variant: 'secondary' as const,
        icon: <Hourglass className="mr-1 h-4 w-4" />,
        label: '作業中',
      }
    case '完了':
      return {
        variant: 'default' as const,
        icon: <CheckCircle className="mr-1 h-4 w-4" />,
        label: '完了',
      }
    default:
      return {
        variant: 'outline' as const,
        icon: <Clock className="mr-1 h-4 w-4" />,
        label: status,
      }
  }
}

// 緊急度に対応するバッジ
const getUrgencyBadge = (urgency: string) => {
  return urgency === '急ぎ'
    ? {
        variant: 'destructive' as const,
        icon: <AlertCircle className="mr-1 h-4 w-4" />,
        label: '急ぎ',
      }
    : {
        variant: 'outline' as const,
        icon: <Clock className="mr-1 h-4 w-4" />,
        label: '通常',
      }
}

// カテゴリに対応するアイコン
const getCategoryIcon = () => {
  return <FileText className="mr-1 h-4 w-4" />
}

// 日付のフォーマット
const formatDate = (dateString: string) => {
  try {
    const date = new Date(dateString)
    return {
      relative: formatDistanceToNow(date, {
        addSuffix: true,
        locale: ja,
      }),
      full: format(date, 'yyyy年MM月dd日 HH:mm', { locale: ja }),
    }
  } catch (error) {
    console.error('日付フォーマットエラー:', error)
    return {
      relative: '日付不明',
      full: '日付不明',
    }
  }
}

// このページはダイナミックレンダリングを使用
export const dynamic = 'force-dynamic'
// キャッシュを無効化
export const revalidate = 0

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>
}) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const { id: workspaceId, taskId: taskIdStr } = await params

  // デバッグログ
  console.log('ページパラメータ:', { workspaceId, taskIdStr })

  // 数値に変換
  const taskId = parseInt(taskIdStr, 10)

  if (isNaN(taskId)) {
    console.log('タスクIDが数値ではありません')
    notFound()
  }

  // デバッグログ
  console.log('変換後のタスクID:', taskId)

  try {
    // サーバーアクションを呼び出す前にキャッチブロックで囲む
    const result = await getTaskById(taskId, workspaceId)
    console.log('getTaskById結果:', result)

    if (!result.success || !result.task) {
      console.log('タスクが見つかりませんでした')
      notFound()
    }

    const task = result.task
    const statusBadge = getStatusBadge(task.status)
    const urgencyBadge = getUrgencyBadge(task.urgency)
    const formattedDate = formatDate(task.created_at)

    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/workspace/${workspaceId}/tasks`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              タスク一覧に戻る
            </Link>
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-[900] tracking-tight">タスク詳細</h1>
          <p className="text-muted-foreground">デザイン依頼の詳細情報を確認できます。</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge variant={statusBadge.variant} className="flex items-center">
                  {statusBadge.icon}
                  {statusBadge.label}
                </Badge>
                <Badge variant={urgencyBadge.variant} className="flex items-center">
                  {urgencyBadge.icon}
                  {urgencyBadge.label}
                </Badge>
              </div>
              <CardTitle className="text-2xl">{task.title}</CardTitle>
              <CardDescription>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span title={formattedDate.full}>{formattedDate.relative}</span>
                </div>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">依頼内容</h3>
              <div className="whitespace-pre-wrap bg-muted p-4 rounded-md">{task.description}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">基本情報</h3>
                <div className="space-y-2">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">ID</span>
                    <span className="font-medium">#{task.id}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">カテゴリ</span>
                    <Badge variant="secondary" className="flex items-center">
                      {getCategoryIcon()}
                      {task.category}
                    </Badge>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">ステータス</span>
                    <Badge variant={statusBadge.variant} className="flex items-center">
                      {statusBadge.icon}
                      {statusBadge.label}
                    </Badge>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">緊急度</span>
                    <Badge variant={urgencyBadge.variant} className="flex items-center">
                      {urgencyBadge.icon}
                      {urgencyBadge.label}
                    </Badge>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="text-muted-foreground">依頼日時</span>
                    <span className="font-medium">{formattedDate.full}</span>
                  </div>
                </div>
              </div>

              {task.status === '完了' && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">成果物</h3>
                  <Button className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    成果物をダウンロード
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Toaster />
      </div>
    )
  } catch (error) {
    console.error('タスク詳細ページエラー:', error)
    notFound()
  }
}
