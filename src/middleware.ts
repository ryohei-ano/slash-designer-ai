import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// カスタムミドルウェア関数とClerkのミドルウェアを組み合わせる
function customMiddleware(req: NextRequest) {
  const { nextUrl } = req;
  const path = nextUrl.pathname;

  // /signin を /sign-in にリダイレクト
  if (path === "/signin") {
    return NextResponse.redirect(new URL("/sign-in", nextUrl.origin));
  }

  // /signup を /sign-up にリダイレクト
  if (path === "/signup") {
    return NextResponse.redirect(new URL("/sign-up", nextUrl.origin));
  }

  // 次のミドルウェアに進む
  return NextResponse.next();
}

// Clerkのミドルウェアを適用
export default clerkMiddleware((auth, req) => {
  // カスタムミドルウェアを適用
  const customResponse = customMiddleware(req);
  if (customResponse) {
    return customResponse;
  }

  // 公開ルートの場合は認証をスキップ
  const path = req.nextUrl.pathname;
  if (
    path === "/" || 
    path.startsWith("/sign-in") || 
    path.startsWith("/sign-up") || 
    path === "/signin" || 
    path === "/signup" || 
    path.startsWith("/api/") ||
    path === "/api/stripe/webhook"
  ) {
    return NextResponse.next();
  }
});

// Clerkのミドルウェアが使用するマッチャー設定
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    '/dashboard(.*)',
    '/workspace(.*)',
    '/plan(.*)',
    '/signin',
    '/signup',
    '/sign-in(.*)',
    '/sign-up(.*)',
  ],
};
