import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { AuthProvider } from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";

import "@/app/globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ResumeIQ | AI Powered Resume Analyzer",
  description:
    "Upload your resume, optimize it for ATS, and improve your interview chances with AI-powered feedback."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={jakarta.className}>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}


