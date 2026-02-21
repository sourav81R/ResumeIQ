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
    <footer className="mt-12 border-t border-slate-200/80 bg-[linear-gradient(180deg,#061a33_0%,#072347_50%,#061a33_100%)] text-slate-200">
      <div className="container mx-auto max-w-6xl py-9 sm:py-10">
        <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-3 xl:col-span-1">
            <h3 className="font-display text-3xl font-bold tracking-tight text-white">ResumeIQ</h3>
            <p className="max-w-xs text-sm leading-6 text-slate-300">
              Build ATS-ready resumes faster with role-aware insights and focused edits.
            </p>
            <div className="flex items-center gap-2.5">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                aria-label="ResumeIQ on GitHub"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-[#0b2242]/75 text-slate-200 transition hover:border-cyan-400 hover:bg-[#11325a] hover:text-cyan-300"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="ResumeIQ on LinkedIn"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-[#0b2242]/75 text-slate-200 transition hover:border-cyan-400 hover:bg-[#11325a] hover:text-cyan-300"
              >
                <Linkedin className="h-4 w-4" />
              </a>
              <a
                href="https://portfolio-topaz-eight-91.vercel.app/"
                target="_blank"
                rel="noreferrer"
                aria-label="ResumeIQ website"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-600 bg-[#0b2242]/75 text-slate-200 transition hover:border-cyan-400 hover:bg-[#11325a] hover:text-cyan-300"
              >
                <Globe className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-display text-lg font-semibold text-white">Quick Links</h4>
            <ul className="space-y-2 text-sm">
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
            <h4 className="font-display text-lg font-semibold text-white">Product</h4>
            <ul className="space-y-2 text-sm">
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
            <h4 className="font-display text-lg font-semibold text-white">Contact Us</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-cyan-300" />
                <span>Remote-first, India</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-cyan-300" />
                <a href="tel:+919000000000" className="transition hover:text-cyan-300">
                  +91 90000-00000
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-cyan-300" />
                <a href="mailto:support@resumeiq.ai" className="break-all transition hover:text-cyan-300">
                  support@resumeiq.ai
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-display text-lg font-semibold text-white">Get Started</h4>
            <div className="space-y-2.5">
              <Link
                href="/upload"
                className="flex items-center justify-between rounded-xl border border-slate-600 bg-[#0b2242]/70 px-3 py-2 transition hover:border-cyan-400 hover:bg-[#123861]"
              >
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.08em] text-cyan-300">Start Here</p>
                  <p className="text-base font-bold leading-none text-white">Upload Resume</p>
                </div>
                <ArrowRight className="h-4 w-4 text-cyan-300" />
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center justify-between rounded-xl border border-slate-600 bg-[#0b2242]/70 px-3 py-2 transition hover:border-cyan-400 hover:bg-[#123861]"
              >
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.08em] text-cyan-300">Track Progress</p>
                  <p className="text-base font-bold leading-none text-white">View Dashboard</p>
                </div>
                <ArrowRight className="h-4 w-4 text-cyan-300" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-700/80 pt-5 text-center text-sm text-slate-400">
          (c) {new Date().getFullYear()} ResumeIQ. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

