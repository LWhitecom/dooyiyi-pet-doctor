import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = url && publishableKey ? createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // reset 流程由 exchangeRecoverySession 手动处理，避免自动解析残留 URL 在 iOS 卡住
    flowType: 'pkce',
  },
}) : null
