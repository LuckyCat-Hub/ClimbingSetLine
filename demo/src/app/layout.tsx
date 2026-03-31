import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "液丘 - 攀岩定线应用",
  description: "结合 2D 和 3D 的攀岩抱石定线 Web 应用",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
