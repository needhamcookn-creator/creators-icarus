import type { Metadata } from "next";
import "@fontsource/bodoni-moda/400.css";
import "@fontsource/bodoni-moda/500.css";
import "@fontsource/bodoni-moda/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "ICARUS — Creator Program",
  description:
    "Join the ICARUS creator program. Log in with Instagram, track your analytics, manage posts, and automate DMs.",
  openGraph: {
    title: "ICARUS — Creator Program",
    description: "The affiliate dashboard for ICARUS influencers.",
    url: "https://creators-icaruswick.com",
    siteName: "ICARUS",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-icarus-white text-icarus-black font-bodoni">
        {children}
      </body>
    </html>
  );
}
