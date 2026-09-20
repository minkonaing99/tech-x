'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { isEmail, required } from '@/lib/validators'
import { cn } from '@/lib/utils'

interface FieldErrors {
  email?: string
  password?: string
}

/**
 * Auth.js reports a failure as a code: in `?error=` after an OAuth round trip,
 * or on the resolved value of `signIn(..., { redirect: false })`.
 * `OAuthAccountNotLinked` is the one a real customer hits, by registering with
 * a password and then reaching for Google.
 */
const ERROR_COPY: Record<string, string> = {
  CredentialsSignin: 'Invalid email or password, or the email is not verified yet.',
  OAuthAccountNotLinked: 'This email already has an account. Sign in with your password below.',
  TooManyRequests: 'Too many sign-in attempts. Wait a few minutes and try again.',
}

function errorCopy(code: string): string {
  return ERROR_COPY[code] ?? 'Could not sign you in. Try again.'
}

/**
 * `callbackUrl` arrives from the query string, so it is attacker-supplied.
 * Only same-site paths are followed; anything else would turn the sign-in page
 * into an open redirect. A leading `//` is a protocol-relative URL, not a path.
 */
function safeCallback(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/account'
  return raw
}

export function SignInForm({ hasGoogle }: { hasGoogle: boolean }) {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = safeCallback(params.get('callbackUrl'))
  const authError = params.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<keyof FieldErrors, boolean>>({
    email: false,
    password: false,
  })
  // Seeded rather than set in an effect, so an OAuth failure arrives with the
  // reason already in the markup instead of appearing a frame after hydration.
  const [formError, setFormError] = useState<string | null>(
    authError ? errorCopy(authError) : null,
  )
  const [loading, setLoading] = useState(false)

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    const emailReq = required(email, 'Email')
    if (emailReq) next.email = emailReq
    else if (!isEmail(email)) next.email = 'Enter a valid email address.'
    const pwReq = required(password, 'Password')
    if (pwReq) next.password = pwReq
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
    setTouched({ email: true, password: true })
    if (Object.keys(v).length > 0) return

    setFormError(null)
    setLoading(true)
    const res = await signIn('credentials', {
      email: email.trim(),
      password,
      redirect: false,
    })
    if (res?.error) {
      setLoading(false)
      setFormError(errorCopy(res.error))
      return
    }
    // Left loading through the navigation, so the button does not flick back to
    // its resting state while the route is still resolving.
    //
    // The guest cart is merged by the NextAuth `signIn` event, which covers
    // Google too. Doing it here as well would only cover this one form.
    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <AuthShell eyebrow="Welcome back" title="Sign in.">
      {formError ? <AuthAlert>{formError}</AuthAlert> : null}

      {hasGoogle ? (
        <>
          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl })}
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
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(v) => {
              setPassword(v)
              if (touched.password) setErrors(validate())
            }}
            onBlur={() => markTouched('password')}
            error={touched.password ? errors.password : null}
            trailing={<PasswordToggle revealed={revealed} onToggle={() => setRevealed((r) => !r)} />}
          />
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-[13px] text-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink hover:decoration-ink/30"
            >
              Forgot password?
            </Link>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className={cn(authButton, authButtonPrimary, 'mt-6')}
        >
          {loading ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <p className="mt-7 text-center text-[13px] text-muted">
        New to Tech X?{' '}
        <Link
          href="/signup"
          className="font-medium text-accent underline decoration-accent/35 underline-offset-4 transition-colors hover:decoration-accent"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  )
}
