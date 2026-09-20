import { Column, Link, Row } from '@react-email/components'
import type { ReactNode } from 'react'
import * as s from './_styles'

export interface Fact {
  label: string
  value: ReactNode
  /** Renders the value as a link. `tel:` for phones, https for anything else. */
  href?: string | null
}

interface FactListProps {
  facts: Fact[]
}

/** Label/value rows for the owner alerts. Table-based, so Outlook keeps them aligned. */
export function FactList({ facts }: FactListProps) {
  return (
    <>
      {facts.map((f) => (
        <Row key={f.label}>
          <Column style={s.factLabel}>{f.label}</Column>
          <Column style={s.factValue}>
            {f.href ? (
              <Link href={f.href} style={s.factLink}>
                {f.value}
              </Link>
            ) : (
              f.value
            )}
          </Column>
        </Row>
      ))}
    </>
  )
}

export default FactList
