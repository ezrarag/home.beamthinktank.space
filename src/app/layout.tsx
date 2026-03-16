import type { Metadata } from "next";
import AuthBootstrapper from "@/components/AuthBootstrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "BEAM - Think Tank Home",
  description: "Connect with NGOs and community initiatives in your area",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-theme="dark">
      <body className="antialiased bg-[#141414] text-system-text">
        <AuthBootstrapper />
        <div className="min-h-screen w-full min-w-full bg-[#141414]">{children}</div>
      </body>
    </html>
  );
}
