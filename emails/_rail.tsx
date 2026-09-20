import { Column, Row, Text } from '@react-email/components'
import { shortTimestamp } from '@/lib/relative-time'
import { progressSteps, type MethodKind, type ProgressState } from '@/lib/order-status'
import type { OrderStatus } from '@/db/schema/orders'
import * as s from './_styles'

const DOT: Record<ProgressState, string> = {
  done: s.INK,
  current: s.ACCENT,
  todo: s.LINE,
}

const LABEL: Record<ProgressState, string> = {
  done: s.INK_SOFT,
  current: s.INK,
  todo: s.MUTED,
}

interface OrderRailProps {
  status: OrderStatus
  kind: MethodKind
  placedAt: string
  updatedAt: string
}

/**
 * The order rail, rebuilt in tables. The web version is a CSS grid that
 * restacks under a media query; Outlook's Word engine ignores both, so this one
 * is a fixed row of columns that never reflows. Three or four short labels fit
 * the 480px content width at 12px.
 */
export function OrderRail({ status, kind, placedAt, updatedAt }: OrderRailProps) {
  const steps = progressSteps(status, kind)
  if (steps.length === 0) return null

  const width = `${(100 / steps.length).toFixed(4)}%`

  return (
    <Row style={s.rail}>
      {steps.map((step, i) => {
        // Only two timestamps exist on an order, so only the first and the live
        // step can be dated. Middle steps show no time.
        const isCurrent = step.state === 'current'
        const stamp = i === 0 ? placedAt : isCurrent && i > 0 ? updatedAt : null
        const isLast = i === steps.length - 1

        return (
          <Column key={step.status} style={{ ...s.railStep, width }}>
            <Row style={s.railTrack}>
              <Column style={{ ...s.railDotCell, verticalAlign: 'middle' }}>
                <div
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '9px',
                    background: DOT[step.state],
                  }}
                />
              </Column>
              {!isLast && (
                <Column style={{ ...s.railLineCell, verticalAlign: 'middle' }}>
                  <div
                    style={{
                      height: '1px',
                      background: step.state === 'done' ? s.INK : s.LINE,
                    }}
                  />
                </Column>
              )}
            </Row>

            <Text
              style={{
                ...s.railLabel,
                color: LABEL[step.state],
                fontWeight: isCurrent ? 600 : 400,
              }}
            >
              {step.label}
            </Text>
            {stamp && <Text style={s.railDate}>{shortTimestamp(stamp)}</Text>}
          </Column>
        )
      })}
    </Row>
  )
}

export default OrderRail
