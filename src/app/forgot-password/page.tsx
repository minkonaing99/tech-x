import type { Metadata } from 'next'
import { ForgotPasswordForm } from './forgot-password-form'

export const metadata: Metadata = {
  title: 'Forgot password',
  // Nothing here is worth a search result, and the page only makes sense to
  // someone who arrived from /signin.
  robots: { index: false, follow: true },
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
