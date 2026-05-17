import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klypup Research OS",
  description: "AI-powered investment research dashboard with workspace isolation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
