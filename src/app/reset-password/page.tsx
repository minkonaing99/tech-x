import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = {
  title: 'Reset password',
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  // `useSearchParams` needs the boundary, same as /signin and /verify.
  return (
    <Suspense
      fallback={<div className="mx-auto w-full max-w-[26rem] px-5 py-14 text-muted sm:py-20" />}
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
