// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Product } from '@/lib/types'
import { ComparePicker } from './compare-picker'

function product(over: Partial<Product> = {}): Product {
  return {
    id: over.slug ?? 'p1',
    slug: 'p1',
    name: 'Product One',
    category: 'mice',
    price: 130_000,
    salePrice: null,
    tagline: 'Light where it counts.',
    description: 'A featherweight wireless mouse.',
    specs: [],
    swatch: '#111111',
    inStock: true,
    hasPhotos: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

const CURRENT = product({ slug: 'superlight-2', name: 'Superlight 2' })

afterEach(cleanup)

describe('ComparePicker', () => {
  it('renders nothing when the category holds no other product', () => {
    const { container } = render(<ComparePicker current={CURRENT} others={[]} label="Compare" />)
    expect(container.innerHTML).toBe('')
  })

  it('offers one link per rival, with the current product pinned to the left', () => {
    render(
      <ComparePicker
        current={CURRENT}
        others={[
          product({ slug: 'viper-v3', name: 'Viper V3' }),
          product({ slug: 'mx-master-4', name: 'MX Master 4' }),
        ]}
        label="Compare"
      />,
    )

    expect(screen.getByRole('link', { name: 'Viper V3' }).getAttribute('href')).toBe(
      '/compare?a=superlight-2&b=viper-v3',
    )
    expect(screen.getByRole('link', { name: 'MX Master 4' }).getAttribute('href')).toBe(
      '/compare?a=superlight-2&b=mx-master-4',
    )
  })

  it('escapes a slug rather than letting it add query parameters', () => {
    render(
      <ComparePicker
        current={product({ slug: 'a&b=evil', name: 'Odd One' })}
        others={[product({ slug: 'viper-v3', name: 'Viper V3' })]}
        label="Compare"
      />,
    )
    expect(screen.getByRole('link', { name: 'Viper V3' }).getAttribute('href')).toBe(
      '/compare?a=a%26b%3Devil&b=viper-v3',
    )
  })

  it('names the count on the trigger so the control says what it opens', () => {
    render(
      <ComparePicker
        current={CURRENT}
        others={[product({ slug: 'viper-v3' }), product({ slug: 'mx-master-4' })]}
        label="Compare"
      />,
    )
    expect(screen.getByText('Compare')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
  })
})
