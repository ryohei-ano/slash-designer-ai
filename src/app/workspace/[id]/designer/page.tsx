import { Metadata } from 'next'
import DesignChat from '@/components/ui/design-chat'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'デザイン依頼 | ワークスペース',
  description: 'AIアシスタントにデザイン依頼を行えます。',
}

export default async function DesignerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: _id } = await params

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-[900] tracking-tight">デザイン依頼</h1>
        <p className="text-muted-foreground">
          AIアシスタントにデザインの依頼内容を伝えてください。詳細な情報を伝えるほど、より正確なデザインが作成できます。
        </p>
      </div>

      <DesignChat />
      <Toaster />
    </div>
  )
}
