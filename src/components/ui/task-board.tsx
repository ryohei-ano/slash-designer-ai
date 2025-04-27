'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getUserTasks } from '@/app/actions/tasks'
import { useUser } from '@clerk/nextjs'
import { TaskCard, Task } from './task-card'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove as _arrayMove,
} from '@dnd-kit/sortable'
import { createPortal } from 'react-dom'

// タスクの状態の型定義
type TaskStatus = '未着手' | '進行中' | 'レビュー中' | '完了'

// カラムの定義
const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: '未着手', title: '未着手' },
  { id: '進行中', title: '進行中' },
  { id: 'レビュー中', title: 'レビュー中' },
  { id: '完了', title: '完了' },
]

interface TaskBoardProps {
  workspaceId: string
}

export function TaskBoard({ workspaceId }: TaskBoardProps) {
  const { user: _user } = useUser()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  // DnDセンサーの設定
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // 8px動かすとドラッグ開始
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // タッチデバイスでは200ms長押しでドラッグ開始
        tolerance: 5, // 5px以内の移動はドラッグとみなさない
      },
    })
  )

  // タスクデータの取得
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true)
        const result = await getUserTasks(workspaceId)

        if (!result.success) {
          throw new Error(result.error || 'タスクの取得に失敗しました')
        }

        // APIから取得したデータを変換
        // 現在のAPIでは「受付中」というステータスがあるため、「未着手」に変換
        const formattedTasks = result.tasks?.map((task) => ({
          ...task,
          status: task.status === '受付中' ? '未着手' : task.status,
        })) as Task[]

        setTasks(formattedTasks || [])
      } catch (error) {
        console.error('タスク取得エラー:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (workspaceId) {
      fetchTasks()
    }
  }, [workspaceId])

  // 新規タスク追加ページへ遷移
  const handleAddTask = () => {
    router.push(`/workspace/${workspaceId}/chat`)
  }

  // ドラッグ開始時の処理
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const taskId = active.id.toString().replace('task-', '')
    const draggedTask = tasks.find((task) => task.id.toString() === taskId)

    if (draggedTask) {
      setActiveTask(draggedTask)
    }
  }

  // ドラッグ終了時の処理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveTask(null)
      return
    }

    // ドラッグ元のタスクID
    const activeId = active.id.toString()
    const taskId = activeId.replace('task-', '')

    // ドロップ先のカラムID
    const overId = over.id.toString()

    // カラムへのドロップの場合
    if (overId.startsWith('column-')) {
      const newStatus = overId.replace('column-', '') as TaskStatus

      // タスクのステータスを更新
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id.toString() === taskId ? { ...task, status: newStatus } : task
        )
      )

      // TODO: APIを呼び出してサーバー側でもステータスを更新
      // updateTaskStatus(taskId, newStatus)
    }

    setActiveTask(null)
  }

  // 各カラムのタスクをフィルタリング
  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">タスク</h2>
        <Button onClick={handleAddTask} className="gap-1">
          <Plus className="h-4 w-4" />
          新規タスク
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {COLUMNS.map((column) => {
            const columnTasks = getTasksByStatus(column.id)
            return (
              <Card
                key={column.id}
                id={`column-${column.id}`}
                className="h-[calc(100vh-16rem)] flex flex-col"
              >
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    {column.title}
                    <span className="bg-muted text-muted-foreground text-xs rounded-full px-2 py-0.5">
                      {columnTasks.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-2">
                  <SortableContext
                    id={`column-${column.id}`}
                    items={columnTasks.map((task) => `task-${task.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {isLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-24 bg-muted animate-pulse rounded-md"></div>
                        ))}
                      </div>
                    ) : columnTasks.length > 0 ? (
                      columnTasks.map((task, index) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          index={index}
                          workspaceId={workspaceId}
                        />
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-24 border border-dashed rounded-md">
                        <p className="text-sm text-muted-foreground">タスクなし</p>
                      </div>
                    )}
                  </SortableContext>
                </CardContent>
              </Card>
            )
          })}

          {typeof document !== 'undefined' &&
            activeTask &&
            createPortal(
              <DragOverlay>
                {activeTask && (
                  <div className="w-[calc(100vw/5)]">
                    <TaskCard task={activeTask} index={-1} workspaceId={workspaceId} />
                  </div>
                )}
              </DragOverlay>,
              document.body
            )}
        </DndContext>
      </div>
    </div>
  )
}
