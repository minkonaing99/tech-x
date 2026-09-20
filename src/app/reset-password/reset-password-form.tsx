'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { LoaderCircle } from 'lucide-react'
import { AuthShell } from '@/components/auth/auth-shell'
import {
  AuthAlert,
  PasswordToggle,
  authButton,
  authButtonPrimary,
} from '@/components/auth/auth-parts'
import { TextField } from '@/components/ui/field'
import { api } from '@/lib/api-client'
import { checkPassword, required } from '@/lib/validators'
import { cn } from '@/lib/utils'

export function ResetPasswordForm() {
  const params = useSearchParams()
  const token = params.get('token') ?? ''
  const email = params.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function validate(): string | null {
    const req = required(password, 'Password')
    if (req) return req
    const c = checkPassword(password)
    return c.ok ? null : (c.reason ?? 'Choose a stronger password.')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = validate()
    setError(v)
    setTouched(true)
    if (v) return

    setFormError(null)
    setLoading(true)
    const res = await api('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, token, password }),
    })
    setLoading(false)

    if (!res.ok) {
      setFormError(res.error?.message ?? 'Could not reset your password. Try again.')
      return
    }
    setDone(true)
  }

  // A link that lost half of itself in a mail client, or someone who typed the
  // path in. Nothing to validate against, so say so rather than showing a form
  // that cannot succeed.
  if (!token || !email) {
    return (
      <AuthShell
        centered
        eyebrow="Reset password"
        title="Link incomplete."
        intro="Open the link from your email, or ask for a new one."
      >
        <Link
          href="/forgot-password"
          className={cn(authButton, authButtonPrimary)}
        >
          Send a new link
        </Link>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell
        centered
        eyebrow="Password changed"
        title="All set."
        intro="Anywhere that was signed in has been signed out. Use the new password from here."
      >
        <Link href="/signin" className={cn(authButton, authButtonPrimary)}>
          Sign in
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Reset password"
      title="Choose a new one."
      intro={
        <>
          For <strong className="text-ink">{email}</strong>.
        </>
      }
    >
      {formError ? (
        <AuthAlert>
          {formError}{' '}
          <Link href="/forgot-password" className="underline underline-offset-4">
            Send a new link
          </Link>
          .
        </AuthAlert>
      ) : null}

      <form onSubmit={handleSubmit} noValidate aria-busy={loading}>
        <TextField
          label="New password"
          type={revealed ? 'text' : 'password'}
          autoComplete="new-password"
          autoFocus
          required
          value={password}
          onChange={(v) => {
            setPassword(v)
            if (touched) setError(validate())
          }}
          onBlur={() => {
            setTouched(true)
            setError(validate())
          }}
          helper="At least 10 characters with upper, lower, and a digit."
          error={touched ? error : null}
          trailing={<PasswordToggle revealed={revealed} onToggle={() => setRevealed((r) => !r)} />}
        />
        <button
          type="submit"
          disabled={loading}
          className={cn(authButton, authButtonPrimary, 'mt-6')}
        >
          {loading ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
              Saving…
            </>
          ) : (
            'Change password'
          )}
        </button>
      </form>
    </AuthShell>
  )
}
