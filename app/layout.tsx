import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bakti Sosial - Input Data Pasien',
  description: 'Aplikasi input data pasien bakti sosial pengobatan gratis',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  )
}

