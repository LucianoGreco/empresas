// app/api/auth/me/route.js
import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";

export async function GET() {
  try {
    const u = await getUserFromSession();
    if (!u) return NextResponse.json({ user: null });
    // devolvemos un payload chico y útil
    return NextResponse.json({
      user: {
        id: u.id,
        email: u.email,
        name: u.name || null,
        role: u.role,
        isActive: !!u.isActive,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { user: null, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
