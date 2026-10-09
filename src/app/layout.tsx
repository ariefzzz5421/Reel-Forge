import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reel-Forge — turn a project into a story",
  description:
    "Build a source-aware 60-second project video brief, shape the scenes, and connect your research and video APIs when ready.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
