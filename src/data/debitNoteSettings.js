/**
 * Centralized Settings, Constants, Calculations & Storage Helpers
 * for Module 07: Debit Note Generator (Incentive & Annual Bonus Billing)
 * Primary References: Attached G.K. Saw Mill Debit Note Samples (DN-05, AA-09, AA-08)
 */

import { formatInvoiceGrandTotalWords } from '../utils/numberToWords.js'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'

export const DEBIT_NOTE_STORAGE_KEYS = {
  DEBIT_NOTES: 'gk_sawmill_debit_notes_records'
}

export const DEFAULT_INCENTIVE_DESCRIPTIONS = [
  'Annual Bonus - Vatta & Elave Slats for March 2026',
  'Special Incentive for the month of July-2025',
  'Annual Bonus From 01.04.2025-28.02.2026',
  'Annual Bonus on Vatta Wood Pencil Slats',
  'Special Performance Incentive on Delivered Quantity',
  'Turnover Bonus on Vatta Wood Pencil Slats'
]

export const DEFAULT_DEBIT_NOTE_SETTINGS = {
  sellerName: 'G.K. SAWMILL',
  sellerAddressLine: 'Katoor, Nedumpana P.O, Kollam, Kerala- 691577',
  sellerGstin: '32AHOPG1823G1ZP',
  mobile: '9446786175',
  email: 'anilkumarkottiyam175@gmail.com',
  legalCitation: '(See Section 34 of CGST Act & Rule 6 of Invoice Rules)',
  defaultHsn: '44219140',
  defaultRatePerBag: 100,
  defaultGstRate: 5
}

// Benchmark Reference 2: Single bill AA-09
export const SAMPLE_BENCHMARK_DEBIT_NOTE_AA09 = {
  id: 'debit_note_aa09_benchmark',
  debitNoteNo: 'AA-09',
  debitNoteDate: '2026-03-31',
  referenceNo: '',

  receiverName: 'HINDUSTAN PENCILS Pvt Ltd',
  receiverAddress: 'Plot No:-1 TO 15, ACHHAD INDUSTRIAL ESTATE, ACHHAD, TALUKA, TALASARI, PALGHAR, MAHARASHTRA-401606',
  receiverState: 'MAHARASHTRA',
  receiverStateCode: '27',
  receiverGstin: '27AAACH0401R1ZN',

  goodsDescription: 'Annual Bonus - Vatta & Elave Slats for March 2026',
  hsnCode: '44219140',
  taxTreatment: 'IGST',
  gstRate: 5,

  items: [
    {
      id: 'item-1',
      slNo: 1,
      description: 'Annual Bonus - Vatta & Elave Slats for March 2026',
      hsnCode: '44219140',
      billNo: 'A-48',
      billDate: '2026-03-11',
      bagsQty: 300,
      ratePerBag: 100
    }
  ]
}

// Benchmark Reference 3: Multi-bill AA-08
export const SAMPLE_BENCHMARK_DEBIT_NOTE_AA08 = {
  id: 'debit_note_aa08_benchmark',
  debitNoteNo: 'AA-08',
  debitNoteDate: '2026-03-23',
  referenceNo: '',

  receiverName: 'SANGHVI WOODS Pvt Ltd',
  receiverAddress: 'PLOT NO :- 2701/10, G.I.D.C, UMERGON\nNEAR KUBERA HOTEL, VALSAD-396171',
  receiverState: 'GUJARAT',
  receiverStateCode: '24',
  receiverGstin: '24AABCS4658N1ZY',

  goodsDescription: 'Annual Bonus From 01.04.2025-28.02.2026',
  hsnCode: '44219140',
  taxTreatment: 'IGST',
  gstRate: 5,

  items: [
    {
      id: 'item-1',
      slNo: 1,
      description: 'Annual Bonus From 01.04.2025-28.02.2026',
      hsnCode: '44219140',
      billNo: 'A-41',
      billDate: '2026-01-01',
      bagsQty: 300,
      ratePerBag: 100
    },
    {
      id: 'item-2',
      slNo: 2,
      description: '',
      hsnCode: '44219140',
      billNo: 'A-44',
      billDate: '2026-01-23',
      bagsQty: 300,
      ratePerBag: 100
    }
  ]
}

// Benchmark Reference 1: Incentive DN-05
export const SAMPLE_BENCHMARK_DEBIT_NOTE_DN05 = {
  id: 'debit_note_dn05_benchmark',
  debitNoteNo: 'DN-05',
  debitNoteDate: '2025-09-22',
  referenceNo: '',

  receiverName: 'HINDUSTAN PENCILS PVT. LTD',
  receiverAddress: '186/A2B, 173, 174, Singanallur Village Road, Naickenpalayam Village, Pollachi, Coimbatore, Tamil Nadu - 642004',
  receiverState: 'TAMIL NADU',
  receiverStateCode: '33',
  receiverGstin: '33AAACH0401R1ZU',

  goodsDescription: 'Special Incentive for the month of July-2025',
  hsnCode: '44219140',
  taxTreatment: 'IGST',
  gstRate: 12,

  items: [
    {
      id: 'item-1',
      slNo: 1,
      description: 'Special Incentive for the month of July-2025',
      hsnCode: '44219140',
      billNo: 'A-17',
      billDate: '2025-07-19',
      bagsQty: 260,
      ratePerBag: 100
    }
  ]
}

/**
 * Format Indian Currency (e.g. 30000 -> "30,000.00")
 */
export function formatIndianCurrency(amount) {
  if (amount === undefined || amount === null || amount === '') return ''
  const num = typeof amount === 'number' ? amount : parseFloat(amount)
  if (isNaN(num)) return amount.toString()

  const parts = num.toFixed(2).split('.')
  let intPart = parts[0]
  const decPart = parts[1]

  const lastThree = intPart.substring(intPart.length - 3)
  const otherNumbers = intPart.substring(0, intPart.length - 3)
  if (otherNumbers !== '') {
    intPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
  }
  return `${intPart}.${decPart}`
}

/**
 * Format date string to DD-MM-YYYY or DD-MMM-YY
 */
export function formatDebitNoteDate(dateStr, format = 'standard') {
  if (!dateStr) return ''
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(dateStr)) {
    return dateStr.replace(/\//g, '-')
  }
  const parts = dateStr.split('-')
  if (parts.length === 3 && parts[0].length === 4) {
    if (format === 'shortMonth') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const mIdx = parseInt(parts[1], 10) - 1
      const mStr = months[mIdx] || parts[1]
      const yrShort = parts[0].slice(-2)
      return `${parts[2]}-${mStr}-${yrShort}`
    }
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return dateStr
}

/**
 * Calculate totals for a Debit Note
 *
 * Line Taxable = Bags Qty * Rate Per Bag
 * Line GST = Line Taxable * (GST Rate / 100)
 * Line Total DN = Line Taxable + Line GST
 */
export function calculateDebitNoteTotals({
  items = [],
  taxTreatment = 'IGST',
  gstRate = 5
}) {
  const effectiveRate = Math.max(0, Number(gstRate) || 0)
  let totalBags = 0
  let totalTaxable = 0
  let totalGst = 0
  let totalDnAmt = 0

  const calculatedItems = items.map((item, index) => {
    const bagsQty = Math.max(0, parseInt(item.bagsQty, 10) || 0)
    const ratePerBag = Math.max(0, parseFloat(item.ratePerBag) || 0)
    const taxableAmount = Math.round((bagsQty * ratePerBag) * 100) / 100

    let cgstAmount = 0
    let sgstAmount = 0
    let igstAmount = 0

    if (taxTreatment === 'CGST_SGST') {
      cgstAmount = Math.round((taxableAmount * ((effectiveRate / 2) / 100)) * 100) / 100
      sgstAmount = Math.round((taxableAmount * ((effectiveRate / 2) / 100)) * 100) / 100
    } else {
      igstAmount = Math.round((taxableAmount * (effectiveRate / 100)) * 100) / 100
    }

    const lineGst = cgstAmount + sgstAmount + igstAmount
    const lineTotalDn = Math.round((taxableAmount + lineGst) * 100) / 100

    totalBags += bagsQty
    totalTaxable += taxableAmount
    totalGst += lineGst
    totalDnAmt += lineTotalDn

    return {
      ...item,
      slNo: index + 1,
      bagsQty,
      ratePerBag,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      lineGst,
      totalDnAmt
    }
  })

  totalTaxable = Math.round(totalTaxable * 100) / 100
  totalGst = Math.round(totalGst * 100) / 100
  totalDnAmt = Math.round(totalDnAmt * 100) / 100

  // Total in Words (matches "(Thirty One Thousand Five Hundred Only)")
  const totalInWords = formatInvoiceGrandTotalWords(totalDnAmt)

  return {
    calculatedItems,
    totalBags,
    totalTaxable,
    totalGst,
    totalDnAmt,
    totalInWords,
    taxTreatment,
    gstRate: effectiveRate
  }
}

/* =========================================================================
   LOCAL & REMOTE STORAGE HELPERS
   ========================================================================= */

export function getSavedDebitNotes() {
  try {
    const raw = localStorage.getItem(DEBIT_NOTE_STORAGE_KEYS.DEBIT_NOTES)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (err) {
    console.error('Error reading saved debit notes from localStorage:', err)
  }
  return []
}

export function saveDebitNoteRecord(record) {
  try {
    const current = getSavedDebitNotes()
    const id = record.id || `dn_${Date.now()}`
    const recordToSave = {
      ...record,
      id,
      updatedAt: new Date().toISOString()
    }
    if (!recordToSave.createdAt) {
      recordToSave.createdAt = recordToSave.updatedAt
    }

    const index = current.findIndex(dn => dn.id === id)
    let updated
    if (index >= 0) {
      updated = [...current]
      updated[index] = recordToSave
    } else {
      updated = [recordToSave, ...current]
    }
    localStorage.setItem(DEBIT_NOTE_STORAGE_KEYS.DEBIT_NOTES, JSON.stringify(updated))

    // Asynchronously sync to Supabase database if connected
    if (isSupabaseConfigured && supabase) {
      syncDebitNoteToSupabase(recordToSave).catch(err => {
        console.warn('Background Supabase debit note sync notice:', err)
      })
    }

    return updated
  } catch (err) {
    console.error('Error saving debit note record:', err)
    return null
  }
}

export function deleteDebitNoteRecord(id) {
  try {
    const updated = getSavedDebitNotes().filter(dn => dn.id !== id)
    localStorage.setItem(DEBIT_NOTE_STORAGE_KEYS.DEBIT_NOTES, JSON.stringify(updated))

    if (isSupabaseConfigured && supabase) {
      supabase.from('debit_notes').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase debit note delete error:', error)
      })
    }

    return updated
  } catch (err) {
    console.error('Error deleting debit note record:', err)
    return null
  }
}

/**
 * Sync a debit note record to Supabase table `debit_notes`
 */
export async function syncDebitNoteToSupabase(record) {
  if (!isSupabaseConfigured || !supabase) return null

  const row = {
    id: record.id,
    debit_note_no: record.debitNoteNo,
    debit_note_date: record.debitNoteDate,
    reference_no: record.referenceNo || null,

    receiver_name: record.receiverName,
    receiver_address: record.receiverAddress,
    receiver_state: record.receiverState || null,
    receiver_state_code: record.receiverStateCode || null,
    receiver_gstin: record.receiverGstin || null,

    goods_description: record.goodsDescription,
    hsn_code: record.hsnCode,

    total_bags: record.totalBags || 0,
    taxable_amount: record.totalTaxable || 0,
    tax_treatment: record.taxTreatment || 'IGST',
    gst_rate: record.gstRate || 5,
    gst_amount: record.totalGst || 0,
    total_dn_amount: record.totalDnAmt || 0,
    total_in_words: record.totalInWords,

    items_payload: record.items || [],
    full_payload: record,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('debit_notes')
    .upsert(row, { onConflict: 'id' })
    .select()

  if (error) {
    console.warn('Supabase upsert debit_note error:', error)
    throw error
  }
  return data
}
