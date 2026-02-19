"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
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
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900">
          <Sparkles className="h-5 w-5 text-cyan-600" />
          ResumeIQ
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {isLoggedIn ? (
            <div className="mr-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white">
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
                "rounded-md px-3 py-2 text-sm font-medium transition",
                pathname === item.href
                  ? "bg-cyan-100 text-cyan-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
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
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen((state) => !state)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-200 bg-white md:hidden"
          >
            <div className="container flex flex-col gap-2 py-4">
              {isLoggedIn ? (
                <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white">
                    {userInitial}
                  </span>
                  Hello, {greetingName}
                </div>
              ) : null}

              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={getNavHref(item.href)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
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
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}


