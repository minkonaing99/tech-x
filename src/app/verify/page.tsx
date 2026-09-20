'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { api } from '@/lib/api-client'

type Status = 'idle' | 'verifying' | 'ok' | 'fail'

function VerifyInner() {
  const params = useSearchParams()
  const token = params.get('token')
  const email = params.get('email')
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    if (!token || !email) {
      setStatus('idle')
      return
    }
    setStatus('verifying')
    // `api` never throws - a dead network resolves as `ok: false`, which is
    // the same 'fail' screen a rejected token gets.
    api('/api/v1/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token, email }),
    }).then((res) => setStatus(res.ok ? 'ok' : 'fail'))
  }, [token, email])

  if (!token || !email) {
    return (
      <section className="container-prose max-w-[480px] py-20 text-center md:py-28">
        <div className="eyebrow">Verify email</div>
        <h1 className="mt-3 font-display text-[36px] leading-[1.05]">Check your inbox.</h1>
        <p className="mx-auto mt-4 max-w-[40ch] text-[15px] text-ink-soft">
          Open the link we sent to finish verifying your email.
        </p>
      </section>
    )
  }

  return (
    <section className="container-prose max-w-[480px] py-20 text-center md:py-28">
      {status === 'verifying' && (
        <>
          <div className="eyebrow">Verifying…</div>
          <h1 className="mt-3 font-display text-[36px] leading-[1.05]">One moment.</h1>
        </>
      )}
      {status === 'ok' && (
        <>
          <div className="eyebrow">Verified</div>
          <h1 className="mt-3 font-display text-[40px] leading-[1.05]">All set.</h1>
          <p className="mx-auto mt-4 max-w-[40ch] text-[15px] text-ink-soft">
            Your email is verified. You can sign in now.
          </p>
          <Link
            href="/signin"
            className="mt-6 inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-ink px-6 py-3 text-[14px] font-medium text-cream transition-colors hover:bg-accent"
          >
            Sign in
          </Link>
        </>
      )}
      {status === 'fail' && (
        <>
          <div className="eyebrow">Link expired</div>
          <h1 className="mt-3 font-display text-[40px] leading-[1.05]">Try again.</h1>
          <p className="mx-auto mt-4 max-w-[40ch] text-[15px] text-ink-soft">
            That link is invalid or expired. Sign up again to get a new one.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-ink px-6 py-3 text-[14px] font-medium text-cream transition-colors hover:bg-accent"
          >
            Back to sign up
          </Link>
        </>
      )}
    </section>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="container-prose py-20 text-muted">Loading…</div>}>
      <VerifyInner />
    </Suspense>
  )
}
