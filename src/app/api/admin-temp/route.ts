import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

// Use Node.js runtime for admin operations (auth.admin, etc.)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Simple guard: only allow a single operator account (ADMIN_EMAIL)
function deny(msg = 'Forbidden') {
  return NextResponse.json({ error: msg }, { status: 403 })
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
    const { user } = await getAuthedUser(req)
    if (!user || !isOperator(user.email)) return deny()

    const supabase = getSupabaseServer()

    // List users (limited page)
    // Note: auth.admin.listUsers is available with service role
    const usersRes = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }).catch((e: unknown) => ({
      data: { users: [] as any[] }, error: e as Error,
    }))

    const users = (usersRes as any)?.data?.users ?? []

    // Fetch links
    const { data: links, error: linksErr } = await supabase
      .from('links')
      .select('id, short_code, target_url, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(2000)
    if (linksErr) return NextResponse.json({ error: linksErr.message }, { status: 500 })

    // Fetch qr_styles (if exists)
    const { data: qrData, error: qrErr } = await supabase
      .from('qr_styles')
      .select('user_id, short_code, updated_at')
      .limit(5000)
    const qr_styles = qrErr ? [] : (qrData ?? [])

    return NextResponse.json({
      operator: { id: user.id, email: user.email },
      counts: { users: users.length, links: (links?.length ?? 0), qr_styles: (qr_styles?.length ?? 0) },
      users: users.map((u: any) => ({ id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at })),
      links: links ?? [],
      qr_styles: qr_styles ?? [],
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthedUser(req)
    if (!user || !isOperator(user.email)) return deny()
    const supabase = getSupabaseServer()

    const body = await req.json().catch(() => ({})) as any
    const action = String(body?.action || '').toLowerCase()

    if (action === 'update_link') {
      const id = typeof body?.id === 'string' ? body.id : ''
      const short_code = typeof body?.short_code === 'string' ? body.short_code.trim() : ''
      const target_url = typeof body?.target_url === 'string' ? body.target_url.trim() : ''
      if (!id && !short_code) return NextResponse.json({ error: 'Missing id or short_code' }, { status: 400 })
      if (!target_url && !short_code) return NextResponse.json({ error: 'No fields to update' }, { status: 400 })

      const update: Record<string, unknown> = {}
      if (short_code) update.short_code = short_code
      if (target_url) update.target_url = target_url

      const q = supabase.from('links').update(update)
      const r = id ? await q.eq('id', id) : await q.eq('short_code', body.short_code)
      if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'delete_link') {
      const id = typeof body?.id === 'string' ? body.id : ''
      const short_code = typeof body?.short_code === 'string' ? body.short_code.trim() : ''
      if (!id && !short_code) return NextResponse.json({ error: 'Missing id or short_code' }, { status: 400 })
      const q = supabase.from('links').delete()
      const r = id ? await q.eq('id', id) : await q.eq('short_code', short_code)
      if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'delete_qr_style') {
      const user_id = typeof body?.user_id === 'string' ? body.user_id : ''
      const short_code = typeof body?.short_code === 'string' ? body.short_code.trim() : ''
      if (!user_id || !short_code) return NextResponse.json({ error: 'Missing user_id or short_code' }, { status: 400 })
      const r = await supabase.from('qr_styles').delete().eq('user_id', user_id).eq('short_code', short_code)
      if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'reset_password') {
      const user_id = typeof body?.user_id === 'string' ? body.user_id : ''
      const new_password = typeof body?.new_password === 'string' ? body.new_password : ''
      if (!user_id || !new_password) return NextResponse.json({ error: 'Missing user_id or new_password' }, { status: 400 })
      const r = await supabase.auth.admin.updateUserById(user_id, { password: new_password })
      if ((r as any)?.error) return NextResponse.json({ error: (r as any).error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
