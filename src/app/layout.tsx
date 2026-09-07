import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Rat Race",
  description: "Predict sports event winners and compete on the leaderboard.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-100">
        <NavBar />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">{children}</main>
        <footer className="text-center text-xs text-gray-400 py-6">
          Rat Race &mdash; submissions close 20 September 2026
        </footer>
      </body>
    </html>
  );
}
