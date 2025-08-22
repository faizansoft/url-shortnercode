import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET() {
  // Debug route disabled: returning 404 to prevent use
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
