import { useFormContext } from "react-hook-form"
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { OnboardingFormValues } from "../ui/onboarding-flow"

export default function BusinessOverviewStep() {
  const form = useFormContext<OnboardingFormValues>()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">事業概要</h2>
        <p className="text-muted-foreground">あなたの事業について簡単に説明してください</p>
      </div>

      <FormField
        control={form.control}
        name="business_overview"
        render={({ field }) => (
          <FormItem>
            <FormLabel>事業概要</FormLabel>
            <FormControl>
              <Textarea
                placeholder="あなたの事業の概要を300文字以内で入力してください。例: 当社は、クラウドベースの顧客管理システムを提供しています。中小企業向けに特化したサービスで、簡単な操作性と高度な分析機能を兼ね備えています。"
                className="min-h-[150px]"
                {...field}
              />
            </FormControl>
            <FormDescription>{field.value?.length || 0}/300文字</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
