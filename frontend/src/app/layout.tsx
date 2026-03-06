import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "Good News",
  description: "Transform any newsletter into a TikTok-ready video",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="font-sans bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
