"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import LoadingPopup from "@/components/LoadingPopup";

const SHOW_DELAY_MS = 120;
const ROUTE_FAILSAFE_MS = 12000;

function readHeaderValue(headers: HeadersInit | undefined, name: string) {
  if (!headers) {
    return "";
  }

  const normalizedName = name.toLowerCase();

  if (headers instanceof Headers) {
    return headers.get(name) || "";
  }

  if (Array.isArray(headers)) {
    const row = headers.find((entry) => entry[0].toLowerCase() === normalizedName);
    return row ? row[1] : "";
  }

  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === normalizedName) {
      return String(headers[key as keyof typeof headers] || "");
    }
  }

  return "";
}

function toUrl(input: RequestInfo | URL) {
  try {
    if (typeof input === "string") {
      return new URL(input, window.location.href);
    }

    if (input instanceof URL) {
      return new URL(input.toString(), window.location.href);
    }

    return new URL(input.url, window.location.href);
  } catch {
    return null;
  }
}

function isPrefetchRequest(input: RequestInfo | URL, init?: RequestInit) {
  const initPurpose = readHeaderValue(init?.headers, "purpose");
  const initPrefetch = readHeaderValue(init?.headers, "next-router-prefetch");
  const initMiddlewarePrefetch = readHeaderValue(init?.headers, "x-middleware-prefetch");

  const requestHeaders = input instanceof Request ? input.headers : undefined;
  const requestPurpose = requestHeaders?.get("purpose") || "";
  const requestPrefetch = requestHeaders?.get("next-router-prefetch") || "";
  const requestMiddlewarePrefetch = requestHeaders?.get("x-middleware-prefetch") || "";

  const combined =
    `${initPurpose} ${initPrefetch} ${initMiddlewarePrefetch} ` +
    `${requestPurpose} ${requestPrefetch} ${requestMiddlewarePrefetch}`;

  return combined.toLowerCase().includes("prefetch");
}

function shouldTrackFetch(input: RequestInfo | URL, init?: RequestInit) {
  if (isPrefetchRequest(input, init)) {
    return false;
  }

  const url = toUrl(input);
  if (!url) {
    return false;
  }

  if (url.origin !== window.location.origin) {
    return false;
  }

  if (url.pathname.startsWith("/api/")) {
    return true;
  }

  if (url.pathname.startsWith("/_next/")) {
    return false;
  }

  if (/\.(?:css|js|map|png|jpe?g|gif|svg|webp|ico|woff2?|ttf)$/i.test(url.pathname)) {
    return false;
  }

  return true;
}

function isSamePathAndSearch(url: URL) {
  return (
    `${url.pathname}${url.search}` === `${window.location.pathname}${window.location.search}`
  );
}

export default function GlobalLoadingOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchKey = searchParams.toString();

  const [routePending, setRoutePending] = useState(false);
  const [fetchPendingCount, setFetchPendingCount] = useState(0);
  const [visible, setVisible] = useState(false);

  const routePendingRef = useRef(false);
  const routeFailsafeTimerRef = useRef<number | null>(null);
  const showDelayTimerRef = useRef<number | null>(null);

  const isBusy = routePending || fetchPendingCount > 0;

  const title = useMemo(() => {
    if (routePending) {
      return "Loading page...";
    }

    return "Processing request...";
  }, [routePending]);

  const startRoutePending = useCallback(() => {
    if (routePendingRef.current) {
      return;
    }

    routePendingRef.current = true;
    setRoutePending(true);

    if (routeFailsafeTimerRef.current) {
      window.clearTimeout(routeFailsafeTimerRef.current);
    }

    routeFailsafeTimerRef.current = window.setTimeout(() => {
      routePendingRef.current = false;
      setRoutePending(false);
      routeFailsafeTimerRef.current = null;
    }, ROUTE_FAILSAFE_MS);
  }, []);

  const stopRoutePending = useCallback(() => {
    if (!routePendingRef.current) {
      return;
    }

    routePendingRef.current = false;
    setRoutePending(false);

    if (routeFailsafeTimerRef.current) {
      window.clearTimeout(routeFailsafeTimerRef.current);
      routeFailsafeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const track = shouldTrackFetch(input, init);

      if (track) {
        setFetchPendingCount((current) => current + 1);
      }

      try {
        return await originalFetch(input, init);
      } finally {
        if (track) {
          setFetchPendingCount((current) => Math.max(0, current - 1));
        }
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [startRoutePending]);

  useEffect(() => {
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    const onPopState = () => {
      startRoutePending();
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const element = event.target as HTMLElement | null;
      const anchor = element?.closest("a[href]") as HTMLAnchorElement | null;

      if (!anchor) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      if (anchor.hasAttribute("download")) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin || isSamePathAndSearch(url)) {
          return;
        }
        startRoutePending();
      } catch {
        // Ignore malformed URLs and let navigation proceed.
      }
    };

    window.history.pushState = function patchedPushState(...args) {
      const nextUrl = args[2];
      if (nextUrl) {
        try {
          const parsed = new URL(String(nextUrl), window.location.href);
          if (parsed.origin === window.location.origin && !isSamePathAndSearch(parsed)) {
            startRoutePending();
          }
        } catch {
          // Ignore malformed URLs.
        }
      }
      return originalPushState.apply(window.history, args);
    };

    window.history.replaceState = function patchedReplaceState(...args) {
      const nextUrl = args[2];
      if (nextUrl) {
        try {
          const parsed = new URL(String(nextUrl), window.location.href);
          if (parsed.origin === window.location.origin && !isSamePathAndSearch(parsed)) {
            startRoutePending();
          }
        } catch {
          // Ignore malformed URLs.
        }
      }
      return originalReplaceState.apply(window.history, args);
    };

    window.addEventListener("popstate", onPopState);
    document.addEventListener("click", onClick, true);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useEffect(() => {
    stopRoutePending();
  }, [pathname, searchKey, stopRoutePending]);

  useEffect(() => {
    if (isBusy) {
      if (!showDelayTimerRef.current) {
        showDelayTimerRef.current = window.setTimeout(() => {
          setVisible(true);
          showDelayTimerRef.current = null;
        }, SHOW_DELAY_MS);
      }
      return;
    }

    if (showDelayTimerRef.current) {
      window.clearTimeout(showDelayTimerRef.current);
      showDelayTimerRef.current = null;
    }

    setVisible(false);
  }, [isBusy]);

  useEffect(() => {
    return () => {
      if (routeFailsafeTimerRef.current) {
        window.clearTimeout(routeFailsafeTimerRef.current);
      }

      if (showDelayTimerRef.current) {
        window.clearTimeout(showDelayTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-0 z-[120] transition-opacity duration-200 ${
        visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(14,116,144,0.34),transparent_36%),radial-gradient(circle_at_80%_0%,rgba(15,118,110,0.33),transparent_38%),rgba(15,23,42,0.42)] backdrop-blur-[3px]" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <LoadingPopup
          title={title}
          subtitle={routePending ? "Navigating to the next screen..." : "Working on your request..."}
          className={`transition duration-300 ${visible ? "translate-y-0 scale-100" : "translate-y-2 scale-95"}`}
        />
      </div>
    </div>
  );
}
