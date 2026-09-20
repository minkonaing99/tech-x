/**
 * Set a user's password directly in the database.
 *
 *   npm run user:password -- <email>
 *
 * Also marks the account verified, so a stalled signup can sign in. There is no
 * self-service password reset, so this is the recovery path for the owner's own
 * admin login - keep it. Local/operator use only: no auth check here.
 *
 * The password is prompted for, never passed as an argument. An argv password
 * is readable by any user on the box through `ps`, and lands in shell history.
 */
import { createInterface } from 'node:readline'
import { stdin, stdout } from 'node:process'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema/auth'

const MIN_LENGTH = 10

/** Read one line with terminal echo suppressed, so the password is not shown. */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout, terminal: true })
    const asHidden = rl as unknown as { _writeToOutput?: (text: string) => void }
    const original = asHidden._writeToOutput?.bind(rl)
    asHidden._writeToOutput = (text: string) => {
      // Echo the prompt itself, swallow everything typed after it.
      if (text.startsWith(question)) original?.(text)
    }
    rl.question(question, (answer) => {
      asHidden._writeToOutput = original
      stdout.write('\n')
      rl.close()
      resolve(answer)
    })
  })
}

async function main() {
  const [email] = process.argv.slice(2)

  if (!email) {
    console.error('Usage: npm run user:password -- <email>')
    process.exit(1)
  }

  const password = await promptHidden(`New password for ${email}: `)

  if (password.length < MIN_LENGTH) {
    console.error(`Password must be at least ${MIN_LENGTH} characters - sign-in rejects shorter.`)
    process.exit(1)
  }

  const normalised = email.trim().toLowerCase()
  const [user] = await db.select().from(users).where(eq(users.email, normalised)).limit(1)

  if (!user) {
    console.error(`No account for ${normalised}`)
    process.exit(1)
  }

  await db
    .update(users)
    .set({
      passwordHash: await bcrypt.hash(password, 12),
      emailVerified: user.emailVerified ?? new Date(),
      // Every writer of `password_hash` stamps this, or the change does not
      // reach sessions already issued - see the jwt callback in src/lib/auth.ts.
      // Setting a password here therefore signs the account out everywhere,
      // which is what you want from a recovery tool.
      passwordChangedAt: new Date(),
    })
    .where(eq(users.id, user.id))

  console.log(`Password updated for ${normalised} (role: ${user.role}).`)
  process.exit(0)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
