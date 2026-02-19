import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { SESSION_COOKIE_NAME } from "@/lib/auth-server";
import { hasFirebaseAdminCredentials, getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { decodeFirebaseIdTokenUnsafe, getUnsafeTokenUid } from "@/lib/firebase-token";

const schema = z.object({
  idToken: z.string().min(10)
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = schema.parse(body);

    if (!hasFirebaseAdminCredentials()) {
      const payload = decodeFirebaseIdTokenUnsafe(idToken);
      const uid = getUnsafeTokenUid(payload);

      if (!uid) {
        return NextResponse.json({ error: "Invalid auth token." }, { status: 400 });
      }

      const response = NextResponse.json({ ok: true, mode: "fallback" });
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: idToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 5,
        path: "/"
      });

      return response;
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: 1000 * 60 * 60 * 24 * 5
    });

    const userRecord = await adminAuth.getUser(decodedToken.uid);
    const userRef = adminDb.collection("users").doc(decodedToken.uid);
    const existing = await userRef.get();

    await userRef.set(
      {
        uid: decodedToken.uid,
        name: userRecord.displayName || decodedToken.name || "ResumeIQ User",
        email: userRecord.email || decodedToken.email || "",
        photoURL: userRecord.photoURL || decodedToken.picture || "",
        createdAt: existing.exists ? existing.data()?.createdAt : new Date().toISOString()
      },
      { merge: true }
    );

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 5,
      path: "/"
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid auth session request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}


