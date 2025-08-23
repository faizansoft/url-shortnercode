import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'
import type { User } from '@supabase/supabase-js'

// Run on Edge runtime for Cloudflare Pages
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// Simple guard: only allow a single operator account (ADMIN_EMAIL)
function deny(msg = 'Forbidden') {
  return NextResponse.json({ error: msg }, { status: 403 })
}

function unauthorized(msg = 'Not authenticated') {
  return NextResponse.json({ error: msg }, { status: 401 })
}

async function getAuthedUser(req: NextRequest) {
  const supabase = getSupabaseServer()
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined
  if (!token) return { user: null, token: null }
  const { data } = await supabase.auth.getUser(token)
  return { user: data?.user ?? null, token: token ?? null }
}

function isOperator(email: string | null | undefined): boolean {
  const allowed = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  if (!allowed) return false
  return (email || '').toLowerCase() === allowed
}

export async function GET(req: NextRequest) {
  try {
    // Require Authorization header
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) return unauthorized()
    const { user } = await getAuthedUser(req)
    if (!user) return unauthorized()
    if (!isOperator(user.email)) return deny('Email not allowed')

    const supabase = getSupabaseServer()

    // Parse pagination params
    const url = new URL(req.url)
    const qp = url.searchParams
    const usersPage = Math.max(1, parseInt(qp.get('usersPage') || '1', 10) || 1)
    const usersPerPage = Math.min(1000, Math.max(1, parseInt(qp.get('usersPerPage') || '50', 10) || 50))
    const linksPage = Math.max(1, parseInt(qp.get('linksPage') || '1', 10) || 1)
    const linksPerPage = Math.min(500, Math.max(1, parseInt(qp.get('linksPerPage') || '50', 10) || 50))
    const qrPage = Math.max(1, parseInt(qp.get('qrPage') || '1', 10) || 1)
    const qrPerPage = Math.min(500, Math.max(1, parseInt(qp.get('qrPerPage') || '50', 10) || 50))

    // Users (Supabase admin API paginates but does not return total)
    const usersRes = await supabase.auth.admin.listUsers({ page: usersPage, perPage: usersPerPage })
    const users: User[] = usersRes.data?.users ?? []
    const usersHasMore = users.length === usersPerPage

    // Links with total count
    const linksFrom = (linksPage - 1) * linksPerPage
    const linksTo = linksFrom + linksPerPage - 1
    const { count: linksTotal, error: linksCountErr } = await supabase
      .from('links')
      .select('id', { count: 'exact', head: true })
    if (linksCountErr) return NextResponse.json({ error: linksCountErr.message }, { status: 500 })
    const { data: links, error: linksErr } = await supabase
      .from('links')
      .select('id, short_code, target_url, user_id, created_at')
      .order('created_at', { ascending: false })
      .range(linksFrom, linksTo)
    if (linksErr) return NextResponse.json({ error: linksErr.message }, { status: 500 })

    // QR styles with total count
    const qrFrom = (qrPage - 1) * qrPerPage
    const qrTo = qrFrom + qrPerPage - 1
    const { count: qrTotal, error: qrCountErr } = await supabase
      .from('qr_styles')
      .select('user_id', { count: 'exact', head: true })
    if (qrCountErr) return NextResponse.json({ error: qrCountErr.message }, { status: 500 })
    const { data: qrData, error: qrErr } = await supabase
      .from('qr_styles')
      .select('user_id, short_code, updated_at')
      .order('updated_at', { ascending: false })
      .range(qrFrom, qrTo)
    const qr_styles = qrErr ? [] : (qrData ?? [])

    // Strongly type rows to avoid `any` usage
    type LinkRow = { id: string; short_code: string; target_url: string; user_id: string; created_at: string }
    type QrRow = { user_id: string; short_code: string; updated_at: string | null }
    const linksArr: LinkRow[] = (links ?? []) as LinkRow[]
    const qrArr: QrRow[] = (qr_styles ?? []) as QrRow[]

    // Build user email map for displayed items
    const userIds = Array.from(new Set([...
      linksArr.map(l => l.user_id), ...qrArr.map(q => q.user_id)
    ].filter(Boolean))) as string[]
    const userMap: Record<string, string | null> = {}
    await Promise.all(userIds.map(async (uid) => {
      try {
        const res = await supabase.auth.admin.getUserById(uid)
        userMap[uid] = res.data?.user?.email ?? null
      } catch {
        userMap[uid] = null
      }
    }))

    const linksOut = linksArr.map((l: LinkRow) => ({
      ...l,
      user_email: l.user_id ? userMap[l.user_id] ?? null : null,
    }))
    const qrOut = qrArr.map((q: QrRow) => ({
      ...q,
      user_email: q.user_id ? userMap[q.user_id] ?? null : null,
    }))

    return NextResponse.json({
      operator: { id: user.id, email: user.email },
      counts: { users: users.length, links: (linksTotal ?? 0), qr_styles: (qrTotal ?? 0) },
      users: users.map((u: User) => ({ id: u.id, email: u.email, created_at: u.created_at ?? null, last_sign_in_at: u.last_sign_in_at ?? null })),
      links: linksOut,
      qr_styles: qrOut,
      pagination: {
        users: { page: usersPage, perPage: usersPerPage, hasMore: usersHasMore },
        links: { page: linksPage, perPage: linksPerPage, total: linksTotal ?? 0 },
        qr_styles: { page: qrPage, perPage: qrPerPage, total: qrTotal ?? 0 },
      }
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

type UpdateLinkAction = { action: 'update_link'; id?: string; short_code?: string; target_url?: string }
type DeleteLinkAction = { action: 'delete_link'; id?: string; short_code?: string }
type DeleteQrStyleAction = { action: 'delete_qr_style'; user_id: string; short_code: string }
type ResetPasswordAction = { action: 'reset_password'; user_id: string; new_password: string }
type CreateUserAction = { action: 'create_user'; email: string; password: string }
type DeleteUserAction = { action: 'delete_user'; user_id: string }
type AdminAction = UpdateLinkAction | DeleteLinkAction | DeleteQrStyleAction | ResetPasswordAction | CreateUserAction | DeleteUserAction | { action: string }

export async function POST(req: NextRequest) {
  try {
    // Require Authorization header
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) return unauthorized()
    const { user } = await getAuthedUser(req)
    if (!user) return unauthorized()
    if (!isOperator(user.email)) return deny('Email not allowed')
    const supabase = getSupabaseServer()

    let body: AdminAction
    try {
      body = (await req.json()) as AdminAction
    } catch {
      body = { action: '' }
    }
    const action = String(body?.action || '').toLowerCase()

    switch (action) {
      case 'create_user': {
        const b = body as CreateUserAction
        const email = typeof b.email === 'string' ? b.email.trim() : ''
        const password = typeof b.password === 'string' ? b.password : ''
        if (!email || !password) return NextResponse.json({ error: 'Missing email or password' }, { status: 400 })
        const { data: created, error } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ ok: true, user_id: created.user?.id ?? null })
      }
      case 'delete_user': {
        const b = body as DeleteUserAction
        const user_id = typeof b.user_id === 'string' ? b.user_id : ''
        if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
        const { error } = await supabase.auth.admin.deleteUser(user_id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ ok: true })
      }
      case 'update_link': {
        const b = body as UpdateLinkAction
        const id = typeof b.id === 'string' ? b.id : ''
        const short_code = typeof b.short_code === 'string' ? b.short_code.trim() : ''
        const target_url = typeof b.target_url === 'string' ? b.target_url.trim() : ''
        if (!id && !short_code) return NextResponse.json({ error: 'Missing id or short_code' }, { status: 400 })
        if (!target_url && !short_code) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

        const update: Record<string, unknown> = {}
        if (short_code) update.short_code = short_code
        if (target_url) update.target_url = target_url

        const q = supabase.from('links').update(update as any)
        const r = id ? await q.eq('id', id) : await q.eq('short_code', short_code)
        if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
        return NextResponse.json({ ok: true })
      }
      case 'delete_link': {
        const b = body as DeleteLinkAction
        const id = typeof b.id === 'string' ? b.id : ''
        const short_code = typeof b.short_code === 'string' ? b.short_code.trim() : ''
        if (!id && !short_code) return NextResponse.json({ error: 'Missing id or short_code' }, { status: 400 })
        const q = supabase.from('links').delete()
        const r = id ? await q.eq('id', id) : await q.eq('short_code', short_code)
        if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
        return NextResponse.json({ ok: true })
      }
      case 'delete_qr_style': {
        const b = body as DeleteQrStyleAction
        const user_id = typeof b.user_id === 'string' ? b.user_id : ''
        const short_code = typeof b.short_code === 'string' ? b.short_code.trim() : ''
        if (!user_id || !short_code) return NextResponse.json({ error: 'Missing user_id or short_code' }, { status: 400 })
        const r = await supabase.from('qr_styles').delete().eq('user_id', user_id).eq('short_code', short_code)
        if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
        return NextResponse.json({ ok: true })
      }
      case 'reset_password': {
        const b = body as ResetPasswordAction
        const user_id = typeof b.user_id === 'string' ? b.user_id : ''
        const new_password = typeof b.new_password === 'string' ? b.new_password : ''
        if (!user_id || !new_password) return NextResponse.json({ error: 'Missing user_id or new_password' }, { status: 400 })
        const { error: updateErr } = await supabase.auth.admin.updateUserById(user_id, { password: new_password })
        if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
        return NextResponse.json({ ok: true })
      }
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
