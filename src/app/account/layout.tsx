import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { SignOutButton } from '@/components/account/sign-out-button'

const NAV = [
  { href: '/account', label: 'Overview' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/wishlist', label: 'Wishlist' },
  { href: '/account/password', label: 'Password' },
] as const

export const dynamic = 'force-dynamic'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin?callbackUrl=/account')

  return (
    <section className="container-prose py-16 md:py-20">
      <div className="eyebrow">Account</div>
      <h1 className="mt-3 font-display text-[40px] leading-[1.05] text-ink md:text-[48px]">
        {session.user.name ?? session.user.email ?? 'Hello.'}
      </h1>

      <div className="mt-10 grid items-start gap-10 md:grid-cols-[240px_1fr] md:gap-14">
        <nav className="flex md:flex-col gap-1 border-y border-line py-3 md:border-y-0 md:border-r md:pr-6">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded px-3 py-2 text-[14px] text-ink-soft hover:bg-line hover:text-ink"
            >
              {n.label}
            </Link>
          ))}
          <SignOutButton />
        </nav>
        <div>{children}</div>
      </div>
    </section>
  )
}
