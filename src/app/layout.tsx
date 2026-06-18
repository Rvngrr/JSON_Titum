import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/shared/Toast";

export const metadata: Metadata = {
  title: "AI Job Matching Platform",
  description:
    "Connect job applicants with HR professionals through intelligent skill-based matching",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
