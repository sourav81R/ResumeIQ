type UnsafeTokenPayload = {
  sub?: string;
  user_id?: string;
  uid?: string;
  email?: string;
  name?: string;
  picture?: string;
  exp?: number;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

export function decodeFirebaseIdTokenUnsafe(token: string): UnsafeTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) {
      return null;
    }

    const payload = JSON.parse(decodeBase64Url(parts[1])) as UnsafeTokenPayload;
    return payload;
  } catch {
    return null;
  }
}

export function getUnsafeTokenUid(payload: UnsafeTokenPayload | null) {
  if (!payload) return null;
  return payload.uid || payload.user_id || payload.sub || null;
}
