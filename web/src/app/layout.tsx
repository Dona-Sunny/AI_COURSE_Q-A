import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Course Notes Q&A",
  description: "Ask grounded questions using AI course notes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
