import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Redirect to login after clearing cookies instead of returning JSON
  const redirectUrl = new URL("/login", req.url);
  const res = NextResponse.redirect(redirectUrl, 302);
  res.cookies.set("uid", "", { expires: new Date(0), path: "/" });
  res.cookies.set("uem", "", { expires: new Date(0), path: "/" });
  return res;
}
