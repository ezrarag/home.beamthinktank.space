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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <AuthBootstrapper />
        <div className="min-h-screen w-full min-w-full">{children}</div>
      </body>
    </html>
  );
}
