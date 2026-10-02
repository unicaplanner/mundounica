import type { Metadata } from "next";
import { Fraunces, Open_Sans } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mundo da Unica",
  description: "Hub com acesso as ferramentas da Unica Planner.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: extensoes do navegador (ex: a de assinatura
    // digital BRy) injetam atributos no <html> antes do React carregar.
    <html
      lang="pt-BR"
      className={`${openSans.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-ink">{children}</body>
    </html>
  );
}
