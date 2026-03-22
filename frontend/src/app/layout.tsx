import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-plus-jakarta',
})

export const metadata: Metadata = {
  title: 'Britney',
  description: 'AI Social Media Marketing Agent',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${plusJakartaSans.variable}`}>
      <body className="min-h-screen antialiased" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#12121a',
              border: '1px solid #2d2d3d',
              color: '#f8fafc',
            },
          }}
        />
      </body>
    </html>
  )
}
