import { NextRequest, NextResponse } from "next/server";
import { ensureUserAndOrg } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    const { user, membership } = await ensureUserAndOrg(email);
    const res = NextResponse.json({ ok: true });
    // Minimal cookie-based session (MVP). For production, sign and secure.
    res.cookies.set("uid", user.id, { httpOnly: true, sameSite: "lax", path: "/" });
    res.cookies.set("uem", user.email, { httpOnly: true, sameSite: "lax", path: "/" });
    // Persist org via membership lookup per request.
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Login failed" }, { status: 500 });
  }
}

