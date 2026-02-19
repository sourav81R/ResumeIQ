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
    <footer className="mt-10 border-t border-cyan-200/70 bg-gradient-to-r from-slate-100/95 via-cyan-50/80 to-slate-100/95 text-slate-700">
      <div className="h-1 bg-gradient-to-r from-cyan-700 via-teal-500 to-cyan-700" />

      <div className="container py-10">
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-4 xl:col-span-1">
            <h3 className="font-display text-4xl font-bold italic tracking-tight text-cyan-800">ResumeIQ</h3>
            <p className="max-w-xs text-base leading-7 text-slate-600">
              Build ATS-ready resumes faster with role-aware insights and focused edits.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                aria-label="ResumeIQ on GitHub"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-200 bg-white/90 text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="ResumeIQ on LinkedIn"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-200 bg-white/90 text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a
                href="/"
                aria-label="ResumeIQ website"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-200 bg-white/90 text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700"
              >
                <Globe className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-display text-2xl font-semibold text-slate-900">Quick Links</h4>
            <ul className="space-y-2.5 text-lg">
              {quickLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="transition hover:text-cyan-700">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-display text-2xl font-semibold text-slate-900">Product</h4>
            <ul className="space-y-2.5 text-lg">
              {productLinks.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="transition hover:text-cyan-700">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-display text-2xl font-semibold text-slate-900">Contact Us</h4>
            <ul className="space-y-3 text-lg">
              <li className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-cyan-700" />
                <span>Remote-first, India</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-cyan-700" />
                <a href="tel:+919000000000" className="transition hover:text-cyan-700">
                  +91 90000-00000
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-cyan-700" />
                <a href="mailto:support@resumeiq.ai" className="break-all transition hover:text-cyan-700">
                  support@resumeiq.ai
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-display text-2xl font-semibold text-slate-900">Get Started</h4>
            <div className="space-y-3">
              <Link
                href="/upload"
                className="flex items-center justify-between rounded-xl border border-cyan-200 bg-white/80 px-3 py-2 transition hover:border-cyan-400 hover:bg-white"
              >
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-cyan-700">Start Here</p>
                  <p className="text-xl font-bold leading-none text-slate-900">Upload Resume</p>
                </div>
                <ArrowRight className="h-4 w-4 text-cyan-700" />
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center justify-between rounded-xl border border-teal-200 bg-white/80 px-3 py-2 transition hover:border-teal-400 hover:bg-white"
              >
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-teal-700">Track Progress</p>
                  <p className="text-xl font-bold leading-none text-slate-900">View Dashboard</p>
                </div>
                <ArrowRight className="h-4 w-4 text-teal-700" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-9 border-t border-cyan-200/70 pt-6 text-center text-xl text-slate-500">
          © {new Date().getFullYear()} ResumeIQ. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
