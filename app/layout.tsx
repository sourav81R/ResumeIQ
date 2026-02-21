import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import { Suspense } from "react";

import { AuthProvider } from "@/components/AuthProvider";
import GlobalLoadingOverlay from "@/components/GlobalLoadingOverlay";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";

import "@/app/globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body" });
const sora = Sora({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "ResumeIQ | AI Powered Resume Analyzer",
  description:
    "Upload your resume, optimize it for ATS, and improve your interview chances with AI-powered feedback."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${sora.variable} flex min-h-screen flex-col overflow-x-hidden font-sans`}>
        <AuthProvider>
          <Navbar />
          <main className="flex-1 pb-4 sm:pb-6">{children}</main>
          <SiteFooter />
          <Suspense fallback={null}>
            <GlobalLoadingOverlay />
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}


