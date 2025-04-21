'use client'

import { useState, useEffect } from 'react'
import { getUserTasks } from '@/app/actions/tasks'
import { useUser } from '@clerk/nextjs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  MoreHorizontal,
  Eye,
  Download,
  Clock,
  AlertCircle,
  CheckCircle,
  Hourglass,
  FileText,
} from 'lucide-react'

// タスクの型定義
type Task = {
  id: number
  title: string
  description: string
  category: string
  urgency: string
  status: string
  created_at: string
}

// ステータスに対応するバッジの色とアイコン
const getStatusBadge = (status: string) => {
  switch (status) {
    case '受付中':
      return {
        variant: 'outline' as const,
        icon: <Clock className="mr-1 h-3 w-3" />,
        label: '受付中',
      }
    case '作業中':
      return {
        variant: 'secondary' as const,
        icon: <Hourglass className="mr-1 h-3 w-3" />,
        label: '作業中',
      }
    case '完了':
      return {
        variant: 'default' as const,
        icon: <CheckCircle className="mr-1 h-3 w-3" />,
        label: '完了',
      }
    default:
      return {
        variant: 'outline' as const,
        icon: <Clock className="mr-1 h-3 w-3" />,
        label: status,
      }
  }
}

// 緊急度に対応するバッジ
const getUrgencyBadge = (urgency: string) => {
  return urgency === '急ぎ'
    ? {
        variant: 'destructive' as const,
        icon: <AlertCircle className="mr-1 h-3 w-3" />,
        label: '急ぎ',
      }
    : {
        variant: 'outline' as const,
        icon: <Clock className="mr-1 h-3 w-3" />,
        label: '通常',
      }
}

// カテゴリに対応するアイコン
const getCategoryIcon = () => {
  return <FileText className="mr-1 h-3 w-3" />
}

interface TasksTableProps {
  workspaceId?: string
}

export function TasksTable({ workspaceId }: TasksTableProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  useUser() // ユーザー認証状態を取得

  // タスクデータの取得（Server Actionを使用）
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true)

        // Server Actionからデータ取得
        const result = await getUserTasks(workspaceId)

        if (!result.success) {
          throw new Error(result.error || 'タスクの取得に失敗しました')
        }

        setTasks(result.tasks || [])
      } catch (error) {
        console.error('タスク取得エラー:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTasks()
  }, [workspaceId])

  // 日付のフォーマット
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ja,
      })
    } catch (error) {
      console.error('日付フォーマットエラー:', error)
      return '日付不明'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>デザイン依頼一覧</CardTitle>
        <CardDescription>過去のデザイン依頼履歴と現在の進捗状況を確認できます。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[8%]">ID</TableHead>
                <TableHead className="w-[30%]">タイトル</TableHead>
                <TableHead className="w-[12%]">カテゴリ</TableHead>
                <TableHead className="w-[12%]">ステータス</TableHead>
                <TableHead className="w-[10%]">緊急度</TableHead>
                <TableHead className="w-[16%]">依頼日</TableHead>
                <TableHead className="w-[12%] text-right">アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // ローディング中のスケルトン表示
                Array(3)
                  .fill(0)
                  .map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell>
                        <Skeleton className="h-5 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8 rounded-full float-right" />
                      </TableCell>
                    </TableRow>
                  ))
              ) : tasks.length > 0 ? (
                // タスク一覧
                tasks.map((task) => {
                  const statusBadge = getStatusBadge(task.status)
                  const urgencyBadge = getUrgencyBadge(task.urgency)

                  return (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">#{task.id}</TableCell>
                      <TableCell>
                        <div className="font-medium break-words">{task.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2 break-words">
                          {task.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="flex items-center w-fit">
                          {getCategoryIcon()}
                          {task.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant} className="flex items-center w-fit">
                          {statusBadge.icon}
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={urgencyBadge.variant} className="flex items-center w-fit">
                          {urgencyBadge.icon}
                          {urgencyBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(task.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">メニューを開く</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>アクション</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() =>
                                (window.location.href = `/workspace/${workspaceId}/tasks/${task.id}`)
                              }
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              詳細を表示
                            </DropdownMenuItem>
                            {task.status === '完了' && (
                              <DropdownMenuItem>
                                <Download className="mr-2 h-4 w-4" />
                                成果物をダウンロード
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                // データが空の場合
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    依頼されたタスクはありません。
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
