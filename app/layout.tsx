import "./globals.css"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import "../src/styles/global.css"

export const metadata: Metadata = {
  title: "BookYourShoot - Find Professional Photographers",
  description: "Connect with professional photographers for your special moments in Pakistan",
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  icons: {
    icon: "/logo.png",
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
      </head>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}
