/**
 * Shared inline styles for React Email templates.
 * Tech X palette; mirrors the storefront tokens.
 */
export const body = {
  background: '#ffffff',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  margin: 0,
  padding: '32px 16px',
  color: '#0b0f14',
}
export const container = {
  background: '#f5f7fa',
  border: '1px solid #dfe4eb',
  borderRadius: '12px',
  margin: '0 auto',
  maxWidth: '560px',
  padding: '40px',
}
export const brand = { marginBottom: '20px' }
export const mark = {
  margin: 0,
  fontSize: '14px',
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  color: '#586171',
}
export const h1 = {
  fontFamily: "'Manrope', Arial, sans-serif",
  fontSize: '28px',
  margin: '0 0 12px',
  fontWeight: 500 as const,
  letterSpacing: '-0.01em',
}
export const p = { fontSize: '15px', lineHeight: '24px', color: '#374151', margin: '8px 0' }
export const hr = { borderTop: '1px solid #dfe4eb', margin: '24px 0' }
export const code = {
  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
  background: '#ffffff',
  padding: '2px 6px',
  borderRadius: '4px',
  fontSize: '13px',
}

/* ── Tech X brand kit (Manrope headings, Inter body, blue accent) ── */

const sans = "'Manrope', Arial, sans-serif"
const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace'

/**
 * Palette, named. The rail picks its colours per step at render time, so those
 * values cannot live in a static style object.
 */
export const INK = '#0b0f14'
export const INK_SOFT = '#374151'
export const MUTED = '#586171'
export const ACCENT = '#0066ff'
export const LINE = '#dfe4eb'

/** Card shell with no padding so the dark footer can run edge-to-edge. */
export const shell = {
  background: '#f5f7fa',
  border: '1px solid #dfe4eb',
  borderRadius: '14px',
  margin: '0 auto',
  maxWidth: '560px',
  overflow: 'hidden' as const,
}
export const content = { padding: '40px 40px 34px' }
export const eyebrow = {
  margin: 0,
  fontSize: '12px',
  fontWeight: 600 as const,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: '#586171',
}
export const display = {
  fontFamily: sans,
  fontSize: '30px',
  lineHeight: '36px',
  margin: '14px 0 14px',
  fontWeight: 400 as const,
  letterSpacing: '-0.01em',
  color: '#0b0f14',
}
export const lead = { fontSize: '15px', lineHeight: '24px', color: '#374151', margin: '10px 0' }

/* ── Header meta row: `ORDER 1C34B3B6 · paid via KBZ Pay` ── */

export const metaRow = { margin: 0, fontSize: '12px', lineHeight: '18px', color: '#586171' }
export const metaKey = {
  fontSize: '11px',
  fontWeight: 600 as const,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: '#586171',
}
/** The customer-facing order reference: same 8 chars the page and subject use. */
export const metaId = {
  fontFamily: mono,
  fontSize: '13px',
  fontWeight: 600 as const,
  letterSpacing: '0.04em',
  color: '#0b0f14',
}

/* ── Progress rail (table-based: grid and media queries die in Outlook) ── */

export const rail = { width: '100%', margin: '2px 0 0' }
/** Each step owns one fixed-width column; the rail never restacks. */
export const railStep = { verticalAlign: 'top' as const, padding: 0 }
export const railTrack = { width: '100%' }
/** Holds the 9px dot. Font-size 0 stops mail clients adding a text baseline. */
export const railDotCell = {
  width: '14px',
  padding: 0,
  fontSize: '1px',
  lineHeight: '9px',
}
export const railLineCell = { padding: 0, fontSize: '1px', lineHeight: '1px' }
export const railLabel = { margin: '12px 0 0', fontSize: '12px', lineHeight: '16px' }
export const railDate = {
  margin: '3px 0 0',
  fontSize: '11px',
  lineHeight: '15px',
  color: '#586171',
  fontVariantNumeric: 'tabular-nums' as const,
}

/* ── Buttons. Radius squares off in Outlook desktop; the fill survives. ── */

export const buttonPrimary = {
  background: '#0066ff',
  color: '#f5f7fa',
  borderRadius: '12px',
  padding: '13px 26px',
  fontSize: '14px',
  fontWeight: 600 as const,
  letterSpacing: '0.01em',
  textDecoration: 'none',
  display: 'inline-block',
}
export const buttonGhost = {
  ...buttonPrimary,
  background: '#f5f7fa',
  color: '#0b0f14',
  border: '1px solid #dfe4eb',
  padding: '12px 25px',
}
export const buttonRow = { margin: '26px 0 4px' }
export const buttonGap = { width: '10px', fontSize: '1px', lineHeight: '1px' }

/* ── Owner-alert fact rows: label left, value right ── */

export const factLabel = {
  fontSize: '12px',
  lineHeight: '20px',
  color: '#586171',
  padding: '7px 12px 7px 0',
  verticalAlign: 'top' as const,
  width: '96px',
}
export const factValue = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#0b0f14',
  padding: '7px 0',
  verticalAlign: 'top' as const,
}
export const factLink = { color: '#0066ff', textDecoration: 'none', fontWeight: 600 as const }

/** The one number an owner scans for first. */
export const amount = {
  margin: '2px 0 0',
  fontFamily: sans,
  fontSize: '32px',
  lineHeight: '38px',
  color: '#0b0f14',
  fontVariantNumeric: 'tabular-nums' as const,
}

/** Blue-tinted order-id chip. */
export const chip = {
  fontFamily: mono,
  background: '#eaf2ff',
  color: '#0055d6',
  padding: '2px 8px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 600 as const,
  letterSpacing: '0.02em',
}

/* Invoice table (table-based for Outlook/Gmail compat) */
export const cellItem = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#374151',
  padding: '9px 0',
  verticalAlign: 'top' as const,
}
export const cellPrice = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#0b0f14',
  fontWeight: 600 as const,
  textAlign: 'right' as const,
  fontVariantNumeric: 'tabular-nums' as const,
  whiteSpace: 'nowrap' as const,
  padding: '9px 0',
  verticalAlign: 'top' as const,
}
export const cellMeta = { ...cellItem, color: '#586171', padding: '5px 0' }
export const cellMetaPrice = { ...cellPrice, color: '#374151', fontWeight: 500 as const, padding: '5px 0' }
export const totalLabelCell = {
  fontSize: '15px',
  fontWeight: 600 as const,
  color: '#0b0f14',
  padding: '14px 0 0',
}
export const totalValCell = {
  fontSize: '18px',
  fontWeight: 700 as const,
  color: '#0066ff',
  textAlign: 'right' as const,
  fontVariantNumeric: 'tabular-nums' as const,
  whiteSpace: 'nowrap' as const,
  padding: '14px 0 0',
}

/** Bordered callout (cancellation reason, etc.). */
export const noteBox = {
  background: '#ffffff',
  border: '1px solid #dfe4eb',
  borderRadius: '8px',
  padding: '16px 18px',
  margin: '20px 0',
}
export const noteLabel = {
  margin: '0 0 6px',
  fontSize: '11px',
  fontWeight: 600 as const,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color: '#586171',
}
export const noteText = { margin: 0, fontSize: '14px', lineHeight: '22px', color: '#374151' }

/** Account details in the placed email. Selectable text, never an image. */
export const payLine = {
  margin: 0,
  fontSize: '15px',
  lineHeight: '23px',
  color: '#0b0f14',
  fontWeight: 600 as const,
}
export const payAmount = {
  margin: '10px 0 0',
  fontSize: '20px',
  lineHeight: '26px',
  color: '#0066ff',
  fontWeight: 700 as const,
  fontVariantNumeric: 'tabular-nums' as const,
}

export const badge = {
  display: 'inline-block',
  background: '#e9ede2',
  color: '#48603a',
  fontSize: '12px',
  fontWeight: 600 as const,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  padding: '5px 12px',
  borderRadius: '999px',
}
export const ghostLink = { color: '#0066ff', textDecoration: 'none', fontWeight: 600 as const }

/* Dark footer band */
export const footer = { background: '#0b0f14', padding: '26px 40px' }
export const footerMark = {
  margin: 0,
  fontFamily: sans,
  fontSize: '17px',
  color: '#ffffff',
  letterSpacing: '0.02em',
}
export const footerTag = { margin: '6px 0 0', fontSize: '12px', lineHeight: '18px', color: '#9ca3af' }
export const footerLink = { color: '#00c2ff', textDecoration: 'none' }
export const footerMeta = { margin: '14px 0 0', fontSize: '11px', lineHeight: '16px', color: '#9ca3af' }
