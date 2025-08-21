"use client"

import React, { useCallback, useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { SupabaseClient } from '@supabase/supabase-js'
import Link from 'next/link'

type AdminUser = {
  id: string
  email: string | null
  created_at?: string | null
  last_sign_in_at?: string | null
}

type LinkRow = {
  id: string
  short_code: string
  target_url: string
  user_id: string
  created_at: string
}

type QrStyle = {
  user_id: string
  short_code: string
  updated_at?: string | null
}

type Bootstrap = {
  operator: { id: string, email: string | null }
  counts: { users: number, links: number, qr_styles: number }
  users: AdminUser[]
  links: LinkRow[]
  qr_styles: QrStyle[]
}

type UpdateLinkAction = { action: 'update_link'; id?: string; short_code?: string; target_url?: string }
type DeleteLinkAction = { action: 'delete_link'; id?: string; short_code?: string }
type DeleteQrStyleAction = { action: 'delete_qr_style'; user_id: string; short_code: string }
type ResetPasswordAction = { action: 'reset_password'; user_id: string; new_password: string }
type AdminAction = UpdateLinkAction | DeleteLinkAction | DeleteQrStyleAction | ResetPasswordAction

export default function AdminClientPage() {
  // Initialize Supabase only on the client after mount to avoid SSR errors
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Bootstrap | null>(null)
  const [adminEmail] = useState<string | null>(typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_ADMIN_EMAIL as string) || null : null)

  useEffect(() => {
    try {
      const c = getSupabaseClient()
      setSupabase(c)
    } catch (e) {
      // In case env is missing or other issues
      setError(e instanceof Error ? e.message : 'Failed to init client')
    }
  }, [])

  const fetchAll = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      if (!supabase) throw new Error('Client not ready')
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Not authenticated')

      const res = await fetch('/api/admin-temp', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Failed to load')
      setData(json as Bootstrap)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (supabase) fetchAll()
  }, [supabase, fetchAll])

  const act = useCallback(async (payload: AdminAction) => {
    try {
      if (!supabase) throw new Error('Client not ready')
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Not authenticated')
      const res = await fetch('/api/admin-temp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Action failed')
      await fetchAll()
      alert('Done')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      alert(msg)
    }
  }, [supabase, fetchAll])

  const operatorEmail = data?.operator?.email || null

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Temporary Admin Page</h1>
      <div className="text-sm text-gray-600">
        <div>Signed in as: <b>{operatorEmail ?? '—'}</b></div>
        {adminEmail ? <div>Allowed admin: <b>{adminEmail}</b></div> : <div>Set NEXT_PUBLIC_ADMIN_EMAIL to show allowed email client-side</div>}
        <div className="mt-2">If you cannot see data, ensure your email matches server-side ADMIN_EMAIL env var.</div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={fetchAll} className="px-3 py-2 bg-black text-white rounded" disabled={!supabase}>Refresh</button>
        {loading && <span className="text-gray-500">Loading…</span>}
        {error && <span className="text-red-600">{error}</span>}
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 border rounded">
              <div className="text-sm text-gray-500">Users</div>
              <div className="text-2xl font-semibold">{data.counts.users}</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-sm text-gray-500">Links</div>
              <div className="text-2xl font-semibold">{data.counts.links}</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-sm text-gray-500">QR Styles</div>
              <div className="text-2xl font-semibold">{data.counts.qr_styles}</div>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold mt-6">Users</h2>
            <div className="overflow-auto border rounded">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 text-left">Email</th>
                    <th className="p-2 text-left">ID</th>
                    <th className="p-2 text-left">Created</th>
                    <th className="p-2 text-left">Last Sign-in</th>
                    <th className="p-2 text-left">Reset Password</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id} className="border-t">
                      <td className="p-2">{u.email}</td>
                      <td className="p-2 font-mono text-xs">{u.id}</td>
                      <td className="p-2">{u.created_at?.slice(0, 19).replace('T', ' ')}</td>
                      <td className="p-2">{u.last_sign_in_at?.slice(0, 19).replace('T', ' ')}</td>
                      <td className="p-2">
                        <button
                          className="px-2 py-1 text-xs bg-amber-500 text-white rounded"
                          onClick={async () => {
                            const new_password = prompt('Enter new password for ' + (u.email || u.id))
                            if (!new_password) return
                            await act({ action: 'reset_password', user_id: u.id, new_password })
                          }}
                        >Reset</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold mt-6">Links</h2>
            <div className="overflow-auto border rounded">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 text-left">Short</th>
                    <th className="p-2 text-left">Target</th>
                    <th className="p-2 text-left">User</th>
                    <th className="p-2 text-left">Created</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.links.map((l) => (
                    <tr key={l.id} className="border-t align-top">
                      <td className="p-2">
                        <div className="font-mono text-xs">{l.short_code}</div>
                        <div className="mt-1">
                          <button className="px-2 py-1 text-xs bg-blue-600 text-white rounded mr-2" onClick={async () => {
                            const newShort = prompt('New short code for ' + l.short_code, l.short_code)
                            if (!newShort || newShort === l.short_code) return
                            await act({ action: 'update_link', id: l.id, short_code: newShort })
                          }}>Edit Code</button>
                          <button className="px-2 py-1 text-xs bg-rose-600 text-white rounded" onClick={async () => {
                            if (!confirm('Delete link ' + l.short_code + '?')) return
                            await act({ action: 'delete_link', id: l.id })
                          }}>Delete</button>
                        </div>
                      </td>
                      <td className="p-2 break-all max-w-xl">
                        <div className="truncate" title={l.target_url}>{l.target_url}</div>
                        <div className="mt-1">
                          <button className="px-2 py-1 text-xs bg-emerald-600 text-white rounded" onClick={async () => {
                            const newUrl = prompt('New target URL', l.target_url)
                            if (!newUrl || newUrl === l.target_url) return
                            await act({ action: 'update_link', id: l.id, target_url: newUrl })
                          }}>Edit URL</button>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="font-mono text-xs">{l.user_id}</div>
                      </td>
                      <td className="p-2">{l.created_at?.slice(0, 19).replace('T', ' ')}</td>
                      <td className="p-2">
                        <Link className="text-blue-600 underline" href={`/l/${l.short_code}`} target="_blank">Open</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold mt-6">QR Styles</h2>
            <div className="overflow-auto border rounded">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-2 text-left">Short</th>
                    <th className="p-2 text-left">User</th>
                    <th className="p-2 text-left">Updated</th>
                    <th className="p-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.qr_styles.map((q) => (
                    <tr key={`${q.user_id}-${q.short_code}`} className="border-t">
                      <td className="p-2 font-mono text-xs">{q.short_code}</td>
                      <td className="p-2 font-mono text-xs">{q.user_id}</td>
                      <td className="p-2">{q.updated_at?.slice(0, 19).replace('T', ' ')}</td>
                      <td className="p-2">
                        <button className="px-2 py-1 text-xs bg-rose-600 text-white rounded" onClick={async () => {
                          if (!confirm(`Delete QR style ${q.short_code}?`)) return
                          await act({ action: 'delete_qr_style', user_id: q.user_id, short_code: q.short_code })
                        }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
