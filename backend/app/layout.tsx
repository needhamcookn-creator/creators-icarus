import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ICARUS Creator Portal — Backend",
  description: "Tracking and analytics backend for the ICARUS creator portal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f3f1ec" }}>
        {children}
      </body>
    </html>
  );
}
