'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { formatMmk } from '@/lib/money'

interface Row {
  id: string
  name: string
  deliveryFeeMmk: number
  codAllowed: boolean
  isBlocked: boolean
  sortOrder: number
}

export function DivisionTable({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial)

  function update(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  async function save(id: string, patch: Partial<Row>) {
    const res = await api(`/api/v1/admin/divisions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    if (!res.ok) toast(res.error?.message ?? 'Save failed.')
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.06em] text-muted">
            <th className="py-3 pr-3">Division</th>
            <th className="py-3 px-3 w-[160px]">Fee (MMK)</th>
            <th className="py-3 px-3 w-[100px]">COD</th>
            <th className="py-3 px-3 w-[100px]">Blocked</th>
            <th className="py-3 px-3 w-[100px]">Sort</th>
            <th className="py-3 pl-3 w-[140px]">Preview</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line/60">
              <td className="py-3 pr-3">
                <div className="font-display text-[14px]">{r.name}</div>
                <div className="text-[11px] text-muted">{r.id}</div>
              </td>
              <td className="py-3 px-3">
                <input
                  type="number"
                  value={r.deliveryFeeMmk}
                  onChange={(e) => update(r.id, { deliveryFeeMmk: Number(e.target.value) || 0 })}
                  onBlur={(e) => save(r.id, { deliveryFeeMmk: Number(e.target.value) || 0 })}
                  className="w-full rounded border border-line bg-cream px-2 py-1 text-[13px] tabular-nums focus:outline-none focus:border-ink/40"
                />
              </td>
              <td className="py-3 px-3">
                <input
                  type="checkbox"
                  checked={r.codAllowed}
                  onChange={(e) => {
                    update(r.id, { codAllowed: e.target.checked })
                    void save(r.id, { codAllowed: e.target.checked })
                  }}
                />
              </td>
              <td className="py-3 px-3">
                <input
                  type="checkbox"
                  checked={r.isBlocked}
                  onChange={(e) => {
                    update(r.id, { isBlocked: e.target.checked })
                    void save(r.id, { isBlocked: e.target.checked })
                  }}
                />
              </td>
              <td className="py-3 px-3">
                <input
                  type="number"
                  value={r.sortOrder}
                  onChange={(e) => update(r.id, { sortOrder: Number(e.target.value) || 0 })}
                  onBlur={(e) => save(r.id, { sortOrder: Number(e.target.value) || 0 })}
                  className="w-full rounded border border-line bg-cream px-2 py-1 text-[13px] tabular-nums focus:outline-none focus:border-ink/40"
                />
              </td>
              <td className="py-3 pl-3 text-[12px] text-muted">{formatMmk(r.deliveryFeeMmk)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
