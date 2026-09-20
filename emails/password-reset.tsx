import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as st from './_styles'

interface PasswordResetProps {
  resetUrl: string
  ttlMinutes: number
}

/**
 * Sibling of `verify-email.tsx`, deliberately in the same plain shape - both
 * are a single link and nothing else, so neither buries the one thing the
 * recipient came for.
 *
 * The last line matters more here than it does there. This mail is what an
 * account takeover looks like from the victim's inbox, so it has to say plainly
 * that ignoring it leaves the password alone.
 */
export function PasswordReset({ resetUrl, ttlMinutes }: PasswordResetProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your Tech X password</Preview>
      <Body style={st.body}>
        <Container style={container}>
          <Section style={st.brand}>
            <Text style={st.mark}>Tech X</Text>
          </Section>
          <Heading style={st.h1}>Reset your password.</Heading>
          <Text style={p}>
            Someone asked for a password reset on this address. Choose a new one here.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Link href={resetUrl} style={button}>
              Choose a new password
            </Link>
          </Section>
          <Text style={small}>
            The link expires in {ttlMinutes} minutes, and works once. Asking for another reset
            replaces it.
          </Text>
          <Text style={small}>
            If this was not you, ignore this email - your password has not changed, and nobody can
            sign in without opening the link above.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

PasswordReset.PreviewProps = {
  resetUrl: 'https://example.com/reset-password?token=abc&email=you@example.com',
  ttlMinutes: 15,
} satisfies PasswordResetProps

export default PasswordReset

const container = {
  background: '#f5f7fa',
  border: '1px solid #dfe4eb',
  borderRadius: '12px',
  margin: '0 auto',
  maxWidth: '520px',
  padding: '40px',
}

const p = { fontSize: '15px', lineHeight: '24px', color: '#374151' }
const small = { fontSize: '12px', color: '#586171', marginTop: '24px' }
const button = {
  background: '#0b0f14',
  color: '#ffffff',
  borderRadius: '999px',
  padding: '12px 24px',
  fontSize: '14px',
  fontWeight: 500 as const,
  textDecoration: 'none',
  display: 'inline-block',
}
