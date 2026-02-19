import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "session";

type UnsafeTokenPayload = {
  exp?: number;
  sub?: string;
  user_id?: string;
  uid?: string;
};

function decodeBase64Url(value: string) {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return atob(padded);
  } catch {
    return null;
  }
}

function hasValidSessionToken(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return false;
    }

    const payloadRaw = decodeBase64Url(parts[1]);
    if (!payloadRaw) {
      return false;
    }

    const payload = JSON.parse(payloadRaw) as UnsafeTokenPayload;
    const uid = payload.uid || payload.user_id || payload.sub;

    if (!uid) {
      return false;
    }

    if (payload.exp && payload.exp * 1000 <= Date.now()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

function isProtectedPath(pathname: string) {
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/upload") ||
    pathname.startsWith("/report") ||
    pathname.startsWith("/api/upload") ||
    pathname.startsWith("/api/analyze") ||
    pathname.startsWith("/api/resumes") ||
    pathname.startsWith("/api/report")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const hasSession = Boolean(sessionCookie && hasValidSessionToken(sessionCookie));

  if (hasSession) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

