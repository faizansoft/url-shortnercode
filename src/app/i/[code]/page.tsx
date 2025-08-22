import InterstitialClient from './InterstitialClient'

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return <InterstitialClient code={code} />
}

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
