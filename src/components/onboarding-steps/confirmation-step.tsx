import { useFormContext } from 'react-hook-form'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { OnboardingFormValues } from '../ui/onboarding-flow'

interface ConfirmationStepProps {
  isSubmitting: boolean
}

export default function ConfirmationStep({ isSubmitting }: ConfirmationStepProps) {
  const form = useFormContext<OnboardingFormValues>()
  const { workspace_name, industry, business_overview, urls, files } = form.getValues()

  // Map industry value to label
  const industryMap: Record<string, string> = {
    saas: 'SaaS',
    ec: 'EC',
    education: '教育',
    real_estate: '不動産',
    finance: '金融',
    healthcare: 'ヘルスケア',
    manufacturing: '製造業',
    other: 'その他',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">確認</h2>
        <p className="text-muted-foreground">入力内容を確認してください</p>
      </div>

      <Alert className="bg-blue-50 border-blue-200">
        <CheckCircle className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-blue-700">
          以下の内容を確認してください。問題がなければ「この内容で作成」ボタンをクリックしてワークスペースを作成します。
        </AlertDescription>
      </Alert>

      {isSubmitting && (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">送信中...</p>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-6 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">会社名</h3>
            <p>{workspace_name}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-muted-foreground">業種／カテゴリ</h3>
            <p>{industryMap[industry] || industry}</p>
          </div>

          {business_overview && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">事業概要</h3>
              <p className="whitespace-pre-wrap">{business_overview}</p>
            </div>
          )}

          {urls && urls.length > 0 && urls[0].url && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">ウェブサイト・SNS</h3>
              <ul className="list-disc list-inside">
                {urls.map(
                  (item, index) =>
                    item.url && (
                      <li key={index}>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {item.url}
                        </a>
                      </li>
                    )
                )}
              </ul>
            </div>
          )}

          {files && files.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">
                アップロードされたファイル
              </h3>
              <ul className="list-disc list-inside">
                {files.map((file: File, index) => (
                  <li key={index}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        <p>※ ワークスペースの作成者は自動的に管理者（admin）として登録されます。</p>
      </div>
    </div>
  )
}
