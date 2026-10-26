/**
 * Centralized Settings, Constants, Calculations & Storage Helpers
 * for Module 06: Credit Note Generator (Section 34 CGST Act)
 * Exclusively for Vatta Wood Business against Vatta Invoices
 * Primary Benchmark: Sample Credit Note CN-09 against Invoice A-20
 */

import { formatCreditNoteWords } from '../utils/numberToWords.js'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'

export const CREDIT_NOTE_STORAGE_KEYS = {
  CREDIT_NOTES: 'gk_sawmill_credit_notes_records'
}

export const DEFAULT_VATTA_PLY_LIST = [
  '8-Ply',
  '7-Ply',
  '6-Ply',
  '5-Ply',
  '4-Ply',
  '3-Ply',
  'All Plies'
]

export const DEFAULT_CREDIT_REASONS = [
  'Short Width of 8-Ply',
  'Shortage Qty - 8 Ply',
  'Short Width (Rate Difference)',
  'Shortage Quantity',
  'Thickness Less than 5.0mm',
  'Major Wood Defect',
  'Heavy Crack',
  'Length Less than 186mm',
  'Major Bend',
  'Rejection Refund',
  'Rate Difference Adjustment',
  'Quality Discount',
  'Damaged / Defective Slats Returned',
  'Post-Sales Price Concession'
]

export const DEFAULT_CREDIT_NOTE_SETTINGS = {
  sellerName: 'G.K. SAWMILL',
  sellerAddressLine: 'Katoor, Nedumpana P.O, Kollam, Kerala- 691577',
  sellerGstin: '32AHOPG1823G1ZP',
  mobile: '9446786175',
  email: 'anilkumarkottiyam175@gmail.com',
  legalCitation: '(See section 34 CGST Act& Ruless 6 of Invoice Rules)',
  defaultHsn: '44219140'
}

export const SAMPLE_BENCHMARK_CREDIT_NOTE_CN09 = {
  id: 'credit_note_cn09_benchmark',
  creditNoteNo: 'CN-09',
  creditNoteDate: '2026-10-17',
  referenceNo: '',

  // Ply specification
  ply: '8-Ply',

  // Linked to original Vatta invoice A-20
  originalInvoiceId: 'vatta_inv_sample_a20',
  originalInvoiceNo: 'A-20',
  originalInvoiceDate: '2026-10-10',

  // Receiver details
  receiverName: 'M/S. HINDUSTAN PENCILS PVT.LTD',
  receiverAddress: '217/1 GIDC Estate\nUMBERGAON, VALSAD, GUJARAT\nPin No:- 396171',
  receiverPinNo: '396171',
  receiverMobileNo: '',
  receiverGstin: '24AAACH0401R1ZT',
  receiverState: 'GUJARAT',
  receiverStateCode: '24',

  // Despatched details
  despatchedName: 'UMESH PENCILS PROCESSORS (P) LTD',
  despatchedAddress: '186/A2B, 173,174, SINGANALLUR VILLAGE\nROAD, NAICKENPALAYAM VILLAGE,\nPOLLACHI-642004, TAMILNADU',
  despatchedPinNo: '',
  despatchedMobileNo: '',
  despatchedGstin: '33AAACU0701F1Z3',
  despatchedState: 'TAMILNADU',
  despatchedStateCode: '33',

  // Goods and credit item
  goodsDescription: 'Vatta wood Pencil Slats (8-Ply)\n(Short Width of 8-Ply)',
  creditReason: 'Short Width of 8-Ply',
  hsnCode: '44219140',

  // Calculations matching benchmark image exactly
  taxableAmount: 1301.64,
  taxTreatment: 'IGST',
  gstRate: 5,
  cgstRate: 0,
  cgstAmount: 0,
  sgstRate: 0,
  sgstAmount: 0,
  igstRate: 5,
  igstAmount: 65.08,
  roundOff: 0.28,
  netValue: 1367,
  totalInWords: 'One Thousand Three Hundred and Sixty Seven Only.'
}

/**
 * Format a number to Indian currency representation (e.g. 1301.64 -> "1,301.64")
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
 * Format date string to DD/MM/YYYY or DD-MM-YYYY
 */
export function formatCreditNoteDate(dateStr, separator = '/') {
  if (!dateStr) return ''
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(dateStr)) {
    return dateStr.replace(/[-/]/g, separator)
  }
  const parts = dateStr.split('-')
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}${separator}${parts[1]}${separator}${parts[0]}`
  }
  try {
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()
      return `${day}${separator}${month}${separator}${year}`
    }
  } catch {
    // fallback
  }
  return dateStr
}

/**
 * Perform precise financial and tax calculations for the credit note
 *
 * Taxable Amt = User value or calculated from rejected items
 * IGST (5%) = Taxable Amt * 5% = e.g. 1301.64 * 0.05 = 65.08
 * Round Off = Rounded Net - (Taxable + GST) = 1367 - 1366.72 = +0.28
 * Net Value = 1367
 * Total in words = "One Thousand Three Hundred and Sixty Seven Only."
 */
export function calculateCreditNoteTotals({
  taxableAmount = 0,
  taxTreatment = 'IGST',
  gstRate = 5
}) {
  const taxable = Math.max(0, Math.round((Number(taxableAmount) || 0) * 100) / 100)
  const rate = Math.max(0, Number(gstRate) || 0)

  let cgstRate = 0
  let cgstAmount = 0
  let sgstRate = 0
  let sgstAmount = 0
  let igstRate = 0
  let igstAmount = 0

  if (taxTreatment === 'CGST_SGST') {
    cgstRate = rate / 2
    sgstRate = rate / 2
    cgstAmount = Math.round((taxable * (cgstRate / 100)) * 100) / 100
    sgstAmount = Math.round((taxable * (sgstRate / 100)) * 100) / 100
  } else {
    igstRate = rate
    igstAmount = Math.round((taxable * (igstRate / 100)) * 100) / 100
  }

  const totalGst = cgstAmount + sgstAmount + igstAmount
  const totalBeforeRound = taxable + totalGst
  const roundedNet = Math.round(totalBeforeRound)
  const roundOff = Math.round((roundedNet - totalBeforeRound) * 100) / 100
  const netValue = roundedNet

  const totalInWords = formatCreditNoteWords(netValue)

  return {
    taxableAmount: taxable,
    taxTreatment,
    gstRate: rate,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    totalGst,
    roundOff,
    netValue,
    totalInWords
  }
}

/* =========================================================================
   LOCAL & REMOTE STORAGE HELPERS
   ========================================================================= */

export function getSavedCreditNotes() {
  try {
    const raw = localStorage.getItem(CREDIT_NOTE_STORAGE_KEYS.CREDIT_NOTES)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (err) {
    console.error('Error reading saved credit notes from localStorage:', err)
  }
  return []
}

export function saveCreditNoteRecord(record) {
  try {
    const current = getSavedCreditNotes()
    const id = record.id || `cn_${Date.now()}`
    const recordToSave = {
      ...record,
      id,
      updatedAt: new Date().toISOString()
    }
    if (!recordToSave.createdAt) {
      recordToSave.createdAt = recordToSave.updatedAt
    }

    const index = current.findIndex(cn => cn.id === id)
    let updated
    if (index >= 0) {
      updated = [...current]
      updated[index] = recordToSave
    } else {
      updated = [recordToSave, ...current]
    }
    localStorage.setItem(CREDIT_NOTE_STORAGE_KEYS.CREDIT_NOTES, JSON.stringify(updated))

    // Asynchronously sync to Supabase database if connected and authenticated
    if (isSupabaseConfigured && supabase) {
      syncCreditNoteToSupabase(recordToSave).catch(err => {
        console.warn('Background Supabase credit note sync notice:', err)
      })
    }

    return updated
  } catch (err) {
    console.error('Error saving credit note record:', err)
    return null
  }
}

export function deleteCreditNoteRecord(id) {
  try {
    const updated = getSavedCreditNotes().filter(cn => cn.id !== id)
    localStorage.setItem(CREDIT_NOTE_STORAGE_KEYS.CREDIT_NOTES, JSON.stringify(updated))

    // Asynchronously delete from Supabase if connected
    if (isSupabaseConfigured && supabase) {
      supabase.from('credit_notes').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase credit note delete error:', error)
      })
    }

    return updated
  } catch (err) {
    console.error('Error deleting credit note record:', err)
    return null
  }
}

/**
 * Sync a credit note record to Supabase table `credit_notes`
 */
export async function syncCreditNoteToSupabase(record) {
  if (!isSupabaseConfigured || !supabase) return null

  const row = {
    id: record.id,
    credit_note_no: record.creditNoteNo,
    credit_note_date: record.creditNoteDate,
    reference_no: record.referenceNo || null,
    original_invoice_id: record.originalInvoiceId,
    original_invoice_no: record.originalInvoiceNo,
    original_invoice_date: record.originalInvoiceDate,

    receiver_name: record.receiverName,
    receiver_address: record.receiverAddress,
    receiver_pin_no: record.receiverPinNo || null,
    receiver_mobile_no: record.receiverMobileNo || null,
    receiver_gstin: record.receiverGstin || null,
    receiver_state: record.receiverState || null,
    receiver_state_code: record.receiverStateCode || null,

    despatched_name: record.despatchedName || null,
    despatched_address: record.despatchedAddress || null,
    despatched_pin_no: record.despatchedPinNo || null,
    despatched_mobile_no: record.despatchedMobileNo || null,
    despatched_gstin: record.despatchedGstin || null,
    despatched_state: record.despatchedState || null,
    despatched_state_code: record.despatchedStateCode || null,

    goods_description: record.goodsDescription,
    credit_reason: record.creditReason,
    hsn_code: record.hsnCode,

    taxable_amount: record.taxableAmount,
    tax_treatment: record.taxTreatment,
    gst_rate: record.gstRate,
    cgst_rate: record.cgstRate || 0,
    cgst_amount: record.cgstAmount || 0,
    sgst_rate: record.sgstRate || 0,
    sgst_amount: record.sgstAmount || 0,
    igst_rate: record.igstRate || 0,
    igst_amount: record.igstAmount || 0,
    round_off: record.roundOff || 0,
    net_value: record.netValue,
    total_in_words: record.totalInWords,

    pdf_storage_path: record.pdfStoragePath || null,
    full_payload: record,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('credit_notes')
    .upsert(row, { onConflict: 'id' })
    .select()

  if (error) {
    console.warn('Supabase upsert credit_note error:', error)
    throw error
  }
  return data
}
