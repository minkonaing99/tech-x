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

interface PasswordChangedProps {
  signinUrl: string
  contactUrl: string
}

/**
 * Sent after a password actually changes. Carries no link that does anything -
 * a notice that could itself be acted on would just be a second thing worth
 * stealing.
 *
 * This is the tripwire. If someone reached the account through this inbox, the
 * mail below is the only thing that puts that in front of the real owner, so
 * the "if this was not you" line names a route to a human rather than trailing
 * off.
 */
export function PasswordChanged({ signinUrl, contactUrl }: PasswordChangedProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Tech X password was changed</Preview>
      <Body style={st.body}>
        <Container style={container}>
          <Section style={st.brand}>
            <Text style={st.mark}>Tech X</Text>
          </Section>
          <Heading style={st.h1}>Your password changed.</Heading>
          <Text style={p}>
            The password on this account was just reset, and everywhere it was signed in has been
            signed out.
          </Text>
          <Section style={{ textAlign: 'center', margin: '32px 0' }}>
            <Link href={signinUrl} style={button}>
              Sign in
            </Link>
          </Section>
          <Text style={small}>
            If this was not you, someone else has read this inbox.{' '}
            <Link href={contactUrl} style={link}>
              Tell us
            </Link>{' '}
            and change the password on your email account too.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

PasswordChanged.PreviewProps = {
  signinUrl: 'https://example.com/signin',
  contactUrl: 'https://example.com/contact',
} satisfies PasswordChangedProps

export default PasswordChanged

const container = {
  background: '#f5f7fa',
  border: '1px solid #dfe4eb',
  borderRadius: '12px',
  margin: '0 auto',
  maxWidth: '520px',
  padding: '40px',
}

const p = { fontSize: '15px', lineHeight: '24px', color: '#374151' }
const small = { fontSize: '12px', lineHeight: '20px', color: '#586171', marginTop: '24px' }
const link = { color: '#0066ff', textDecoration: 'underline' }
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
