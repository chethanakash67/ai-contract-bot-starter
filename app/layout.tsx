import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import Header from "./components/Header";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "AI Contract Bot",
  description: "AI proposal & contract generator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Providers>
          <Header />
          {children}
          <Toaster position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
