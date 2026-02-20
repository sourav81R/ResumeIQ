import Link from "next/link";
import { ArrowRight, Github, Globe, Linkedin, Mail, MapPin, Phone } from "lucide-react";

const quickLinks = [
  { href: "/", label: "Home" },
  { href: "/upload", label: "Upload Resume" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/login", label: "Login" }
];

const productLinks = [
  { href: "/product/ats-analyzer", label: "ATS Analyzer" },
  { href: "/product/recent-reports", label: "Recent Reports" },
  { href: "/product/resume-studio", label: "Resume Studio" },
  { href: "/product/support", label: "Support" }
];

export default function SiteFooter() {
  return (
    <footer className="mt-10 border-t border-slate-700/60 bg-gradient-to-r from-[#071631] via-[#081b39] to-[#071631] text-slate-200">
      <div className="h-px bg-slate-700/80" />

      <div className="container py-10">
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-4 xl:col-span-1">
            <h3 className="font-display text-3xl font-bold italic tracking-tight text-white">ResumeIQ</h3>
            <p className="max-w-xs text-sm leading-6 text-slate-300">
              Build ATS-ready resumes faster with role-aware insights and focused edits.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                aria-label="ResumeIQ on GitHub"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-600 bg-[#0b2242]/80 text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="ResumeIQ on LinkedIn"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-600 bg-[#0b2242]/80 text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="/"
                aria-label="ResumeIQ website"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-600 bg-[#0b2242]/80 text-slate-200 transition hover:border-cyan-400 hover:text-cyan-300"
              >
                <Globe className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-display text-xl font-semibold text-white">Quick Links</h4>
            <ul className="space-y-2 text-base">
              {quickLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="transition hover:text-cyan-300">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-display text-xl font-semibold text-white">Product</h4>
            <ul className="space-y-2 text-base">
              {productLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="transition hover:text-cyan-300">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-display text-xl font-semibold text-white">Contact Us</h4>
            <ul className="space-y-2.5 text-base">
              <li className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-cyan-300" />
                <span>Remote-first, India</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-cyan-300" />
                <a href="tel:+919000000000" className="transition hover:text-cyan-300">
                  +91 90000-00000
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-cyan-300" />
                <a href="mailto:support@resumeiq.ai" className="break-all transition hover:text-cyan-300">
                  support@resumeiq.ai
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-display text-xl font-semibold text-white">Get Started</h4>
            <div className="space-y-3">
              <Link
                href="/upload"
                className="flex items-center justify-between rounded-xl border border-slate-600 bg-[#0b2242]/75 px-3 py-2 transition hover:border-cyan-400 hover:bg-[#102f56]"
              >
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-cyan-300">Start Here</p>
                  <p className="text-lg font-bold leading-none text-white">Upload Resume</p>
                </div>
                <ArrowRight className="h-4 w-4 text-cyan-300" />
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center justify-between rounded-xl border border-slate-600 bg-[#0b2242]/75 px-3 py-2 transition hover:border-cyan-400 hover:bg-[#102f56]"
              >
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-cyan-300">Track Progress</p>
                  <p className="text-lg font-bold leading-none text-white">View Dashboard</p>
                </div>
                <ArrowRight className="h-4 w-4 text-cyan-300" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-9 border-t border-slate-700/80 pt-6 text-center text-base text-slate-400">
          (c) {new Date().getFullYear()} ResumeIQ. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

