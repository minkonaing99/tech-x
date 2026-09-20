import { z } from 'zod'
import {
  MAPS_URL_MAX,
  PHONE_REGEX,
  TELEGRAM_MAX,
  isGoogleMapsUrl,
  isTelegramUsername,
  normalizeTelegramUsername,
} from './validators'

/**
 * The recipient phone, required by all three address writers (add, edit,
 * checkout). Lives here for the same reason the two below do: three copies of
 * the rule is three chances for them to stop agreeing.
 */
export const phoneField = z
  .string()
  .regex(PHONE_REGEX, 'Phone must be +959XXXXXXXXX')
  .max(20)

/**
 * The two optional contact extras, defined once so the address routes and the
 * checkout order route cannot drift into validating them differently.
 *
 * Both normalise an empty string to `null`: the forms send `''` for an
 * untouched optional field, and storing that as a value makes "no handle" and
 * "blank handle" two different states for no reason.
 */
export const optionalTelegram = z
  .string()
  .max(TELEGRAM_MAX + 20) // room for a pasted `https://t.me/` prefix
  .optional()
  .nullable()
  .transform((v) => {
    const normalized = normalizeTelegramUsername(v ?? '')
    return normalized.length === 0 ? null : normalized
  })
  .refine((v) => v === null || isTelegramUsername(v), {
    message: 'Telegram handle must be 5-32 letters, digits or underscores, starting with a letter.',
  })

export const optionalMapsUrl = z
  .string()
  .max(MAPS_URL_MAX)
  .optional()
  .nullable()
  .transform((v) => {
    const trimmed = (v ?? '').trim()
    return trimmed.length === 0 ? null : trimmed
  })
  .refine((v) => v === null || isGoogleMapsUrl(v), {
    message: 'Paste a Google Maps link (https://maps.app.goo.gl/... or google.com/maps/...).',
  })
