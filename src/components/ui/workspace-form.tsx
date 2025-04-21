"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Workspace, updateWorkspace, createWorkspace } from "@/app/actions/workspace"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"

// フォームのバリデーションスキーマ
const workspaceFormSchema = z.object({
  name: z.string().min(1, "ワークスペース名は必須です"),
  industry: z.string().min(1, "業種は必須です"),
  business_overview: z.string().optional(),
})

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>

interface WorkspaceFormProps {
  workspaces: Workspace[]
  currentWorkspace: Workspace
  onWorkspaceChange: (workspace: Workspace) => void
  onWorkspacesUpdate: (workspaces: Workspace[]) => void
}

export function WorkspaceForm({
  workspaces,
  currentWorkspace,
  onWorkspaceChange,
  onWorkspacesUpdate,
}: WorkspaceFormProps) {
  const { user } = useUser()
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 編集用フォーム
  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: {
      name: currentWorkspace.name,
      industry: currentWorkspace.industry,
      business_overview: currentWorkspace.business_overview || "",
    },
  })

  // 新規作成用フォーム
  const createForm = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: {
      name: "",
      industry: "",
      business_overview: "",
    },
  })

  // ワークスペース選択時の処理
  const handleWorkspaceSelect = (workspace: Workspace) => {
    onWorkspaceChange(workspace)
    form.reset({
      name: workspace.name,
      industry: workspace.industry,
      business_overview: workspace.business_overview || "",
    })
    setIsEditing(false)
  }

  // ワークスペース更新時の処理
  const onSubmit = async (data: WorkspaceFormValues) => {
    if (!user) return

    setIsSubmitting(true)
    try {
      const result = await updateWorkspace(
        currentWorkspace.id,
        {
          name: data.name,
          industry: data.industry,
          business_overview: data.business_overview,
        },
        user.id
      )

      if (result.success) {
        // 更新成功
        toast({
          title: "ワークスペースを更新しました",
          description: "ワークスペース情報が正常に更新されました",
        })

        // ワークスペース一覧を更新
        const updatedWorkspaces = workspaces.map(w => 
          w.id === currentWorkspace.id 
            ? { ...w, ...data } 
            : w
        )
        onWorkspacesUpdate(updatedWorkspaces)
        
        // 現在のワークスペースを更新
        const updatedWorkspace = { ...currentWorkspace, ...data }
        onWorkspaceChange(updatedWorkspace)
        
        setIsEditing(false)
      } else {
        // 更新失敗
        toast({
          title: "エラー",
          description: result.error || "ワークスペースの更新に失敗しました",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating workspace:", error)
      toast({
        title: "エラー",
        description: "ワークスペースの更新中にエラーが発生しました",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 新規ワークスペース作成時の処理
  const onCreateSubmit = async (data: WorkspaceFormValues) => {
    if (!user) return

    setIsSubmitting(true)
    try {
      const result = await createWorkspace(
        {
          workspace_name: data.name,
          industry: data.industry,
          business_overview: data.business_overview,
          urls: [],
          files: [],
        },
        user.id
      )

      if (result.success && result.workspaceId) {
        // 作成成功
        toast({
          title: "ワークスペースを作成しました",
          description: "新しいワークスペースが正常に作成されました",
        })

        // 新しいワークスペースオブジェクトを作成
        const newWorkspace: Workspace = {
          id: result.workspaceId,
          name: data.name,
          industry: data.industry,
          business_overview: data.business_overview || null,
          created_by: user.id,
          created_at: new Date().toISOString(),
        }

        // ワークスペース一覧を更新
        const updatedWorkspaces = [...workspaces, newWorkspace]
        onWorkspacesUpdate(updatedWorkspaces)
        
        // 新しいワークスペースを現在のワークスペースに設定
        onWorkspaceChange(newWorkspace)
        
        // フォームをリセット
        createForm.reset()
        setIsCreating(false)
      } else {
        // 作成失敗
        toast({
          title: "エラー",
          description: result.error || "ワークスペースの作成に失敗しました",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating workspace:", error)
      toast({
        title: "エラー",
        description: "ワークスペースの作成中にエラーが発生しました",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Tabs defaultValue="view">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="view">ワークスペース</TabsTrigger>
        <TabsTrigger value="create">新規作成</TabsTrigger>
      </TabsList>
      
      <TabsContent value="view" className="space-y-4 py-4">
        {/* ワークスペース一覧 */}
        {!isEditing && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">ワークスペース一覧</h3>
              <div className="grid gap-2">
                {workspaces.map((workspace) => (
                  <Button
                    key={workspace.id}
                    variant={workspace.id === currentWorkspace.id ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => handleWorkspaceSelect(workspace)}
                  >
                    {workspace.name}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* 現在のワークスペース情報 */}
            <div className="space-y-2 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">ワークスペース情報</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsEditing(true)}
                >
                  編集
                </Button>
              </div>
              
              <div className="rounded-md border p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">ワークスペース名</p>
                  <p>{currentWorkspace.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">業種</p>
                  <p>{currentWorkspace.industry}</p>
                </div>
                {currentWorkspace.business_overview && (
                  <div>
                    <p className="text-xs text-muted-foreground">事業概要</p>
                    <p>{currentWorkspace.business_overview}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* ワークスペース編集フォーム */}
        {isEditing && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">ワークスペース編集</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setIsEditing(false)
                  form.reset({
                    name: currentWorkspace.name,
                    industry: currentWorkspace.industry,
                    business_overview: currentWorkspace.business_overview || "",
                  })
                }}
              >
                キャンセル
              </Button>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ワークスペース名</FormLabel>
                      <FormControl>
                        <Input placeholder="ワークスペース名" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>業種</FormLabel>
                      <FormControl>
                        <Input placeholder="業種" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="business_overview"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>事業概要</FormLabel>
                      <FormControl>
                        <Input placeholder="事業概要（任意）" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "更新中..." : "更新する"}
                </Button>
              </form>
            </Form>
          </div>
        )}
      </TabsContent>
      
      <TabsContent value="create" className="space-y-4 py-4">
        <div className="space-y-4">
          <h3 className="text-sm font-medium">新規ワークスペース作成</h3>
          
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ワークスペース名</FormLabel>
                    <FormControl>
                      <Input placeholder="ワークスペース名" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createForm.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>業種</FormLabel>
                    <FormControl>
                      <Input placeholder="業種" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createForm.control}
                name="business_overview"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>事業概要</FormLabel>
                    <FormControl>
                      <Input placeholder="事業概要（任意）" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "作成中..." : "作成する"}
              </Button>
            </form>
          </Form>
        </div>
      </TabsContent>
    </Tabs>
  )
}
