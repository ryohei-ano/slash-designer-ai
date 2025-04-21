"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, FormProvider } from "react-hook-form"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import CompanyNameStep from "../onboarding-steps/company-name-step"
import IndustryStep from "../onboarding-steps/industry-step"
import BusinessOverviewStep from "../onboarding-steps/business-overview-step"
import WebsiteUrlsStep from "../onboarding-steps/website-urls-step"
import FileUploadStep from "../onboarding-steps/file-upload-step"
import ConfirmationStep from "../onboarding-steps/confirmation-step"
import { createWorkspace } from "@/app/actions/workspace"

// Define the form schema
const formSchema = z.object({
  workspace_name: z.string().min(1, { message: "会社名を入力してください" }),
  industry: z.string().min(1, { message: "業種を選択してください" }),
  business_overview: z.string().max(300, { message: "300文字以内で入力してください" }).optional(),
  urls: z
    .array(
      z.object({
        url: z.string().url({ message: "有効なURLを入力してください" }),
      }),
    )
    .optional(),
  files: z.array(z.any()).optional(),
})

export type OnboardingFormValues = z.infer<typeof formSchema>

interface OnboardingFlowProps {
  userId: string
}

export default function OnboardingFlow({ userId }: OnboardingFlowProps) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const totalSteps = 6
  const router = useRouter()
  const { toast } = useToast()

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workspace_name: "",
      industry: "",
      business_overview: "",
      urls: [{ url: "https://" }],
      files: [],
    },
  })

  const { handleSubmit, trigger } = form

  const nextStep = async () => {
    // Validate the current step before proceeding
    const fieldsToValidate = {
      1: ["workspace_name"] as const,
      2: ["industry"] as const,
      3: ["business_overview"] as const,
      4: ["urls"] as const,
      5: ["files"] as const,
    }

    const isValid = await trigger(fieldsToValidate[step as keyof typeof fieldsToValidate])
    if (isValid) {
      setStep((prev) => Math.min(prev + 1, totalSteps))
      // Clear any error when successfully moving to next step
      setError(null);
    }
  }

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1))
  }

  const onSubmit = async (data: OnboardingFormValues) => {
    // Only submit if we're on the confirmation step
    if (step !== totalSteps) {
      // If not on confirmation step, just move to the next step
      nextStep();
      return;
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Submit data via server action
      const result = await createWorkspace(data, userId)

      if (result.success) {
        toast({
          title: "ワークスペースを作成しました",
          description: "ダッシュボードに移動します",
        })

        // Redirect to workspace with new URL structure
        router.push(`/workspace/${result.workspaceId}/designer`)
      } else {
        setError(result.error || "ワークスペースの作成に失敗しました")
        toast({
          variant: "destructive",
          title: "エラーが発生しました",
          description: result.error || "ワークスペースの作成に失敗しました",
        })
        setIsSubmitting(false)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "ワークスペースの作成に失敗しました"
      setError(errorMessage)
      console.error("Error submitting form:", error)
      toast({
        variant: "destructive",
        title: "エラーが発生しました",
        description: errorMessage,
      })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      {/* Progress bar - 上部に固定、ボーダーなし */}
      <div className="px-4 py-6 fixed top-0 left-0 right-0 bg-white z-10">
        <div className="max-w-md mx-auto">
          <Progress value={(step / totalSteps) * 100} className="h-2" />
          <div className="mt-2 text-sm text-muted-foreground">
            ステップ {step} / {totalSteps}
          </div>
        </div>
      </div>

      {/* Form content - プログレスバーの下に表示 */}
      <div className="flex-1 overflow-auto flex items-center justify-center pt-20">
        <div className="max-w-md w-full px-4 py-8">
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FormProvider {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {step === 1 && <CompanyNameStep />}
              {step === 2 && <IndustryStep />}
              {step === 3 && <BusinessOverviewStep />}
              {step === 4 && <WebsiteUrlsStep />}
              {step === 5 && <FileUploadStep />}
              {step === 6 && <ConfirmationStep isSubmitting={isSubmitting} />}

              {/* Navigation buttons */}
              <div className="flex justify-between pt-6">
                {step > 1 ? (
                  <Button type="button" variant="outline" onClick={prevStep}>
                    戻る
                  </Button>
                ) : (
                  <div></div>
                )}

                {step < totalSteps ? (
                  <Button type="button" onClick={nextStep}>
                    次へ
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "送信中..." : "この内容で作成"}
                  </Button>
                )}
              </div>
            </form>
          </FormProvider>
        </div>
      </div>
    </div>
  )
}
