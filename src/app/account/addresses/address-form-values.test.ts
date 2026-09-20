import { describe, expect, it } from 'vitest'
import { EMPTY, toPayload, validate, type AddressForm } from './address-form-values'

/** A form the customer has filled in correctly, for tests to bend one field of. */
const FILLED: AddressForm = {
  label: 'Home',
  recipient: 'Tommy',
  phone: '9787753307',
  divisionId: 'naypyidaw',
  city: 'Naypyidaw',
  township: 'Naypyidaw',
  street: 'No 23.',
  landmark: '',
  telegramUsername: '',
  mapsUrl: '',
  isDefault: false,
}

describe('validate', () => {
  it('passes a complete form', () => {
    expect(validate(FILLED)).toEqual({})
  })

  it('flags every required field on an empty form', () => {
    const errors = validate(EMPTY)
    expect(Object.keys(errors).sort()).toEqual([
      'city',
      'divisionId',
      'phone',
      'recipient',
      'street',
      'township',
    ])
  })

  it('flags a phone that is not a Myanmar mobile number', () => {
    expect(validate({ ...FILLED, phone: '123' }).phone).toBeTruthy()
  })

  it('judges the optional fields only once something has been typed', () => {
    expect(validate({ ...FILLED, telegramUsername: '', mapsUrl: '' })).toEqual({})
    expect(validate({ ...FILLED, telegramUsername: '4chan' }).telegramUsername).toBeTruthy()
    expect(validate({ ...FILLED, mapsUrl: 'https://example.com' }).mapsUrl).toBeTruthy()
  })

  it('accepts a pasted telegram link and a real maps link', () => {
    expect(validate({ ...FILLED, telegramUsername: 't.me/dreaddoc99' })).toEqual({})
    expect(validate({ ...FILLED, mapsUrl: 'https://maps.app.goo.gl/abc' })).toEqual({})
  })
})

describe('toPayload', () => {
  it('sends the phone in stored E.164 form', () => {
    expect(toPayload(FILLED).phone).toBe('+959787753307')
  })

  it('strips a pasted telegram link down to the handle', () => {
    expect(toPayload({ ...FILLED, telegramUsername: 't.me/dreaddoc99' }).telegramUsername).toBe(
      'dreaddoc99',
    )
  })

  it('clears a blank optional field as null, never an empty string', () => {
    const payload = toPayload(FILLED)
    expect(payload.landmark).toBeNull()
    expect(payload.telegramUsername).toBeNull()
    expect(payload.mapsUrl).toBeNull()
  })

  it('trims a maps link rather than storing the whitespace', () => {
    expect(toPayload({ ...FILLED, mapsUrl: '  https://maps.app.goo.gl/abc  ' }).mapsUrl).toBe(
      'https://maps.app.goo.gl/abc',
    )
  })

  it('carries the default flag through', () => {
    expect(toPayload({ ...FILLED, isDefault: true }).isDefault).toBe(true)
  })

  it('drops the id, which belongs in the URL and not the body', () => {
    const payload = toPayload({ ...FILLED, id: 'abc' })
    expect('id' in payload).toBe(false)
  })
})
