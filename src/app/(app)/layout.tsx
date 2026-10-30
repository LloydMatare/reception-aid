import React from 'react'
import './styles.css'
import { Toaster } from 'sonner'
import { ClerkProvider } from '@clerk/nextjs'

export const metadata = {
  description: 'Reception Aide',
  title: 'Reception Aide',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <main>{children}</main>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  )
}
