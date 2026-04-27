import { createAdminClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/permissions'
import MateriaisClient, { type MaterialFile } from './client'

export const dynamic = 'force-dynamic'

const BUCKET = 'events'

export default async function ParceiroMateriaisPage() {
  const org = await requirePermission('upload_materials')
  const admin = createAdminClient()

  const folder = `org-materials/${org.id}`
  const { data: list } = await admin.storage
    .from(BUCKET)
    .list(folder, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } })

  const files: MaterialFile[] = (list ?? [])
    .filter((f: any) => f.name && !f.name.endsWith('/'))
    .map((f: any) => {
      const path = `${folder}/${f.name}`
      const { data } = admin.storage.from(BUCKET).getPublicUrl(path)
      return {
        name: f.name,
        path,
        url: data.publicUrl,
        size: f.metadata?.size ?? 0,
        contentType: f.metadata?.mimetype ?? '',
        createdAt: f.created_at ?? null,
      }
    })

  return <MateriaisClient orgName={org.name} files={files} />
}
