'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { LoaderCircle } from 'lucide-react'
import { AuthAlert, PasswordToggle, authButton, authButtonPrimary } from '@/components/auth/auth-parts'
import { TextField } from '@/components/ui/field'
import { api } from '@/lib/api-client'
import { checkPassword, required } from '@/lib/validators'
import { cn } from '@/lib/utils'

interface ChangePasswordFormProps {
  /** The address to re-authenticate with once the password has moved. */
  email: string
  /** Google-only accounts have no current password to prove. */
  hasPassword: boolean
}

interface FieldErrors {
  currentPassword?: string
  newPassword?: string
}

export function ChangePasswordForm({ email, hasPassword }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<keyof FieldErrors, boolean>>({
    currentPassword: false,
    newPassword: false,
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    const cur = required(currentPassword, 'Current password')
    if (cur) next.currentPassword = cur

    const req = required(newPassword, 'New password')
    if (req) next.newPassword = req
    else {
      const c = checkPassword(newPassword)
      if (!c.ok && c.reason) next.newPassword = c.reason
      else if (newPassword === currentPassword) {
        next.newPassword = 'Choose a password you are not already using.'
      }
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
    setTouched({ currentPassword: true, newPassword: true })
    if (Object.keys(v).length > 0) return

    setFormError(null)
    setLoading(true)
    const res = await api('/api/v1/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    })

    if (!res.ok) {
      setLoading(false)
      setFormError(res.error?.message ?? 'Could not change your password.')
      return
    }

    /*
     * The write stamped `password_changed_at`, which invalidates every session
     * carrying the old stamp - starting with this one. Signing in again mints a
     * token with the new value, so the customer stays where they are instead of
     * being thrown to /signin by their own password change.
     *
     * Other devices keep the old stamp and are signed out on their next
     * request, which is the point.
     */
    const reauth = await signIn('credentials', {
      email,
      password: newPassword,
      redirect: false,
    })
    setLoading(false)

    if (reauth?.error) {
      // The password did change. Nothing is broken, but this session is now
      // running on a stamp the server will reject, so say so plainly.
      setFormError('Password changed, but this device was signed out. Sign in again.')
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setTouched({ currentPassword: false, newPassword: false })
    toast('Password changed. Other devices have been signed out.')
  }

  if (!hasPassword) {
    return (
      <div className="mt-8 max-w-[32rem] rounded-[var(--radius)] border border-line bg-surface p-6">
        <p className="text-[14px] leading-[1.6] text-ink-soft">
          This account signs in with Google, so there is no password to change. You can set one
          through the reset flow - it sends a link to your email.
        </p>
        <Link
          href="/forgot-password"
          className="mt-5 inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-ink px-6 py-3 text-[14px] font-medium text-cream transition-colors hover:bg-accent"
        >
          Set a password
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-8 max-w-[26rem]">
      {formError ? <AuthAlert>{formError}</AuthAlert> : null}

      <form onSubmit={handleSubmit} noValidate aria-busy={loading} className="space-y-4">
        <TextField
          label="Current password"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(v) => {
            setCurrentPassword(v)
            if (touched.currentPassword) setErrors(validate())
          }}
          onBlur={() => markTouched('currentPassword')}
          error={touched.currentPassword ? errors.currentPassword : null}
        />
        <TextField
          label="New password"
          type={revealed ? 'text' : 'password'}
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(v) => {
            setNewPassword(v)
            if (touched.newPassword) setErrors(validate())
          }}
          onBlur={() => markTouched('newPassword')}
          helper="At least 10 characters with upper, lower, and a digit."
          error={touched.newPassword ? errors.newPassword : null}
          trailing={<PasswordToggle revealed={revealed} onToggle={() => setRevealed((r) => !r)} />}
        />
        <button
          type="submit"
          disabled={loading}
          className={cn(authButton, authButtonPrimary, 'mt-2')}
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

      <p className="mt-6 text-[13px] leading-[1.6] text-muted">
        Changing your password signs out every other device. This one stays signed in.{' '}
        <Link href="/forgot-password" className="text-ink underline underline-offset-4 hover:text-accent">
          Forgotten it?
        </Link>
      </p>
    </div>
  )
}
