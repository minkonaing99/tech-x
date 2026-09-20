import { getAllProducts } from '@/lib/catalog'
import { SearchInner } from './search-inner'

export const metadata = {
  title: 'Search',
  description: 'Search every peripheral on the bench.',
}

export const dynamic = 'force-dynamic'

export default async function SearchPage() {
  const products = await getAllProducts()
  return <SearchInner products={products} />
}
