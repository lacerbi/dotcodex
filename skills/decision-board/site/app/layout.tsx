import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Decision board",
  description: "Private decision boards with saved answers and discussion rounds.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
