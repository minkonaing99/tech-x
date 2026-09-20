import Link from 'next/link'
import { redirect } from 'next/navigation'
import { currentRole } from '@/lib/admin-guard'

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/payment-methods', label: 'Payment methods' },
  { href: '/admin/divisions', label: 'Divisions' },
  { href: '/admin/branding', label: 'Branding' },
] as const

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await currentRole()
  if (!actor) redirect('/signin?callbackUrl=/admin')
  if (actor.role !== 'admin') redirect('/account')

  return (
    <section className="container-prose py-12 md:py-16">
      <div className="eyebrow">Admin</div>
      <h1 className="mt-2 font-display text-[32px] leading-[1.05] md:text-[40px]">
        Tech X studio
      </h1>

      <div className="mt-8 grid items-start gap-10 md:grid-cols-[220px_1fr] md:gap-12">
        <nav className="flex flex-wrap md:flex-col gap-1 border-y border-line py-3 md:border-y-0 md:border-r md:pr-6">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded px-3 py-2 text-[14px] text-ink-soft hover:bg-line hover:text-ink"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div>{children}</div>
      </div>
    </section>
  )
}
