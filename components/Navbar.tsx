"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Upload Resume" }
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, signOutUser } = useAuth();
  const [open, setOpen] = useState(false);

  const isLoggedIn = Boolean(user);
  const getNavHref = (href: string) =>
    !loading && isLoggedIn ? href : `/login?redirect=${encodeURIComponent(href)}`;
  const rawName = (user?.displayName || user?.email?.split("@")[0] || "User").trim();
  const firstName = rawName.split(/\s+/)[0] || "User";
  const greetingName = `${firstName.charAt(0).toUpperCase()}${firstName.slice(1)}`;
  const userInitial = greetingName.charAt(0).toUpperCase();

  return (
    <header className="z-50 px-2.5 sm:px-3 md:sticky md:top-2">
      <div className="container">
        <div className="flex h-14 w-full items-center justify-between gap-2 rounded-[22px] border border-white/65 bg-[linear-gradient(120deg,rgba(6,25,55,0.9),rgba(5,40,73,0.89),rgba(15,118,110,0.76))] px-3 shadow-[0_14px_38px_rgba(3,26,58,0.34)] backdrop-blur-xl sm:h-16 sm:px-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-cyan-200/40 bg-slate-950/35 px-3 py-1.5 text-sm font-semibold tracking-tight text-white shadow-sm sm:text-base"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-300/20">
              <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
            </span>
            <span className="font-display text-white">ResumeIQ</span>
          </Link>

          <nav className="hidden items-center gap-1.5 lg:flex">
            {isLoggedIn ? (
              <div className="mr-0.5 inline-flex items-center gap-1.5 rounded-full border border-cyan-100/25 bg-white/14 px-2 py-1 shadow-sm backdrop-blur">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-teal-500 text-[10px] font-bold text-white">
                  {userInitial}
                </span>
                <span className="text-xs font-medium text-slate-100">Hello, {greetingName}</span>
              </div>
            ) : null}

            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={getNavHref(item.href)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition",
                  pathname === item.href
                    ? "bg-white/22 text-white shadow-sm"
                    : "text-slate-100/95 hover:bg-white/15 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            ))}

            {!loading && !isLoggedIn ? (
              <Button
                size="sm"
                asChild
                className="rounded-full bg-[linear-gradient(120deg,#67e8f9_0%,#22d3ee_45%,#2dd4bf_100%)] text-slate-950 shadow-none hover:brightness-110"
              >
                <Link href="/login">Login</Link>
              </Button>
            ) : null}

            {isLoggedIn ? (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full border-cyan-100/40 bg-white/92 text-slate-900 hover:bg-white"
                onClick={async () => {
                  await signOutUser();
                  router.push("/");
                }}
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                Logout
              </Button>
            ) : null}
          </nav>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full border-cyan-100/40 bg-white/92 text-slate-900 hover:bg-white lg:hidden"
            onClick={() => setOpen((state) => !state)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="container">
          <div className="mt-2 w-full overflow-hidden rounded-2xl border border-white/80 bg-white/92 shadow-[0_14px_30px_rgba(2,35,71,0.14)] backdrop-blur lg:hidden">
            <div className="flex flex-col gap-1.5 p-3">
              {isLoggedIn ? (
                <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-teal-500 text-[10px] font-bold text-white">
                    {userInitial}
                  </span>
                  Hello, {greetingName}
                </div>
              ) : null}

              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={getNavHref(item.href)}
                  className={cn(
                    "rounded-lg border px-2.5 py-2 text-xs font-semibold tracking-wide",
                    pathname === item.href
                      ? "border-cyan-200 bg-cyan-50 text-cyan-800"
                      : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-100"
                  )}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              {!loading && !isLoggedIn ? (
                <Button asChild onClick={() => setOpen(false)}>
                  <Link href="/login">Login</Link>
                </Button>
              ) : null}

              {isLoggedIn ? (
                <Button
                  variant="outline"
                  onClick={async () => {
                    await signOutUser();
                    setOpen(false);
                    router.push("/");
                  }}
                >
                  Logout
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}


