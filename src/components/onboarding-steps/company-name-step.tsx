import { useFormContext } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { OnboardingFormValues } from '../ui/onboarding-flow'

export default function CompanyNameStep() {
  const form = useFormContext<OnboardingFormValues>()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">会社情報</h2>
        <p className="text-muted-foreground">会社名を入力してください</p>
      </div>

      <FormField
        control={form.control}
        name="workspace_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>会社名</FormLabel>
            <FormControl>
              <Input placeholder="例: 株式会社サンプル" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
