'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { LoaderCircle } from 'lucide-react'
import { AuthShell } from '@/components/auth/auth-shell'
import {
  AuthAlert,
  AuthDivider,
  GoogleMark,
  PasswordToggle,
  authButton,
  authButtonPrimary,
  authButtonQuiet,
} from '@/components/auth/auth-parts'
import { TextField } from '@/components/ui/field'
import { checkPassword, isEmail, maxLen, required } from '@/lib/validators'
import { api } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface FieldErrors {
  name?: string
  email?: string
  password?: string
}

export function SignUpForm({ hasGoogle }: { hasGoogle: boolean }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<{ name: boolean; email: boolean; password: boolean }>({
    name: false,
    email: false,
    password: false,
  })

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    if (name) {
      const m = maxLen(name, 120, 'Name')
      if (m) next.name = m
    }
    const emailReq = required(email, 'Email')
    if (emailReq) next.email = emailReq
    else if (!isEmail(email)) next.email = 'Enter a valid email address.'

    const pwReq = required(password, 'Password')
    if (pwReq) next.password = pwReq
    else {
      const c = checkPassword(password)
      if (!c.ok && c.reason) next.password = c.reason
    }
    return next
  }

  function markTouched(field: keyof FieldErrors) {
    setTouched((t) => ({ ...t, [field]: true }))
    setErrors(validate())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const v = validate()
    setErrors(v)
    setTouched({ name: true, email: true, password: true })
    if (Object.keys(v).length > 0) return

    setFormError(null)
    setLoading(true)
    const res = await api('/api/v1/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name: name || undefined }),
    })
    setLoading(false)
    if (!res.ok) {
      setFormError(res.error?.message ?? 'Sign-up failed.')
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <AuthShell
        centered
        eyebrow="Check your inbox"
        title="Verify your email."
        intro={
          <>
            We sent a verification link to <strong className="text-ink">{email}</strong>. It expires
            in 30 minutes.
          </>
        }
      >
        <p className="text-[13px] text-muted">
          Already verified?{' '}
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

  return (
    <AuthShell
      eyebrow="Create account"
      title="Sign up."
      intro="Save addresses, track orders, keep a wishlist."
    >
      {formError ? <AuthAlert>{formError}</AuthAlert> : null}

      {hasGoogle ? (
        <>
          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/account' })}
            className={cn(authButton, authButtonQuiet)}
          >
            <GoogleMark />
            Continue with Google
          </button>
          <AuthDivider label="or" />
        </>
      ) : null}

      <form onSubmit={handleSubmit} noValidate aria-busy={loading}>
        <div className="space-y-4">
          <TextField
            label="Name (optional)"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(v) => {
              setName(v)
              if (touched.name) setErrors(validate())
            }}
            onBlur={() => markTouched('name')}
            error={touched.name ? errors.name : null}
          />
          <TextField
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(v) => {
              setEmail(v)
              if (touched.email) setErrors(validate())
            }}
            onBlur={() => markTouched('email')}
            error={touched.email ? errors.email : null}
          />
          <TextField
            label="Password"
            type={revealed ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={password}
            onChange={(v) => {
              setPassword(v)
              if (touched.password) setErrors(validate())
            }}
            onBlur={() => markTouched('password')}
            helper="At least 10 characters with upper, lower, and a digit."
            error={touched.password ? errors.password : null}
            trailing={<PasswordToggle revealed={revealed} onToggle={() => setRevealed((r) => !r)} />}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={cn(authButton, authButtonPrimary, 'mt-6')}
        >
          {loading ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
              Creating…
            </>
          ) : (
            'Create account'
          )}
        </button>
      </form>

      <p className="mt-7 text-center text-[13px] text-muted">
        Already have an account?{' '}
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
