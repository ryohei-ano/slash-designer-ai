'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Workspace } from '@/app/actions/workspace'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { useUser } from '@clerk/nextjs'

interface WorkspaceSelectionPageProps {
  workspaces: Workspace[]
  error?: string
}

export default function WorkspaceSelectionPage({ workspaces, error }: WorkspaceSelectionPageProps) {
  const router = useRouter()
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { user: _user } = useUser()
  const { clearAllChats } = useChatStore()

  const handleWorkspaceSelect = (workspaceId: string) => {
    setSelectedWorkspace(workspaceId)
  }

  const handleContinue = () => {
    if (!selectedWorkspace) return

    setIsLoading(true)

    // チャットデータをクリア
    clearAllChats()

    // 選択したワークスペースをローカルストレージに保存（次回のために）
    localStorage.setItem('lastSelectedWorkspace', selectedWorkspace)

    // 選択したワークスペースのダッシュボードにリダイレクト
    router.push(`/workspace/${selectedWorkspace}/designer`)
  }

  const handleCreateNew = () => {
    router.push('/onboarding')
  }

  return (
    <div className="container max-w-4xl mx-auto py-16 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">ワークスペースを選択</h1>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {workspaces.map((workspace) => (
          <Card
            key={workspace.id}
            className={`cursor-pointer transition-all ${
              selectedWorkspace === workspace.id
                ? 'border-primary ring-2 ring-primary'
                : 'hover:border-gray-300'
            }`}
            onClick={() => handleWorkspaceSelect(workspace.id)}
          >
            <CardHeader>
              <CardTitle>{workspace.name}</CardTitle>
              <CardDescription>{workspace.industry}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {workspace.business_overview || '詳細情報なし'}
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <p className="text-xs text-muted-foreground">
                作成日: {new Date(workspace.created_at).toLocaleDateString()}
              </p>
              {selectedWorkspace === workspace.id && (
                <div className="w-3 h-3 rounded-full bg-primary"></div>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="outline" onClick={handleCreateNew}>
          新規ワークスペース作成
        </Button>
        <Button onClick={handleContinue} disabled={!selectedWorkspace || isLoading}>
          {isLoading ? '読み込み中...' : '選択したワークスペースに進む'}
        </Button>
      </div>
    </div>
  )
}
