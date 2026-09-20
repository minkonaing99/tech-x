'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { Stars } from './stars'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api-client'

interface Review {
  id: string
  rating: number
  title: string | null
  body: string
  verifiedPurchase: boolean
  createdAt: string
  userName: string | null
}

interface ReviewBlockProps {
  slug: string
}

export function ReviewBlock({ slug }: ReviewBlockProps) {
  const session = useSession()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // `api` unwraps the envelope and answers `data: null` on a failure or a
    // dead network, so the block settles on "no reviews yet" rather than
    // throwing an unhandled rejection into the page.
    api<Review[]>(`/api/v1/products/${slug}/reviews`)
      .then((res) => setReviews(res.data ?? []))
      .finally(() => setLoading(false))
  }, [slug])

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0

  return (
    <section className="mt-20 border-t border-line pt-12">
      <div className="eyebrow">Reviews</div>
      <div className="mt-3 flex items-end justify-between gap-6">
        <div>
          <h2 className="font-display text-[28px] text-ink md:text-[36px]">
            {reviews.length === 0
              ? 'No reviews yet.'
              : `${avg.toFixed(1)} out of 5`}
          </h2>
          {reviews.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <Stars value={avg} size={16} />
              <span className="text-[13px] text-muted">
                {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          )}
        </div>
        {session.status === 'authenticated' ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-[var(--radius-pill)] border border-line bg-cream px-4 py-2 text-[13px] font-medium text-ink hover:border-ink/40"
          >
            {open ? 'Cancel' : 'Write a review'}
          </button>
        ) : (
          <Link
            href={`/signin?callbackUrl=/product/${slug}`}
            className="text-[13px] text-accent underline underline-offset-4"
          >
            Sign in to review
          </Link>
        )}
      </div>

      {open && <ReviewForm slug={slug} onDone={() => setOpen(false)} />}

      <div className="mt-10 space-y-6">
        {loading ? (
          <p className="text-[14px] text-muted">Loading…</p>
        ) : (
          reviews.map((r) => <ReviewCard key={r.id} review={r} />)
        )}
      </div>
    </section>
  )
}

interface ReviewFormProps {
  slug: string
  onDone: () => void
}

function ReviewForm({ slug, onDone }: ReviewFormProps) {
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (body.trim().length < 10) {
      toast('Review must be at least 10 characters.')
      return
    }
    setSaving(true)
    const res = await api(`/api/v1/products/${slug}/reviews`, {
      method: 'POST',
      body: JSON.stringify({
        rating,
        title: title || undefined,
        body,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      toast(res.error?.message ?? 'Failed to submit review.')
      return
    }
    toast("Thanks - your review is awaiting moderation.")
    setTitle('')
    setBody('')
    onDone()
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 rounded-[var(--radius-lg)] border border-line bg-surface p-6"
    >
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-muted">Rating</span>
        <Stars value={rating} interactive onChange={setRating} size={22} />
      </div>
      <label className="mt-4 block">
        <span className="text-[12px] text-muted">Title (optional)</span>
        <input
          type="text"
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-[var(--radius)] border border-line bg-cream px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-ink/40"
        />
      </label>
      <label className="mt-3 block">
        <span className="text-[12px] text-muted">Your review (10–2000 chars)</span>
        <textarea
          rows={5}
          required
          minLength={10}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 2000))}
          className="mt-1 w-full rounded-[var(--radius)] border border-line bg-cream px-3.5 py-2.5 text-[14px] focus:outline-none focus:border-ink/40"
        />
        <span className="mt-1 block text-right text-[11px] text-muted">{body.length}/2000</span>
      </label>
      <button
        type="submit"
        disabled={saving}
        className="mt-4 inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-ink px-6 py-2.5 text-[13px] font-medium text-cream transition-colors hover:bg-accent disabled:opacity-60"
      >
        {saving ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  )
}

function ReviewCard({ review }: { review: Review }) {
  const date = new Date(review.createdAt).toLocaleDateString()
  return (
    <article className={cn('border-b border-line pb-6 last:border-b-0 last:pb-0')}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Stars value={review.rating} size={14} />
            {review.verifiedPurchase && (
              <span className="rounded-[var(--radius-pill)] bg-sand px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-ink">
                Verified
              </span>
            )}
          </div>
          {review.title && (
            <h3 className="mt-2 font-display text-[18px] text-ink">{review.title}</h3>
          )}
        </div>
        <span className="text-[12px] text-muted whitespace-nowrap">{date}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-soft">
        {review.body}
      </p>
      <p className="mt-2 text-[12px] text-muted"> - {review.userName ?? 'Customer'}</p>
    </article>
  )
}
