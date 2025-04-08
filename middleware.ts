import { NextRequest, NextResponse } from "next/server";

const publicRoutes = ["/", "/sign-in", "/sign-up"];

export default function middleware(req: NextRequest) {
  const sessionCookie = req.cookies.get("session")?.value;

  const isAuth = !!sessionCookie;
  const isPublicRoute = publicRoutes.includes(req.nextUrl.pathname);

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
