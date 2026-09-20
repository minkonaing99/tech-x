/**
 * Form shape and rules shared by the two places a customer edits an address:
 * the "Add address" form and the inline editor on a saved row. Kept apart from
 * the components so both send the API an identical body.
 */

import {
  PHONE_HINT,
  isGoogleMapsUrl,
  isPhoneLocal,
  isTelegramUsername,
  normalizeTelegramUsername,
  required,
  toE164Phone,
} from '@/lib/validators'

export interface AddressForm {
  id?: string
  label: string
  recipient: string
  phone: string
  divisionId: string
  city: string
  township: string
  street: string
  landmark: string
  telegramUsername: string
  mapsUrl: string
  isDefault: boolean
}

export type FieldKey =
  | 'label'
  | 'recipient'
  | 'phone'
  | 'divisionId'
  | 'city'
  | 'township'
  | 'street'
  | 'telegramUsername'
  | 'mapsUrl'
export type Errors = Partial<Record<FieldKey, string>>
export type Touched = Partial<Record<FieldKey, boolean>>

export const EMPTY: AddressForm = {
  label: 'Home',
  recipient: '',
  phone: '',
  divisionId: '',
  city: '',
  township: '',
  street: '',
  landmark: '',
  telegramUsername: '',
  mapsUrl: '',
  isDefault: false,
}

export const ALL_TOUCHED: Touched = {
  label: true,
  recipient: true,
  phone: true,
  divisionId: true,
  city: true,
  township: true,
  street: true,
  telegramUsername: true,
  mapsUrl: true,
}

export function validate(values: AddressForm): Errors {
  const next: Errors = {}
  const label = required(values.label, 'Label')
  if (label) next.label = label
  const recipient = required(values.recipient, 'Recipient name')
  if (recipient) next.recipient = recipient
  const phone = required(values.phone, 'Phone')
  if (phone) next.phone = phone
  else if (!isPhoneLocal(values.phone)) next.phone = PHONE_HINT
  const division = required(values.divisionId, 'Division')
  if (division) next.divisionId = 'Choose a division.'
  const city = required(values.city, 'City')
  if (city) next.city = city
  const township = required(values.township, 'Township')
  if (township) next.township = township
  const street = required(values.street, 'Street')
  if (street) next.street = street
  // Both optional: only judged once something has been typed.
  if (values.telegramUsername.trim() && !isTelegramUsername(values.telegramUsername)) {
    next.telegramUsername = '5-32 letters, digits or underscores, starting with a letter.'
  }
  if (values.mapsUrl.trim() && !isGoogleMapsUrl(values.mapsUrl)) {
    next.mapsUrl = 'Must be a Google Maps link.'
  }
  return next
}

/**
 * Form state -> request body. The id addresses the row through the URL, so it
 * is dropped here rather than sent twice.
 */
export function toPayload(values: AddressForm) {
  const rest = { ...values }
  delete rest.id
  return {
    ...rest,
    phone: toE164Phone(values.phone),
    landmark: values.landmark || null,
    telegramUsername: normalizeTelegramUsername(values.telegramUsername) || null,
    mapsUrl: values.mapsUrl.trim() || null,
  }
}
