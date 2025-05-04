import { NextRequest, NextResponse } from "next/server";

const publicRoutes = ["/", "/sign-in", "/sign-up", "/blog"];

export default function middleware(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value;
  const isAuth = !!sessionCookie;
  const { pathname } = req.nextUrl;

  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!isAuth && !isPublicRoute) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static/|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.webp$|.*\\.svg$|.*\\.gif$).*)",
  ],
};
