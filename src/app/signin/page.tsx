import type { Metadata } from 'next'
import { Suspense } from 'react'
import { SignInForm } from './signin-form'

export const metadata: Metadata = { title: 'Sign in' }

export default function SignInPage() {
  // Mirrors the `hasGoogle` gate in `src/lib/auth.ts`. Without it the button
  // renders on an install with no Google credentials and fails on click.
  const hasGoogle = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
  return (
    <Suspense
      fallback={<div className="mx-auto w-full max-w-[26rem] px-5 py-14 text-muted sm:py-20" />}
    >
      <SignInForm hasGoogle={hasGoogle} />
    </Suspense>
  )
}
