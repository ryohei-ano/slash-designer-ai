"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Workspace, updateWorkspace } from "@/app/actions/workspace"
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
import { toast } from "@/components/ui/use-toast"

// フォームのバリデーションスキーマ
const workspaceFormSchema = z.object({
  name: z.string().min(1, "ワークスペース名は必須です"),
  industry: z.string().min(1, "業種は必須です"),
  business_overview: z.string().optional(),
})

type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>

interface WorkspaceEditFormProps {
  workspace: Workspace
  onWorkspaceUpdate: (workspace: Workspace) => void
}

export function WorkspaceEditForm({
  workspace,
  onWorkspaceUpdate,
}: WorkspaceEditFormProps) {
  const { user } = useUser()
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 編集用フォーム
  const form = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceFormSchema),
    defaultValues: {
      name: workspace.name,
      industry: workspace.industry,
      business_overview: workspace.business_overview || "",
    },
  })

  // ワークスペース更新時の処理
  const onSubmit = async (data: WorkspaceFormValues) => {
    if (!user) return

    setIsSubmitting(true)
    try {
      const result = await updateWorkspace(
        workspace.id,
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

        // 現在のワークスペースを更新
        const updatedWorkspace = { ...workspace, ...data }
        onWorkspaceUpdate(updatedWorkspace)
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

  return (
    <div className="space-y-4">
      <div className="space-y-2 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">ワークスペース情報</h3>
          {!isEditing && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditing(true)}
            >
              編集
            </Button>
          )}
        </div>
        
        {!isEditing ? (
          // 表示モード
          <div className="rounded-md border p-4 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">ワークスペース名</p>
              <p>{workspace.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">業種</p>
              <p>{workspace.industry}</p>
            </div>
            {workspace.business_overview && (
              <div>
                <p className="text-xs text-muted-foreground">事業概要</p>
                <p>{workspace.business_overview}</p>
              </div>
            )}
          </div>
        ) : (
          // 編集モード
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
              
              <div className="flex justify-between">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditing(false)
                    form.reset({
                      name: workspace.name,
                      industry: workspace.industry,
                      business_overview: workspace.business_overview || "",
                    })
                  }}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "更新中..." : "更新する"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>
    </div>
  )
}
