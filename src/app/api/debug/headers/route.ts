import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const headers: Record<string, string | null> = {
    'user-agent': req.headers.get('user-agent'),
    'referer': req.headers.get('referer'),
    'x-forwarded-for': req.headers.get('x-forwarded-for'),
    'x-vercel-ip-country': req.headers.get('x-vercel-ip-country'),
    'x-vercel-ip-country-region': req.headers.get('x-vercel-ip-country-region'),
    'x-vercel-ip-city': req.headers.get('x-vercel-ip-city'),
    'cf-ipcountry': req.headers.get('cf-ipcountry'),
    'cf-region': req.headers.get('cf-region'),
    'cf-ipcity': req.headers.get('cf-ipcity'),
  }
  return NextResponse.json({ headers })
}
