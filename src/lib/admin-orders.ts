import 'server-only'
import { and, asc, count, desc, eq, like, lt, or } from 'drizzle-orm'
import { db } from '@/db'
import { orders, type OrderStatus } from '@/db/schema/orders'
import { paymentMethods } from '@/db/schema/payment-methods'
import { users } from '@/db/schema/auth'
import { getSetting } from '@/lib/site-settings'

export const PAGE_SIZE = 25
/** Hard ceiling on a queue group, so one bad day cannot render 500 rows. */
const QUEUE_LIMIT = 50
const STALE_DAYS_KEY = 'orders_stale_days'
const STALE_DAYS_DEFAULT = 3
export const STALE_DAYS_MIN = 1
export const STALE_DAYS_MAX = 30

export interface OrderRow {
  id: string
  status: OrderStatus
  totalMmk: number
  placedAt: string
  updatedAt: string
  userEmail: string
  userName: string | null
  methodKind: 'wallet' | 'cod'
  hasSlip: boolean
  phone: string | null
}

export interface QueueGroups {
  slips: OrderRow[]
  cod: OrderRow[]
  stale: OrderRow[]
}

export interface OrderListPage {
  rows: OrderRow[]
  total: number
  page: number
  pageCount: number
}

/** Columns every order view needs, joined once. */
const ROW_COLUMNS = {
  id: orders.id,
  status: orders.status,
  totalMmk: orders.totalMmk,
  placedAt: orders.placedAt,
  updatedAt: orders.updatedAt,
  userEmail: users.email,
  userName: users.name,
  methodKind: paymentMethods.kind,
  paymentProofUrl: orders.paymentProofUrl,
  phone: orders.shipPhone,
}

type RawRow = {
  id: string
  status: OrderStatus
  totalMmk: number
  placedAt: Date
  updatedAt: Date
  userEmail: string
  userName: string | null
  methodKind: 'wallet' | 'cod'
  paymentProofUrl: string | null
  phone: string | null
}

function toRow(r: RawRow): OrderRow {
  return {
    id: r.id,
    status: r.status,
    totalMmk: Number(r.totalMmk),
    placedAt: r.placedAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    userEmail: r.userEmail,
    userName: r.userName,
    methodKind: r.methodKind,
    hasSlip: Boolean(r.paymentProofUrl),
    phone: r.phone,
  }
}

/** No address join: the phone comes off the order's own shipping snapshot. */
function baseQuery() {
  return db
    .select(ROW_COLUMNS)
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .innerJoin(paymentMethods, eq(paymentMethods.id, orders.paymentMethodId))
}

export async function getStaleDays(): Promise<number> {
  const raw = await getSetting(STALE_DAYS_KEY)
  if (raw === null || raw.trim() === '') return STALE_DAYS_DEFAULT
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return STALE_DAYS_DEFAULT
  return Math.min(STALE_DAYS_MAX, Math.max(STALE_DAYS_MIN, Math.trunc(parsed)))
}

/**
 * Orders waiting on the operator, in one query.
 *
 * - slips: payment_submitted, needs the slip cross-checked
 * - cod:   pending_payment on a COD method, needs a phone call
 * - stale: confirmed longer than `staleDays` ago, never marked delivered
 *
 * Wallet orders sitting in pending_payment are excluded: only the customer
 * can move those, and they auto-cancel after 24h.
 */
export async function getQueue(staleDays: number): Promise<QueueGroups> {
  const staleBefore = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000)

  const rows = (await baseQuery()
    .where(
      or(
        eq(orders.status, 'payment_submitted'),
        and(eq(orders.status, 'pending_payment'), eq(paymentMethods.kind, 'cod')),
        and(eq(orders.status, 'confirmed'), lt(orders.placedAt, staleBefore)),
      ),
    )
    .orderBy(asc(orders.placedAt))
    .limit(QUEUE_LIMIT * 3)) as RawRow[]

  const groups: QueueGroups = { slips: [], cod: [], stale: [] }
  for (const raw of rows) {
    const row = toRow(raw)
    if (row.status === 'payment_submitted') groups.slips.push(row)
    else if (row.status === 'pending_payment') groups.cod.push(row)
    else groups.stale.push(row)
  }

  return {
    slips: groups.slips.slice(0, QUEUE_LIMIT),
    cod: groups.cod.slice(0, QUEUE_LIMIT),
    stale: groups.stale.slice(0, QUEUE_LIMIT),
  }
}

/** All-time count per status, for the filter chips. */
export async function getStatusCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: orders.status, n: count() })
    .from(orders)
    .groupBy(orders.status)

  const out: Record<string, number> = {}
  let total = 0
  for (const r of rows) {
    out[r.status] = Number(r.n)
    total += Number(r.n)
  }
  out.all = total
  return out
}

/** LIKE is a literal match here - escape the wildcards a user can type. Exported for tests. */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (c) => `\\${c}`)
}

export interface ListParams {
  status?: OrderStatus
  q?: string
  page: number
}

export async function getOrderPage({ status, q, page }: ListParams): Promise<OrderListPage> {
  const filters = []
  if (status) filters.push(eq(orders.status, status))

  const term = q?.trim()
  if (term) {
    const escaped = escapeLike(term)
    filters.push(
      or(
        like(orders.id, `${escaped}%`),
        like(users.email, `%${escaped}%`),
        like(users.name, `%${escaped}%`),
      ),
    )
  }

  const where = filters.length > 0 ? and(...filters) : undefined

  const [[totals], rows] = await Promise.all([
    db
      .select({ n: count() })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.userId))
      .innerJoin(paymentMethods, eq(paymentMethods.id, orders.paymentMethodId))
      .where(where),
    baseQuery()
      .where(where)
      .orderBy(desc(orders.placedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
  ])

  const total = Number(totals?.n ?? 0)
  return {
    rows: (rows as RawRow[]).map(toRow),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  }
}

/** Guards an untrusted `?status=` value from the URL. */
export function parseStatus(value: string | undefined): OrderStatus | undefined {
  const allowed: OrderStatus[] = [
    'pending_payment',
    'payment_submitted',
    'confirmed',
    'delivered',
    'cancelled',
  ]
  return allowed.find((s) => s === value)
}

export function parsePage(value: string | undefined): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 ? Math.trunc(n) : 1
}
