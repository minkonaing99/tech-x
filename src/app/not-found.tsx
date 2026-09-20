import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="container-prose py-24 text-center md:py-32">
      <div className="eyebrow">404</div>
      <h1 className="mt-3 font-display text-[44px] leading-[1.05] text-ink md:text-[60px]">
        Not found.
      </h1>
      <p className="mx-auto mt-4 max-w-[40ch] text-[15px] text-ink-soft">
        That page doesn&rsquo;t exist or has been moved. Try the shop instead.
      </p>
      <Link
        href="/shop"
        className="mt-8 inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-ink px-6 py-3 text-[14px] font-medium text-cream transition-colors hover:bg-accent"
      >
        Visit the shop
      </Link>
    </section>
  )
}
