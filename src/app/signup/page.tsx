import type { Metadata } from 'next'
import { SignUpForm } from './signup-form'

export const metadata: Metadata = { title: 'Sign up' }

export default function SignupPage() {
  const hasGoogle = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)
  return <SignUpForm hasGoogle={hasGoogle} />
}
