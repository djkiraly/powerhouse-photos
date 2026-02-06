// Middleware to protect routes
// Redirects unauthenticated users to login page

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') || 
                     req.nextUrl.pathname.startsWith('/signup');
  
  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }
  
  // Allow public share links through without auth
  const isPublicShare = /^\/[^/]+\/[^/]+$/.test(req.nextUrl.pathname)
    && req.nextUrl.searchParams.has('token');
  if (isPublicShare) return NextResponse.next();

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
