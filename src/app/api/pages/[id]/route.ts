import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// GET /api/pages/[id] -> fetch one page (owner only)
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const id = req.nextUrl.pathname.split('/').pop()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { data, error } = await supabase
      .from('pages')
      .select('id, user_id, title, slug, blocks, theme, published, created_at, updated_at')
      .eq('id', id)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ page: data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PUT /api/pages/[id] -> update page (owner only)
export async function PUT(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const id = req.nextUrl.pathname.split('/').pop()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: authData } = await supabase.auth.getUser(token)
    const user_id = authData?.user?.id
    if (!user_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
    const obj = (body ?? {}) as Record<string, unknown>

    const input: Record<string, unknown> = {}
    if (typeof obj.title === 'string') input.title = obj.title.trim().slice(0, 140)
    if (typeof obj.slug === 'string') {
      const slug = obj.slug.trim().toLowerCase()
      if (!/^[a-z0-9-]{3,60}$/.test(slug)) return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
      input.slug = slug
    }
    if (obj.blocks && typeof obj.blocks === 'object') input.blocks = obj.blocks
    if (obj.theme && typeof obj.theme === 'object') input.theme = obj.theme
    if (typeof obj.published === 'boolean') input.published = obj.published

    input.updated_at = new Date().toISOString()

    // ensure ownership and perform update
    const { data: existing, error: getErr } = await supabase
      .from('pages')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle()
    if (getErr) return NextResponse.json({ error: getErr.message }, { status: 500 })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.user_id !== user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if ('slug' in input) {
      const { data: dup } = await supabase
        .from('pages')
        .select('id')
        .eq('user_id', user_id)
        .eq('slug', input.slug as string)
        .neq('id', id)
        .maybeSingle()
      if (dup) return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })
    }

    const { data: updated, error } = await supabase
      .from('pages')
      .update(input)
      .eq('id', id)
      .select('id, title, slug, blocks, theme, published, created_at, updated_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ page: updated })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/pages/[id]
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const id = req.nextUrl.pathname.split('/').pop()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: authData } = await supabase.auth.getUser(token)
    const user_id = authData?.user?.id
    if (!user_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: existing, error: getErr } = await supabase
      .from('pages')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle()
    if (getErr) return NextResponse.json({ error: getErr.message }, { status: 500 })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.user_id !== user_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase.from('pages').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
