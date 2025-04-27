import { type Metadata } from 'next'
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import { jaJP } from '@clerk/localizations'
import Image from 'next/image'
import Link from 'next/link'
import { Noto_Sans_JP, Geist_Mono } from 'next/font/google'
import './globals.css'
import { SignUpReloader } from '@/components/ui/SignUpReloader'
import { Toaster } from '@/components/ui/toaster'
import { Button } from '@/components/ui/button'
import { ActiveWorkspaceTracker } from '@/components/ui/conditional-header-components'

const notoSansJP = Noto_Sans_JP({
  variable: '--font-noto-sans-jp',
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: '/designer（スラッシュデザイナー） | コマンド1つで、デザインを依頼',
  description:
    'コマンド1つで、デザインを依頼できるサービスです。AIがあなたのデザインをサポートします。',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider localization={jaJP}>
      <html lang="jp">
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.ENV = {
                  SLACK_CLIENT_ID: "${process.env.NEXT_PUBLIC_SLACK_CLIENT_ID}"
                };
              `,
            }}
          />
        </head>
        <body className={`${notoSansJP.variable} ${geistMono.variable} antialiased font-sans`}>
          <header className="bg-white w-full fixed flex items-center p-4 gap-4 h-16 z-50">
            <div className="flex items-center gap-2">
              <SignedIn>
                <Link href="/workspace" className="flex items-center gap-2">
                  <Image src="/logo.png" alt="Logo" width={100} height={40} />
                </Link>
              </SignedIn>
              <SignedOut>
                <Link href="/" className="flex items-center gap-2">
                  <Image src="/logo.png" alt="Logo" width={100} height={40} />
                </Link>
              </SignedOut>
            </div>
            <div className="flex-1" />
            <SignedOut>
              <SignInButton>
                <Button asChild variant="outline">
                  <Link href="/sign-in">ログイン</Link>
                </Button>
              </SignInButton>
              <SignUpButton>
                <Button asChild>
                  <Link href="/sign-up">新規登録</Link>
                </Button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </header>
          <SignUpReloader />
          <ActiveWorkspaceTracker />
          <Toaster />
          <div className="mx-auto max-w-[980px]">{children}</div>
        </body>
      </html>
    </ClerkProvider>
  )
}
