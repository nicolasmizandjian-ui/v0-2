import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { Suspense } from "react"
import { TopHeader } from "@/components/top-header"

export const metadata: Metadata = {
  title: "Plateforme de Production",
  description: "Gestion de production et de stock",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={<div>Loading...</div>}>
          <Sidebar />
          <div className="ml-64 min-h-screen bg-background">
            <TopHeader />
            <main>{children}</main>
          </div>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
