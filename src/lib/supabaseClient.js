import { createClient } from '@supabase/supabase-js'

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' ? process.env : {})

// Retrieve Supabase URL and Publishable/Anon Key from environment variables
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://njeohgetjjyvblwnttqv.supabase.co'
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  supabaseKey !== 'your_supabase_anon_publishable_key_here' &&
  supabaseKey !== 'your-supabase-anon-or-publishable-key-here'
)

// Initialize client if key is configured, otherwise provide null-safe dummy
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null

/**
 * Upload a generated PDF Blob to Supabase Storage
 * @param {string} bucketName - e.g. 'business-documents'
 * @param {string} filePath - e.g. 'credit-notes/CN-09_17102026.pdf'
 * @param {Blob} pdfBlob - The PDF file blob
 * @returns {Promise<{ path: string | null, error: any }>}
 */
export async function uploadPdfToStorage(bucketName, filePath, pdfBlob) {
  if (!isSupabaseConfigured || !supabase) {
    return { path: null, error: new Error('Supabase is not configured yet') }
  }
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true
      })
    if (error) throw error
    return { path: data.path, error: null }
  } catch (err) {
    console.warn('Storage upload error:', err)
    return { path: null, error: err }
  }
}

/**
 * Get a short-lived signed download URL for a private PDF in Supabase Storage
 * @param {string} bucketName - e.g. 'business-documents'
 * @param {string} filePath - The path returned during upload
 * @param {number} expiresIn - Seconds before URL expires (default 120s)
 * @returns {Promise<string | null>}
 */
export async function getSignedPdfUrl(bucketName, filePath, expiresIn = 120) {
  if (!isSupabaseConfigured || !supabase || !filePath) return null
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn)
    if (error) throw error
    return data.signedUrl
  } catch (err) {
    console.warn('Error creating signed URL:', err)
    return null
  }
}
