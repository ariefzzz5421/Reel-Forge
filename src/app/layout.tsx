import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reel-Forge — turn a project into a story",
  description:
    "Research a project and turn its sourced story into a narrated 60-second motion graphics video.",
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
