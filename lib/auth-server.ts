import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { hasFirebaseAdminCredentials, getAdminAuth } from "@/lib/firebase-admin";
import { decodeFirebaseIdTokenUnsafe, getUnsafeTokenUid } from "@/lib/firebase-token";

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "session";

function getFallbackSessionUser(sessionToken: string) {
  const payload = decodeFirebaseIdTokenUnsafe(sessionToken);
  const uid = getUnsafeTokenUid(payload);

  if (!payload || !uid) {
    return null;
  }

  if (payload.exp && payload.exp * 1000 <= Date.now()) {
    return null;
  }

  return {
    uid,
    email: payload.email || null,
    name: payload.name || null,
    picture: payload.picture || null
  };
}

export async function getServerSessionUser() {
  const sessionCookie = cookies().get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  if (!hasFirebaseAdminCredentials()) {
    return getFallbackSessionUser(sessionCookie);
  }

  try {
    return await getAdminAuth().verifySessionCookie(sessionCookie, true);
  } catch {
    return getFallbackSessionUser(sessionCookie);
  }
}

export async function requireApiUser(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    throw new Error("Unauthorized");
  }

  if (!hasFirebaseAdminCredentials()) {
    const fallbackUser = getFallbackSessionUser(sessionCookie);
    if (!fallbackUser) {
      throw new Error("Unauthorized");
    }
    return fallbackUser;
  }

  try {
    return await getAdminAuth().verifySessionCookie(sessionCookie, true);
  } catch {
    const fallbackUser = getFallbackSessionUser(sessionCookie);
    if (!fallbackUser) {
      throw new Error("Unauthorized");
    }
    return fallbackUser;
  }
}


