'use client'

import React from 'react'
import { useFormContext, useFieldArray } from 'react-hook-form'
import { FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { PlusCircle, X } from 'lucide-react'
import { OnboardingFormValues } from '../ui/onboarding-flow'

export default function WebsiteUrlsStep() {
  const form = useFormContext<OnboardingFormValues>()

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'urls',
  })

  // Ensure the first field has https:// if it's empty
  React.useEffect(() => {
    const firstField = fields[0]
    if (firstField && !firstField.url) {
      form.setValue(`urls.0.url`, 'https://')
    }
  }, [fields, form])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">ウェブサイト・SNS</h2>
        <p className="text-muted-foreground">
          ウェブサイトやSNS、採用ページのURLを入力してください
        </p>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2">
            <FormField
              control={form.control}
              name={`urls.${index}.url`}
              render={({ field }) => {
                // Ensure the value always starts with https://
                const ensureHttps = (value: string) => {
                  if (!value) return 'https://'
                  if (!value.startsWith('https://')) {
                    return 'https://' + value.replace(/^https?:\/\//, '')
                  }
                  return value
                }

                const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = ensureHttps(e.target.value)
                  field.onChange(value)
                }

                const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
                  const value = ensureHttps(e.target.value)
                  field.onChange(value)
                  field.onBlur()
                }

                return (
                  <FormItem className="flex-1">
                    <FormControl>
                      <div className="flex items-center border border-input rounded-md overflow-hidden">
                        <div className="bg-muted px-2 p-1 ml-1 text-sm rounded-sm text-muted-foreground">
                          https://
                        </div>
                        <Input
                          className="border-0 pl-2 focus-visible:ring-0 focus-visible:border-0"
                          placeholder="example.com"
                          value={field.value.replace(/^https:\/\//, '')}
                          onChange={(e) => {
                            field.onChange('https://' + e.target.value.replace(/^https?:\/\//, ''))
                          }}
                          onBlur={handleBlur}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
            {index > 0 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2"
        onClick={() => append({ url: 'https://' })}
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        URLを追加
      </Button>
    </div>
  )
}
