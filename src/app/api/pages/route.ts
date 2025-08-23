import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabaseServer'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// GET /api/pages -> list pages for current user
// POST /api/pages -> create a new page { title, slug }
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined

    if (!token) return NextResponse.json({ pages: [] }, { headers: { 'Cache-Control': 'no-store' } })
    const { data: authData } = await supabase.auth.getUser(token)
    const user_id = authData?.user?.id
    if (!user_id) return NextResponse.json({ pages: [] }, { headers: { 'Cache-Control': 'no-store' } })

    const { data, error } = await supabase
      .from('pages')
      .select('id, title, slug, published, created_at, updated_at')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ pages: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServer()
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: authData } = await supabase.auth.getUser(token)
    const user_id = authData?.user?.id
    if (!user_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body: unknown
    try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

    const obj = (body ?? {}) as Record<string, unknown>
    const title = typeof obj.title === 'string' ? obj.title.trim().slice(0, 140) : ''
    let slug = typeof obj.slug === 'string' ? obj.slug.trim().toLowerCase() : ''
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
    if (!slug) slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
    if (!/^[a-z0-9-]{3,60}$/.test(slug)) return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })

    // Ensure unique slug per user
    const { data: exists, error: checkErr } = await supabase
      .from('pages')
      .select('id')
      .eq('user_id', user_id)
      .eq('slug', slug)
      .maybeSingle()
    if (checkErr) return NextResponse.json({ error: checkErr.message }, { status: 500 })
    if (exists) return NextResponse.json({ error: 'Slug already exists' }, { status: 409 })

    const now = new Date().toISOString()
    const { data: inserted, error } = await supabase
      .from('pages')
      .insert({ user_id, title, slug, blocks: [], published: false, created_at: now, updated_at: now })
      .select('id, title, slug, published, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ page: inserted }, { status: 201 })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
