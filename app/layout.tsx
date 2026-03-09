import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SuperSpin — Giveaway Platform',
  description: 'Host transparent giveaways with X authentication. Spin the wheel, pick winners live.',
  openGraph: {
    title: 'SuperSpin — Giveaway Platform',
    description: 'Host transparent giveaways with X authentication. Spin the wheel, pick winners live.',
    url: 'https://superspin.online',
    siteName: 'SuperSpin',
    images: [
      {
        url: 'https://superspin.online/giveaway-banner.png',
        width: 1200,
        height: 630,
        alt: 'SuperSpin Giveaway Platform',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SuperSpin — Giveaway Platform',
    description: 'Host transparent giveaways with X authentication. Spin the wheel, pick winners live.',
    images: ['https://superspin.online/giveaway-banner.png'],
    site: '@superspinonline',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="aurora">
          <div className="aurora-blob" />
          <div className="aurora-blob" />
          <div className="aurora-blob" />
          <div className="aurora-blob" />
        </div>
        <div className="grid-overlay" />
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </body>
    </html>
  )
}
