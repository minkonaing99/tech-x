import 'server-only'
import { cookies } from 'next/headers'
import { randomUUID } from 'node:crypto'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { carts, cartItems } from '@/db/schema/carts'
import { products } from '@/db/schema/products'
import { auth } from './auth'
import { clampQty } from './utils'
import { QTY_MAX, QTY_MIN } from './types'

const COOKIE_NAME = 'mxl_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export interface CartLine {
  productId: string
  qty: number
  product: {
    id: string
    slug: string
    name: string
    tagline: string
    priceMmk: number
    salePriceMmk: number | null
    swatch: string
    hasPhotos: boolean
    stockQty: number
    isActive: boolean
  }
}

async function getOrCreateSessionId(): Promise<string> {
  const jar = await cookies()
  const existing = jar.get(COOKIE_NAME)?.value
  if (existing) return existing
  const id = randomUUID()
  jar.set({
    name: COOKIE_NAME,
    value: id,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
  return id
}

async function getOrCreateCart(): Promise<{ cartId: string; userId: string | null }> {
  const session = await auth()
  const userId = session?.user?.id ?? null

  if (userId) {
    const [existing] = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1)
    if (existing) return { cartId: existing.id, userId }
    const id = randomUUID()
    await db.insert(carts).values({ id, userId, sessionId: null })
    return { cartId: id, userId }
  }

  const sid = await getOrCreateSessionId()
  const [existing] = await db
    .select()
    .from(carts)
    .where(and(eq(carts.sessionId, sid), isNull(carts.userId)))
    .limit(1)
  if (existing) return { cartId: existing.id, userId: null }
  const id = randomUUID()
  await db.insert(carts).values({ id, userId: null, sessionId: sid })
  return { cartId: id, userId: null }
}

export async function getCartLines(): Promise<CartLine[]> {
  const { cartId } = await getOrCreateCart()

  const rows = await db
    .select({
      productId: cartItems.productId,
      qty: cartItems.qty,
      id: products.id,
      slug: products.slug,
      name: products.name,
      tagline: products.tagline,
      priceMmk: products.priceMmk,
      salePriceMmk: products.salePriceMmk,
      swatch: products.swatch,
      hasPhotos: products.hasPhotos,
      stockQty: products.stockQty,
      isActive: products.isActive,
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(eq(cartItems.cartId, cartId))

  return rows.map((r) => ({
    productId: r.productId,
    qty: r.qty,
    product: {
      id: r.id,
      slug: r.slug,
      name: r.name,
      tagline: r.tagline,
      priceMmk: Number(r.priceMmk),
      salePriceMmk: r.salePriceMmk === null ? null : Number(r.salePriceMmk),
      swatch: r.swatch,
      hasPhotos: Boolean(r.hasPhotos),
      stockQty: r.stockQty,
      isActive: Boolean(r.isActive),
    },
  }))
}

export async function addCartItem(productId: string, qty: number): Promise<void> {
  const { cartId } = await getOrCreateCart()
  const safeQty = clampQty(qty, QTY_MIN, QTY_MAX)

  const [existing] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)))
    .limit(1)

  if (existing) {
    const next = clampQty(existing.qty + safeQty, QTY_MIN, QTY_MAX)
    await db
      .update(cartItems)
      .set({ qty: next })
      .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)))
    return
  }

  await db.insert(cartItems).values({ cartId, productId, qty: safeQty })
}

export async function setCartItemQty(productId: string, qty: number): Promise<void> {
  const { cartId } = await getOrCreateCart()

  if (qty <= 0) {
    await db
      .delete(cartItems)
      .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)))
    return
  }

  const safeQty = clampQty(qty, QTY_MIN, QTY_MAX)
  await db
    .update(cartItems)
    .set({ qty: safeQty })
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)))
}

export async function removeCartItem(productId: string): Promise<void> {
  const { cartId } = await getOrCreateCart()
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, productId)))
}

/**
 * Drops the guest cookie so signing out does not leave a cart identity behind
 * for whoever signs in next on the same browser. The row it pointed at is
 * already gone or already owned by the account that just left - `merge` either
 * promotes the guest cart or deletes it - so nothing is orphaned by this.
 */
export async function clearGuestSession(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
}

export async function clearCart(): Promise<void> {
  const { cartId } = await getOrCreateCart()
  await db.delete(cartItems).where(eq(cartItems.cartId, cartId))
}

/**
 * Folds the cookie cart into the signed-in user's. Takes the id rather than
 * reading the session, because the caller that matters is the NextAuth
 * `signIn` event, which fires before the JWT cookie exists - `auth()` there
 * answers null and the merge would quietly do nothing.
 *
 * One transaction, because this is a read, a fan of per-item writes and a
 * delete. Run loose, a failure part way through leaves the guest cart still
 * present with some of its lines already folded in, and the next attempt sums
 * those quantities a second time.
 */
export async function mergeGuestCartToUser(userId: string): Promise<void> {
  if (!userId) return

  const jar = await cookies()
  const sid = jar.get(COOKIE_NAME)?.value
  if (!sid) return

  await db.transaction(async (tx) => {
    // Locked, so a second sign-in arriving on the same cookie waits here and
    // then finds the cart already claimed rather than racing this one.
    const [guestCart] = await tx
      .select()
      .from(carts)
      .where(and(eq(carts.sessionId, sid), isNull(carts.userId)))
      .limit(1)
      .for('update')
    if (!guestCart) return

    const [userCart] = await tx.select().from(carts).where(eq(carts.userId, userId)).limit(1)

    if (!userCart) {
      // promote guest cart to user cart
      await tx.update(carts).set({ userId, sessionId: null }).where(eq(carts.id, guestCart.id))
      return
    }

    const guestItems = await tx.select().from(cartItems).where(eq(cartItems.cartId, guestCart.id))

    if (guestItems.length > 0) {
      /*
       * One statement for the whole cart. The old shape read the account's
       * lines and then ran a write per product, which is unbounded work -
       * nothing caps how many products a cart holds - inside the sign-in
       * event, against a ten-connection pool.
       *
       * The addition is left to the database rather than done here, so two
       * merges landing on one account cannot both read the same before-value
       * and write back the same after-value, losing one of the additions.
       */
      await tx
        .insert(cartItems)
        .values(
          guestItems.map((g) => ({
            cartId: userCart.id,
            productId: g.productId,
            qty: clampQty(g.qty, QTY_MIN, QTY_MAX),
          })),
        )
        .onDuplicateKeyUpdate({
          set: { qty: sql`least(${cartItems.qty} + values(qty), ${QTY_MAX})` },
        })
    }

    await tx.delete(carts).where(eq(carts.id, guestCart.id))
  })
}
