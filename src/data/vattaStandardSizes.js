/**
 * Fixed Standard Dimensions & Configuration for Vatta Wood Pencil Slats
 * G.K. Saw Mill Standard Measurements
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'

export const VATTA_STANDARD_ROWS = [
  {
    slNo: 1,
    item: '8 - Ply',
    length: 186,
    width: 77,
    thickness: 5.5,
    eachContains: 900,
  },
  {
    slNo: 2,
    item: '7 - Ply',
    length: 186,
    width: 71,
    thickness: 5.5,
    eachContains: 1000,
  },
  {
    slNo: 3,
    item: '6 - Ply',
    length: 186,
    width: 62,
    thickness: 5.5,
    eachContains: 1200,
  },
  {
    slNo: 4,
    item: '5 - Ply',
    length: 186,
    width: 55,
    thickness: 5.5,
    eachContains: 1400,
  },
  {
    slNo: 5,
    item: '4 - Ply',
    length: 186,
    width: 48,
    thickness: 5.5,
    eachContains: 1600,
  },
  {
    slNo: 6,
    item: '3 - Ply',
    length: 186,
    width: 40,
    thickness: 5.5,
    eachContains: 1800,
  },
]

// Sample Test Data provided by G.K. Saw Mill benchmark (Total: 285 bags, 305,300 pcs, ~20.689 CBM)
export const SAMPLE_VATTA_TEST_BAGS = {
  1: 185, // 8-Ply
  2: 18,  // 7-Ply
  3: 29,  // 6-Ply
  4: 16,  // 5-Ply
  5: 15,  // 4-Ply
  6: 22,  // 3-Ply
}

export const DEFAULT_VATTA_SETTINGS = {
  lorryRegNo: 'KL-58-D-1555',
  place: 'Nedumpana',
}

const STORAGE_KEY_VATTA_SETTINGS = 'gk_sawmill_vatta_settings'
const STORAGE_KEY_VATTA_SAVED = 'gk_sawmill_vatta_sheets'

/**
 * Retrieve stored persistent defaults (Lorry Reg No & Place)
 */
export function getStoredVattaSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VATTA_SETTINGS)
    if (raw) {
      return { ...DEFAULT_VATTA_SETTINGS, ...JSON.parse(raw) }
    }
  } catch (err) {
    console.error('Error reading stored Vatta settings:', err)
  }
  return { ...DEFAULT_VATTA_SETTINGS }
}

/**
 * Save persistent defaults (Lorry Reg No & Place)
 */
export function saveStoredVattaSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY_VATTA_SETTINGS, JSON.stringify(settings))
  } catch (err) {
    console.error('Error saving Vatta settings:', err)
  }
}

/**
 * Retrieve saved Vatta measurement sheets
 */
export function getSavedVattaSheets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VATTA_SAVED)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (err) {
    console.error('Error reading saved Vatta sheets:', err)
  }
  return []
}

/**
 * Save a complete Vatta sheet record
 */
export function saveVattaSheetRecord(sheet) {
  try {
    const existing = getSavedVattaSheets()
    const id = sheet.id || 'vatta_' + Date.now()
    const updatedRecord = {
      ...sheet,
      id,
      savedAt: new Date().toISOString(),
    }
    const idx = existing.findIndex((item) => item.id === id)
    let newList
    if (idx >= 0) {
      newList = [...existing]
      newList[idx] = updatedRecord
    } else {
      newList = [updatedRecord, ...existing]
    }
    localStorage.setItem(STORAGE_KEY_VATTA_SAVED, JSON.stringify(newList))

    // Asynchronously sync to Supabase in background
    if (isSupabaseConfigured && supabase) {
      syncVattaSheetToSupabase(updatedRecord).catch(err => {
        console.warn('Background Supabase vatta sheet sync notice:', err.message)
      })
    }

    return updatedRecord
  } catch (err) {
    console.error('Error saving Vatta sheet record:', err)
    return sheet
  }
}

export function deleteVattaSheetRecord(id) {
  try {
    const existing = getSavedVattaSheets().filter((item) => item.id !== id)
    localStorage.setItem(STORAGE_KEY_VATTA_SAVED, JSON.stringify(existing))

    // Asynchronously delete from Supabase if connected
    if (isSupabaseConfigured && supabase) {
      supabase.from('vatta_measurement_sheets').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase vatta sheet delete warning:', error.message)
      })
    }

    return existing
  } catch (err) {
    console.error('Error deleting Vatta sheet record:', err)
    return null
  }
}

/**
 * Sync Vatta measurement sheet to Supabase table `vatta_measurement_sheets`
 */
export async function syncVattaSheetToSupabase(record) {
  if (!isSupabaseConfigured || !supabase) return null

  const calcs = record.calculations || {}

  const row = {
    id: record.id,
    sheet_date: record.date || new Date().toISOString().split('T')[0],
    invoice_no: record.invoiceNo || null,
    pass_no: record.passNo || null,
    lorry_reg_no: record.lorryRegNo || null,
    place: record.place || null,
    total_bags: Number(calcs.grandTotalBags) || 0,
    total_pieces: Number(calcs.grandTotalPieces) || 0,
    grand_total_cbm: Number(calcs.unroundedTotalCbm) || 0,
    bag_quantities: record.bagQuantities || {},
    full_payload: record,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('vatta_measurement_sheets')
    .upsert(row, { onConflict: 'id' })
    .select()

  if (error) {
    console.warn('Supabase upsert vatta sheet warning:', error.message)
    throw error
  }
  return data
}

/**
 * Precise Row Calculations:
 * A. Total Pieces = Total Bags * Each Contains
 * B. CBM = (Length * Width * Thickness * Total Pieces) / 1,000,000,000
 * C. Grand Total CBM is calculated from the unrounded row values, then rounded to 3 decimal places.
 */
export function calculateVattaCalculations(bagQuantities = {}) {
  let grandTotalBags = 0
  let grandTotalPieces = 0
  let unroundedTotalCbm = 0

  const rows = VATTA_STANDARD_ROWS.map((stdRow) => {
    const rawBags = bagQuantities[stdRow.slNo]
    const bags = rawBags !== undefined && rawBags !== '' && !isNaN(parseInt(rawBags, 10))
      ? Math.max(0, parseInt(rawBags, 10))
      : 0

    const totalPieces = bags * stdRow.eachContains
    // Unrounded CBM in full precision
    const rowCbm = (stdRow.length * stdRow.width * stdRow.thickness * totalPieces) / 1000000000

    grandTotalBags += bags
    grandTotalPieces += totalPieces
    unroundedTotalCbm += rowCbm

    return {
      ...stdRow,
      bags,
      totalPieces,
      unroundedCbm: rowCbm,
      cbmFormatted: rowCbm.toFixed(3),
    }
  })

  return {
    rows,
    grandTotalBags,
    grandTotalPieces,
    unroundedTotalCbm,
    grandTotalCbmFormatted: unroundedTotalCbm.toFixed(3),
  }
}
