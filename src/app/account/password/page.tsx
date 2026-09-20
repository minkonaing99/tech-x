import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema/auth'
import { auth } from '@/lib/auth'
import { ChangePasswordForm } from './change-password-form'

export default async function AccountPasswordPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  // Only whether a password exists, never the hash itself.
  const [row] = await db
    .select({ email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
  if (!row) return null

  return (
    <div>
      <h2 className="font-display text-[28px]">Password</h2>
      <p className="mt-2 text-[14px] text-muted">
        Change the password you use to sign in.
      </p>
      <ChangePasswordForm email={row.email} hasPassword={Boolean(row.passwordHash)} />
    </div>
  )
}
