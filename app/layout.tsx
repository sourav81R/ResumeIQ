import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";

import { AuthProvider } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";

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
      <body className={`${jakarta.variable} ${sora.variable} font-sans`}>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}


