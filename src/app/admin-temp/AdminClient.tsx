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
  user_email?: string | null
  created_at: string
}

type QrStyle = {
  user_id: string
  short_code: string
  user_email?: string | null
  updated_at?: string | null
}

type Bootstrap = {
  operator: { id: string, email: string | null }
  counts: { users: number, links: number, qr_styles: number }
  users: AdminUser[]
  links: LinkRow[]
  qr_styles: QrStyle[]
  pagination?: {
    users: { page: number; perPage: number; hasMore: boolean }
    links: { page: number; perPage: number; total: number }
    qr_styles: { page: number; perPage: number; total: number }
  }
}

type UpdateLinkAction = { action: 'update_link'; id?: string; short_code?: string; target_url?: string }
type DeleteLinkAction = { action: 'delete_link'; id?: string; short_code?: string }
type DeleteQrStyleAction = { action: 'delete_qr_style'; user_id: string; short_code: string }
type ResetPasswordAction = { action: 'reset_password'; user_id: string; new_password: string }
type CreateUserAction = { action: 'create_user'; email: string; password: string }
type DeleteUserAction = { action: 'delete_user'; user_id: string }
type AdminAction = UpdateLinkAction | DeleteLinkAction | DeleteQrStyleAction | ResetPasswordAction | CreateUserAction | DeleteUserAction

export default function AdminClientPage({ allowedEmail }: { allowedEmail: string | null }) {
  // Initialize Supabase only on the client after mount to avoid SSR errors
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Bootstrap | null>(null)
  // allowedEmail comes from server wrapper; do not read NEXT_PUBLIC_* at build time

  // Pagination state
  const [usersPage, setUsersPage] = useState(1)
  const [linksPage, setLinksPage] = useState(1)
  const [qrPage, setQrPage] = useState(1)
  const usersPerPage = 50
  const linksPerPage = 50
  const qrPerPage = 50

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

      const params = new URLSearchParams({
        usersPage: String(usersPage),
        usersPerPage: String(usersPerPage),
        linksPage: String(linksPage),
        linksPerPage: String(linksPerPage),
        qrPage: String(qrPage),
        qrPerPage: String(qrPerPage),
      })

      const res = await fetch(`/api/admin-temp?${params.toString()}`, {
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
  }, [supabase, usersPage, linksPage, qrPage])

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
  const isAllowed = operatorEmail && allowedEmail ? operatorEmail.toLowerCase() === allowedEmail.toLowerCase() : false

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Temporary Admin Page</h1>
      <div className="text-sm text-gray-600">
        <div>Signed in as: <b>{operatorEmail ?? '—'}</b></div>
        <div className="mt-2">If you cannot see data, ensure your email matches server-side ADMIN_EMAIL env var.</div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={fetchAll} className="px-3 py-2 bg-black text-white rounded" disabled={!supabase}>Refresh</button>
        {isAllowed && (
          <button
            onClick={async () => {
              const email = prompt('Enter new user email')?.trim()
              if (!email) return
              const password = prompt('Enter initial password for ' + email)
              if (!password) return
              await act({ action: 'create_user', email, password })
            }}
            className="px-3 py-2 bg-emerald-600 text-white rounded disabled:opacity-60"
            disabled={!supabase}
          >Add User</button>
        )}
        {loading && <span className="text-gray-500">Loading…</span>}
        {!isAllowed && <span className="text-red-600">Restricted page</span>}
        {error && isAllowed && <span className="text-red-600">{error}</span>}
      </div>

      {data && isAllowed && (
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
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="p-2 text-left sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Email</th>
                    <th className="p-2 text-left sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">ID</th>
                    <th className="p-2 text-left sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Created</th>
                    <th className="p-2 text-left sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Last Sign-in</th>
                    <th className="p-2 text-left sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Reset Password</th>
                    <th className="p-2 text-left sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Actions</th>
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
                      <td className="p-2">
                        <button
                          className="px-2 py-1 text-xs bg-rose-600 text-white rounded"
                          onClick={async () => {
                            if (!confirm(`Delete user ${u.email || u.id}?`)) return
                            await act({ action: 'delete_user', user_id: u.id })
                          }}
                        >Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between p-2 text-xs text-gray-600 border-t">
                <div>Page {data.pagination?.users.page ?? usersPage}</div>
                <div className="space-x-2">
                  <button className="px-2 py-1 border rounded disabled:opacity-50" disabled={usersPage <= 1 || loading} onClick={() => setUsersPage(p => Math.max(1, p - 1))}>Prev</button>
                  <button className="px-2 py-1 border rounded disabled:opacity-50" disabled={!data.pagination?.users.hasMore || loading} onClick={() => setUsersPage(p => p + 1)}>Next</button>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold mt-6">Links</h2>
            <div className="overflow-auto border rounded">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="p-2 text-left sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Short</th>
                    <th className="p-2 text-left sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Target</th>
                    <th className="p-2 text-left sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">User</th>
                    <th className="p-2 text-left sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Created</th>
                    <th className="p-2 text-left sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Actions</th>
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
                        <div className="text-xs">{l.user_email ?? <span className="font-mono">{l.user_id}</span>}</div>
                      </td>
                      <td className="p-2">{l.created_at?.slice(0, 19).replace('T', ' ')}</td>
                      <td className="p-2">
                        <Link className="text-blue-600 underline" href={`/l/${l.short_code}`} target="_blank">Open</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between p-2 text-xs text-gray-600 border-t">
                <div>
                  Page {data.pagination?.links.page ?? linksPage} ·
                  {' '}Showing {(data.pagination?.links.page ?? linksPage - 1) * linksPerPage + 1}
                  {' '}- {' '}
                  {Math.min((data.pagination?.links.page ?? linksPage) * linksPerPage, data.pagination?.links.total ?? data.counts.links)}
                  {' '}of {data.pagination?.links.total ?? data.counts.links}
                </div>
                <div className="space-x-2">
                  <button className="px-2 py-1 border rounded disabled:opacity-50" disabled={linksPage <= 1 || loading} onClick={() => setLinksPage(p => Math.max(1, p - 1))}>Prev</button>
                  <button className="px-2 py-1 border rounded disabled:opacity-50" disabled={(data.pagination?.links.total ?? 0) <= linksPage * linksPerPage || loading} onClick={() => setLinksPage(p => p + 1)}>Next</button>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold mt-6">QR Styles</h2>
            <div className="overflow-auto border rounded">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="p-2 text-left sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Short</th>
                    <th className="p-2 text-left sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">User</th>
                    <th className="p-2 text-left sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Updated</th>
                    <th className="p-2 text-left sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.qr_styles.map((q) => (
                    <tr key={`${q.user_id}-${q.short_code}`} className="border-t">
                      <td className="p-2 font-mono text-xs">{q.short_code}</td>
                      <td className="p-2 text-xs">{q.user_email ?? <span className="font-mono">{q.user_id}</span>}</td>
                      
                      
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
              <div className="flex items-center justify-between p-2 text-xs text-gray-600 border-t">
                <div>
                  Page {data.pagination?.qr_styles.page ?? qrPage} ·
                  {' '}Showing {(data.pagination?.qr_styles.page ?? qrPage - 1) * qrPerPage + 1}
                  {' '}- {' '}
                  {Math.min((data.pagination?.qr_styles.page ?? qrPage) * qrPerPage, data.pagination?.qr_styles.total ?? data.counts.qr_styles)}
                  {' '}of {data.pagination?.qr_styles.total ?? data.counts.qr_styles}
                </div>
                <div className="space-x-2">
                  <button className="px-2 py-1 border rounded disabled:opacity-50" disabled={qrPage <= 1 || loading} onClick={() => setQrPage(p => Math.max(1, p - 1))}>Prev</button>
                  <button className="px-2 py-1 border rounded disabled:opacity-50" disabled={(data.pagination?.qr_styles.total ?? 0) <= qrPage * qrPerPage || loading} onClick={() => setQrPage(p => p + 1)}>Next</button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
      {!isAllowed && (
        <div className="p-4 border rounded bg-red-50 text-red-700 text-sm">
          This page is restricted. Only the configured admin can access admin data and actions.
        </div>
      )}
    </div>
  )
}
