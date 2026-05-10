import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://fjrhyzwyctgjxqkkwwwo.supabase.co"
const supabaseKey = "sb_publishable_Jb1BpDURgIH3EtNgZSJ8hQ_5cTaJ-Il"

export const supabase = createClient(supabaseUrl, supabaseKey)