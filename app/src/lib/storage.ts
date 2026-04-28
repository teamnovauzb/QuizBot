// Supabase Storage helper for image uploads (question images, profile pics, etc.)
// Bucket name conventions:
//   - "question-images" (public-read)  ← used by question editor
//
// To enable in your Supabase project:
//   Dashboard → Storage → New bucket → name "question-images" → Public ✓
//   (RLS auto-allows authed insert to public buckets when no policies set)

import { supabase } from './supabase'

const BUCKET = 'question-images'

export async function uploadQuestionImage(file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'storage_disabled' }
  if (!file.type.startsWith('image/')) return { ok: false, error: 'not_an_image' }
  if (file.size > 4 * 1024 * 1024) return { ok: false, error: 'too_large_4mb' }

  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const path = `q/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (error) return { ok: false, error: error.message }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { ok: true, url: data.publicUrl }
}

export async function removeQuestionImage(url: string): Promise<void> {
  if (!supabase || !url) return
  // public URL → bucket path: .../object/public/<bucket>/<path>
  const m = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/)
  if (!m) return
  const path = decodeURIComponent(m[1])
  await supabase.storage.from(BUCKET).remove([path])
}
