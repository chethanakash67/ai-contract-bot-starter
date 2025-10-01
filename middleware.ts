import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Allow public share pages and APIs
  if (pathname.startsWith("/share/") || pathname.startsWith("/api/share/")) {
    return NextResponse.next();
  }
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  const uid = req.cookies.get("uid")?.value;
  if (!uid) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|static|favicon.ico).*)"],
};

