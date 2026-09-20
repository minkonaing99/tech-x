import { describe, expect, it } from 'vitest'
import { ORDER_STATUSES, type OrderStatus } from '@/db/schema/orders'
import {
  TERMINAL_STATUSES,
  allowedTransitions,
  canTransition,
  forwardOptions,
} from './order-transitions'

const KINDS = ['wallet', 'cod'] as const

describe('allowedTransitions', () => {
  it('covers every status for both payment kinds', () => {
    for (const kind of KINDS) {
      for (const status of ORDER_STATUSES) {
        expect(allowedTransitions(status, kind), `${kind}/${status}`).toBeDefined()
      }
    }
  })

  it('lets nothing follow a terminal status', () => {
    for (const kind of KINDS) {
      for (const status of TERMINAL_STATUSES) {
        expect(allowedTransitions(status, kind)).toEqual([])
      }
    }
  })

  it('never points at a status outside the enum', () => {
    for (const kind of KINDS) {
      for (const status of ORDER_STATUSES) {
        for (const next of allowedTransitions(status, kind)) {
          expect(ORDER_STATUSES).toContain(next)
        }
      }
    }
  })
})

describe('wallet flow', () => {
  it('routes payment through the slip step', () => {
    expect(canTransition('pending_payment', 'payment_submitted', 'wallet')).toBe(true)
    expect(canTransition('payment_submitted', 'confirmed', 'wallet')).toBe(true)
    expect(canTransition('confirmed', 'delivered', 'wallet')).toBe(true)
  })

  it('cannot confirm before a slip arrives', () => {
    expect(canTransition('pending_payment', 'confirmed', 'wallet')).toBe(false)
  })

  it('can bounce a bad slip back to pending', () => {
    expect(canTransition('payment_submitted', 'pending_payment', 'wallet')).toBe(true)
  })
})

describe('COD flow', () => {
  it('confirms straight from pending, since the shop phones the buyer', () => {
    expect(canTransition('pending_payment', 'confirmed', 'cod')).toBe(true)
  })

  it('has no slip step at all', () => {
    expect(canTransition('pending_payment', 'payment_submitted', 'cod')).toBe(false)
    expect(allowedTransitions('payment_submitted', 'cod')).toEqual([])
  })
})

describe('cancelling', () => {
  it('is reachable from every live status', () => {
    const live = ORDER_STATUSES.filter(
      (s): s is OrderStatus => !TERMINAL_STATUSES.includes(s),
    )
    for (const kind of KINDS) {
      for (const status of live) {
        // payment_submitted is unreachable under COD, so it has no exits.
        if (kind === 'cod' && status === 'payment_submitted') continue
        expect(canTransition(status, 'cancelled', kind), `${kind}/${status}`).toBe(true)
      }
    }
  })

  it('is terminal - no path back out', () => {
    for (const kind of KINDS) {
      for (const status of ORDER_STATUSES) {
        if (status === 'cancelled') continue
        expect(canTransition('cancelled', status, kind)).toBe(false)
      }
    }
  })
})

describe('forwardOptions (admin list dropdown)', () => {
  it('never offers cancel as a new choice - that lives on the detail page behind a confirm', () => {
    for (const kind of KINDS) {
      for (const status of ORDER_STATUSES) {
        // Index 0 is the current status, which the select needs as its value;
        // everything after it is a move the operator can make.
        const moves = forwardOptions(status, kind).slice(1)
        expect(moves, `${kind}/${status}`).not.toContain('cancelled')
      }
    }
  })

  it('always includes the current status so the select has a value', () => {
    for (const kind of KINDS) {
      for (const status of ORDER_STATUSES) {
        expect(forwardOptions(status, kind)[0]).toBe(status)
      }
    }
  })

  it('leaves terminal rows with nothing to change', () => {
    expect(forwardOptions('delivered', 'wallet')).toEqual(['delivered'])
    expect(forwardOptions('cancelled', 'cod')).toEqual(['cancelled'])
  })
})

describe('same-status writes', () => {
  it('are allowed, so a no-op PATCH is not a 409', () => {
    for (const kind of KINDS) {
      for (const status of ORDER_STATUSES) {
        expect(canTransition(status, status, kind)).toBe(true)
      }
    }
  })
})
