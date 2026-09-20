import { Link, Section, Text } from '@react-email/components'
import * as s from './_styles'

/** Dark editorial sign-off shared by customer order emails. */
export function EmailFooter() {
  return (
    <Section style={s.footer}>
      <Text style={s.footerMark}>Tech X</Text>
      <Text style={s.footerTag}>Technology, made clear.</Text>
      <Text style={s.footerMeta}>
        Mandalay, Myanmar · Reply to this email and a human answers. Backup contact on{' '}
        <Link href="https://t.me/techxitstore" style={s.footerLink}>
          Telegram
        </Link>
        .
      </Text>
    </Section>
  )
}

export default EmailFooter
