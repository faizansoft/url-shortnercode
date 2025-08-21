// Ensure this page runs on Edge and is not statically prerendered (server segment options)
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import AdminClient from './AdminClient'

export default function Page() {
  return <AdminClient />
}
