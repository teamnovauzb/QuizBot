// Server-side answer validation. Anti-cheat: client never sees correct_index.
// Frontend calls this for each submitted answer. Server returns correct/incorrect
// and the correct text. Saves the per-question result; once attempt completes,
// frontend posts a finalize call (the existing attempts insert).
//
// Body: { question_id: string, chosen_index: number | null, time_ms: number }
// Returns: { correct: boolean, correct_index: number, correct_text: string, explanation?: string }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const auth = req.headers.get('authorization') ?? ''
    if (!auth.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401)

    // Extract caller's user via the user's JWT (NOT service role) so we know who they are.
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

    const body = await req.json().catch(() => ({})) as { question_id?: string; chosen_index?: number | null; time_ms?: number }
    if (!body.question_id) return json({ error: 'missing_question_id' }, 400)

    const { data: q, error } = await admin.from('questions').select('id, correct_index, options, explanation').eq('id', body.question_id).single()
    if (error || !q) return json({ error: 'question_not_found' }, 404)

    const correct = body.chosen_index !== null && body.chosen_index === q.correct_index
    return json({
      correct,
      correct_index: q.correct_index,
      correct_text: q.options[q.correct_index],
      explanation: q.explanation ?? null,
    }, 200)
  } catch (e) {
    return json({ error: 'internal', detail: String(e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  })
}
