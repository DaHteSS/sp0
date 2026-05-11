import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { AppProviders } from "./providers";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "SSH Panel Zero (SP0)",
  description: "Web SSH client with terminal, file explorer, and editor",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='ru' className={manrope.variable}>
      <body className={`${manrope.className} min-h-screen antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
