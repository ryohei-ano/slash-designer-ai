'use client'

import { useFormContext } from 'react-hook-form'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OnboardingFormValues } from '../ui/onboarding-flow'

export default function IndustryStep() {
  const form = useFormContext<OnboardingFormValues>()

  const industries = [
    { value: 'saas', label: 'SaaS' },
    { value: 'ec', label: 'EC' },
    { value: 'education', label: '教育' },
    { value: 'real_estate', label: '不動産' },
    { value: 'finance', label: '金融' },
    { value: 'healthcare', label: 'ヘルスケア' },
    { value: 'manufacturing', label: '製造業' },
    { value: 'other', label: 'その他' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">業種</h2>
        <p className="text-muted-foreground">あなたの会社の業種を選択してください</p>
      </div>

      <FormField
        control={form.control}
        name="industry"
        render={({ field }) => (
          <FormItem>
            <FormLabel>業種／カテゴリ</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="業種を選択してください" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {industries.map((industry) => (
                  <SelectItem key={industry.value} value={industry.value}>
                    {industry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
