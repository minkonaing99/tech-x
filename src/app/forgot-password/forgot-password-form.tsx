'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LoaderCircle } from 'lucide-react'
import { AuthShell } from '@/components/auth/auth-shell'
import { AuthAlert, authButton, authButtonPrimary } from '@/components/auth/auth-parts'
import { TextField } from '@/components/ui/field'
import { api } from '@/lib/api-client'
import { isEmail, required } from '@/lib/validators'
import { cn } from '@/lib/utils'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  function validate(): string | null {
    const req = required(email, 'Email')
    if (req) return req
    if (!isEmail(email)) return 'Enter a valid email address.'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = validate()
    setError(v)
    setTouched(true)
    if (v) return

    setFormError(null)
    setLoading(true)
    const res = await api('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
    })
    setLoading(false)

    // A 429 is the one refusal worth showing. Everything else answers the same
    // whether or not the address is registered, so there is nothing to report.
    if (!res.ok) {
      setFormError(res.error?.message ?? 'Could not send the email. Try again.')
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <AuthShell
        centered
        eyebrow="Check your inbox"
        title="On its way."
        intro={
          <>
            If <strong className="text-ink">{email.trim()}</strong> has an account, a reset link is
            in that inbox. It expires in 15 minutes.
          </>
        }
      >
        <p className="text-[13px] text-muted">
          Nothing arrived? Check spam, then{' '}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="font-medium text-accent underline decoration-accent/35 underline-offset-4 transition-colors hover:decoration-accent"
          >
            try another address
          </button>
          .
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Forgot password"
      title="Reset it."
      intro="Enter the address you signed up with and we will send a link."
    >
      {formError ? <AuthAlert>{formError}</AuthAlert> : null}

      <form onSubmit={handleSubmit} noValidate aria-busy={loading}>
        <TextField
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(v) => {
            setEmail(v)
            if (touched) setError(validate())
          }}
          onBlur={() => {
            setTouched(true)
            setError(validate())
          }}
          error={touched ? error : null}
        />
        <button
          type="submit"
          disabled={loading}
          className={cn(authButton, authButtonPrimary, 'mt-6')}
        >
          {loading ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
              Sending…
            </>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>

      <p className="mt-7 text-center text-[13px] text-muted">
        Remembered it?{' '}
        <Link
          href="/signin"
          className="font-medium text-accent underline decoration-accent/35 underline-offset-4 transition-colors hover:decoration-accent"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
