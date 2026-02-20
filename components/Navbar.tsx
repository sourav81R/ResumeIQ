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
    <header className="sticky top-4 z-50 px-3 sm:px-4">
      <div className="container">
        <div className="flex h-16 w-full items-center justify-between gap-2 rounded-full border border-slate-200/80 bg-white/88 px-4 shadow-[0_10px_30px_rgba(2,35,71,0.14)] backdrop-blur-xl sm:h-[72px] sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/70 bg-white/85 px-3 py-1.5 text-base font-semibold tracking-tight text-slate-900 shadow-sm sm:text-lg"
          >
            <Sparkles className="h-5 w-5 text-cyan-600" />
            <span className="font-display">ResumeIQ</span>
          </Link>

          <nav className="hidden items-center gap-2 lg:flex">
            {isLoggedIn ? (
              <div className="mr-1 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-teal-500 text-xs font-bold text-white">
                  {userInitial}
                </span>
                <span className="text-sm font-medium text-slate-700">Hello, {greetingName}</span>
              </div>
            ) : null}

            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={getNavHref(item.href)}
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-medium transition",
                  pathname === item.href
                    ? "bg-cyan-100 text-cyan-800 shadow-sm"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                )}
              >
                {item.label}
              </Link>
            ))}

            {!loading && !isLoggedIn ? (
              <Button size="sm" asChild>
                <Link href="/login">Login</Link>
              </Button>
            ) : null}

            {isLoggedIn ? (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full bg-white"
                onClick={async () => {
                  await signOutUser();
                  router.push("/");
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            ) : null}
          </nav>

          <Button
            variant="outline"
            size="icon"
            className="rounded-full bg-white lg:hidden"
            onClick={() => setOpen((state) => !state)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="container">
          <div className="mt-2 w-full overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-[0_14px_34px_rgba(2,35,71,0.14)] backdrop-blur lg:hidden">
            <div className="flex flex-col gap-2 p-4">
              {isLoggedIn ? (
                <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-600 to-teal-500 text-xs font-bold text-white">
                    {userInitial}
                  </span>
                  Hello, {greetingName}
                </div>
              ) : null}

              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={getNavHref(item.href)}
                  className="rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-200 hover:bg-slate-100"
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


