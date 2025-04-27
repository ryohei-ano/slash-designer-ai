'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { formatDistanceToNow } from 'date-fns'
import { ja } from 'date-fns/locale'
import { AlertCircle, CheckCircle, Clock, Hourglass, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'

// タスクの型定義
export type Task = {
  id: number
  title: string
  description: string
  category: string
  urgency: string
  status: string
  created_at: string
  assignee?: {
    name: string
    image?: string
  }
}

// ステータスに対応するバッジの色とアイコン
export const getStatusBadge = (status: string) => {
  switch (status) {
    case '未着手':
      return {
        variant: 'outline' as const,
        icon: <Clock className="mr-1 h-3 w-3" />,
        label: '未着手',
      }
    case '進行中':
      return {
        variant: 'secondary' as const,
        icon: <Hourglass className="mr-1 h-3 w-3" />,
        label: '進行中',
      }
    case 'レビュー中':
      return {
        variant: 'default' as const,
        icon: <Clock className="mr-1 h-3 w-3" />,
        label: 'レビュー中',
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
export const getUrgencyBadge = (urgency: string) => {
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
export const getCategoryIcon = () => {
  return <FileText className="mr-1 h-3 w-3" />
}

interface TaskCardProps {
  task: Task
  index: number
  workspaceId: string
}

export function TaskCard({ task, index, workspaceId }: TaskCardProps) {
  const router = useRouter()
  const [isHovered, setIsHovered] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
    data: {
      index,
      task,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  }

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

  const statusBadge = getStatusBadge(task.status)
  const urgencyBadge = getUrgencyBadge(task.urgency)

  const handleClick = () => {
    router.push(`/workspace/${workspaceId}/tasks/${task.id}`)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="mb-3"
    >
      <Card
        className={`cursor-pointer transition-all ${
          isDragging ? 'shadow-lg' : isHovered ? 'shadow-md' : ''
        }`}
        onClick={handleClick}
      >
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
              {task.assignee && (
                <Avatar className="h-6 w-6">
                  {task.assignee.image ? (
                    <AvatarImage src={task.assignee.image} alt={task.assignee.name} />
                  ) : (
                    <AvatarFallback className="text-xs">{task.assignee.name[0]}</AvatarFallback>
                  )}
                </Avatar>
              )}
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>

            <div className="flex flex-wrap gap-1.5">
              <Badge variant={statusBadge.variant} className="flex items-center text-xs">
                {statusBadge.icon}
                {statusBadge.label}
              </Badge>

              {task.urgency === '急ぎ' && (
                <Badge variant={urgencyBadge.variant} className="flex items-center text-xs">
                  {urgencyBadge.icon}
                  {urgencyBadge.label}
                </Badge>
              )}

              <Badge variant="secondary" className="flex items-center text-xs">
                {getCategoryIcon()}
                {task.category}
              </Badge>
            </div>

            <div className="text-xs text-muted-foreground">{formatDate(task.created_at)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
