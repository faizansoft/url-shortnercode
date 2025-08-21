// Ensure this page is not statically prerendered (server segment options)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import AdminClient from './AdminClient'

export default function Page() {
  return <AdminClient />
}
