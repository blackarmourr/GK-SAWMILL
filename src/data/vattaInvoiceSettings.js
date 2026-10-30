/**
 * Centralized Settings, Default Configuration & Calculations
 * for Module 01: Vatta GST Invoice Generator (Form GST Invoice - I)
 * G.K. Saw Mill industrial timber suite
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'

export const STORAGE_KEYS = {
  BUSINESS: 'gk_sawmill_vatta_inv_business',
  PRODUCTS: 'gk_sawmill_vatta_inv_products',
  RECEIVERS: 'gk_sawmill_vatta_inv_receivers',
  DESPATCHED: 'gk_sawmill_vatta_inv_despatched',
  INVOICES: 'gk_sawmill_vatta_inv_records'
}

export const DEFAULT_VATTA_BUSINESS_SETTINGS = {
  sellerName: 'G.K. SAW MILL',
  sellerAddressLine1: 'KATOOR, NEDUMPANA-P.O,',
  sellerAddressLine2: 'KOLLAM, KERALA -691576',
  telephone: '9446786175',
  email: 'anilkumarkottiyam175@gmail.com',
  sellerGstin: '32AHOPG1823G1ZP',
  defaultState: 'KERALA',
  defaultStateCode: '32',
  bankDetails: '',
  accountNumber: '',
  branchIfsc: '',
  termsAndConditions: ''
}

export const DEFAULT_VATTA_PRODUCTS = [
  {
    id: 1,
    item: '8 - Ply',
    description: '186 x 77 x 5.5 mm-900 Nos per Bag',
    hsnCode: '44219140',
    piecesPerBag: 900,
    unitPricePer1000: 2925.00,
    gstRate: 5
  },
  {
    id: 2,
    item: '7 - Ply',
    description: '186 x 71 x 5.5 mm-1000 Nos per Bag',
    hsnCode: '44219140',
    piecesPerBag: 1000,
    unitPricePer1000: 2600.00,
    gstRate: 5
  },
  {
    id: 3,
    item: '6 - Ply',
    description: '186 x 62 x 5.5 mm- 1200 Nos per Bag',
    hsnCode: '44219140',
    piecesPerBag: 1200,
    unitPricePer1000: 2310.00,
    gstRate: 5
  },
  {
    id: 4,
    item: '5 - Ply',
    description: '186 x 55 x 5.5 mm-1400 Nos per Bag',
    hsnCode: '44219140',
    piecesPerBag: 1400,
    unitPricePer1000: 1980.00,
    gstRate: 5
  },
  {
    id: 5,
    item: '4 - Ply',
    description: '186 x 48 x 5.5 mm-1600 Nos per Bag',
    hsnCode: '44219140',
    piecesPerBag: 1600,
    unitPricePer1000: 1650.00,
    gstRate: 5
  },
  {
    id: 6,
    item: '3 - Ply',
    description: '186 x 40 x 5.5 mm -1800 Nos per Bag',
    hsnCode: '44219140',
    piecesPerBag: 1800,
    unitPricePer1000: 1160.00,
    gstRate: 5
  }
]

export const DEFAULT_RECEIVER_PROFILES = [
  {
    id: 'receiver-hindustan',
    name: 'M/S. HINDUSTAN PENCILS PVT.LTD',
    address: '217/1 GIDC Estate\nUMERGAON, VALSAD, GUJARAT',
    pinNo: '396171',
    mobileNo: '',
    gstin: '24AAACH0401R1ZT',
    state: 'GUJARAT',
    stateCode: '24'
  }
]

export const DEFAULT_DESPATCHED_PROFILES = [
  {
    id: 'despatched-umesh',
    name: 'UMESH PENCILS PROCESSORS (P) LTD',
    address: '186/A2B, 173,174, SINGANALLUR VILLAGE ROAD,\nNAICKENPALAYAM VILLAGE, POLLACHI-642004,\nTAMILNADU',
    pinNo: '',
    mobileNo: '',
    gstin: '33AAACU0701F1Z3',
    state: 'TAMILNADU',
    stateCode: '33'
  }
]

export const SAMPLE_VATTA_INVOICE_A20 = {
  invoiceNo: 'A-20',
  purchaseOrderNo: '4100016589',
  invoiceDate: new Date().toISOString().split('T')[0],
  dateOfSupply: new Date().toISOString().split('T')[0],
  state: 'KERALA',
  stateCode: '32',
  placeOfSupply: 'TAMILNADU',
  transportationMode: '',
  vehicleNo: 'KL-58-D-1555',
  forestPassNo: '140/2026-27',
  totalMeasurement: '20.689',
  ewayBillNo: '5420 8705 0063',
  reverseCharge: 'No',

  // Receiver details
  receiverName: 'M/S. HINDUSTAN PENCILS PVT.LTD',
  receiverAddress: '217/1 GIDC Estate\nUMERGAON, VALSAD, GUJARAT',
  receiverPinNo: '396171',
  receiverMobileNo: '',
  receiverGstin: '24AAACH0401R1ZT',
  receiverState: 'GUJARAT',
  receiverStateCode: '24',

  // Despatched details
  despatchedName: 'UMESH PENCILS PROCESSORS (P) LTD',
  despatchedAddress: '186/A2B, 173,174, SINGANALLUR VILLAGE ROAD,\nNAICKENPALAYAM VILLAGE, POLLACHI-642004,\nTAMILNADU',
  despatchedPinNo: '',
  despatchedMobileNo: '',
  despatchedGstin: '33AAACU0701F1Z3',
  despatchedState: 'TAMILNADU',
  despatchedStateCode: '33',

  // Bag quantities
  bagQuantities: {
    1: 185, // 8-Ply -> 166,500 pcs -> 4,87,012.50
    2: 18,  // 7-Ply -> 18,000 pcs  -> 46,800.00
    3: 29,  // 6-Ply -> 34,800 pcs  -> 80,388.00
    4: 16,  // 5-Ply -> 22,400 pcs  -> 44,352.00
    5: 15,  // 4-Ply -> 24,000 pcs  -> 39,600.00
    6: 22   // 3-Ply -> 39,600 pcs  -> 45,936.00
  },

  taxTreatment: 'IGST',
  gstRate: 5,
  discount: '',
  freight: '',
  insurance: '',
  packingCharge: '',
  bankDetails: '',
  accountNumber: '',
  branchIfsc: '',
  termsAndConditions: '',
  roundOff: 0
}

/**
 * Format a number to Indian currency format (e.g. 781292.93 -> "7,81,292.93")
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
 * Format date string (YYYY-MM-DD) to DD-MM-YYYY or DD/MM/YYYY
 */
export function formatDate(dateStr, separator = '-') {
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
 * Line item & Total Calculations for Vatta products
 *
 * Formula:
 * Total Pieces = Bags * Pieces Per Bag
 * Line Value = (Total Pieces / 1000) * Unit Price Per 1000 Pieces
 */
export function calculateVattaInvoiceTotals({
  products = DEFAULT_VATTA_PRODUCTS,
  bagQuantities = {},
  taxTreatment = 'IGST',
  gstRate = 5,
  discount = 0,
  freight = 0,
  insurance = 0,
  packingCharge = 0,
  roundOffMode = 'exact' // 'exact' | 'nearest_rupee'
}) {
  let totalBags = 0
  let totalPieces = 0
  let subTotal = 0

  const lines = products.map((prod) => {
    const rawBags = bagQuantities[prod.id]
    const bags = rawBags !== undefined && rawBags !== '' && !isNaN(parseInt(rawBags, 10))
      ? Math.max(0, parseInt(rawBags, 10))
      : 0
    const piecesPerBag = Number(prod.piecesPerBag) || 0
    const pieces = bags * piecesPerBag
    const unitPrice = Number(prod.unitPricePer1000) || 0
    // Charged per 1000 pieces
    const lineValue = (pieces / 1000) * unitPrice

    totalBags += bags
    totalPieces += pieces
    subTotal += lineValue

    return {
      ...prod,
      bags,
      pieces,
      lineValue: Math.round(lineValue * 100) / 100
    }
  })

  subTotal = Math.round(subTotal * 100) / 100

  const discountVal = Number(discount) > 0 ? Number(discount) : 0
  const freightVal = Number(freight) > 0 ? Number(freight) : 0
  const insVal = Number(insurance) > 0 ? Number(insurance) : 0
  const packVal = Number(packingCharge) > 0 ? Number(packingCharge) : 0

  // Taxable value
  const taxableValue = Math.max(0, subTotal - discountVal + freightVal + insVal + packVal)

  const effectiveGstRate = Number(gstRate) || 0
  let cgstRate = 0, cgstAmount = 0
  let sgstRate = 0, sgstAmount = 0
  let igstRate = 0, igstAmount = 0

  if (taxTreatment === 'CGST_SGST') {
    cgstRate = effectiveGstRate / 2
    sgstRate = effectiveGstRate / 2
    cgstAmount = Math.round((taxableValue * (cgstRate / 100)) * 100) / 100
    sgstAmount = Math.round((taxableValue * (sgstRate / 100)) * 100) / 100
  } else {
    igstRate = effectiveGstRate
    igstAmount = Math.round((taxableValue * (igstRate / 100)) * 100) / 100
  }

  const totalGst = cgstAmount + sgstAmount + igstAmount
  let grandTotalBeforeRound = taxableValue + totalGst
  let roundOff = 0
  let grandTotal = grandTotalBeforeRound

  if (roundOffMode === 'nearest_rupee') {
    const rounded = Math.round(grandTotalBeforeRound)
    roundOff = Math.round((rounded - grandTotalBeforeRound) * 100) / 100
    grandTotal = rounded
  } else {
    grandTotal = Math.round(grandTotalBeforeRound * 100) / 100
  }

  return {
    lines,
    totalBags,
    totalPieces,
    subTotal,
    discountVal,
    taxableValue,
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,
    totalGst,
    roundOff,
    grandTotal
  }
}

/* =========================================================================
   LOCAL STORAGE PERSISTENCE HELPERS
   ========================================================================= */

export function getStoredVattaBusinessSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BUSINESS)
    if (raw) return { ...DEFAULT_VATTA_BUSINESS_SETTINGS, ...JSON.parse(raw) }
  } catch (err) {
    console.error('Error loading Vatta business settings:', err)
  }
  return { ...DEFAULT_VATTA_BUSINESS_SETTINGS }
}

export function saveStoredVattaBusinessSettings(settings) {
  try {
    const merged = { ...getStoredVattaBusinessSettings(), ...settings }
    localStorage.setItem(STORAGE_KEYS.BUSINESS, JSON.stringify(merged))
    return merged
  } catch (err) {
    console.error('Error saving Vatta business settings:', err)
    return settings
  }
}

export function getStoredVattaProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (err) {
    console.error('Error loading Vatta products:', err)
  }
  return [...DEFAULT_VATTA_PRODUCTS]
}

export function saveStoredVattaProducts(products) {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products))
    return products
  } catch (err) {
    console.error('Error saving Vatta products:', err)
    return products
  }
}

export function resetStoredVattaProducts() {
  try {
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS)
  } catch (err) {
    console.error('Error resetting Vatta products:', err)
  }
  return [...DEFAULT_VATTA_PRODUCTS]
}

export function getSavedReceiverProfiles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECEIVERS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (err) {
    console.error('Error loading receiver profiles:', err)
  }
  return [...DEFAULT_RECEIVER_PROFILES]
}

export function saveReceiverProfile(profile) {
  try {
    const list = getSavedReceiverProfiles()
    const index = list.findIndex(r => r.id === profile.id || (r.name && profile.name && r.name.trim().toLowerCase() === profile.name.trim().toLowerCase()))
    let updated
    if (index >= 0) {
      updated = [...list]
      updated[index] = { ...updated[index], ...profile }
    } else {
      const newP = { ...profile, id: profile.id || `receiver-${Date.now()}` }
      updated = [newP, ...list]
    }
    localStorage.setItem(STORAGE_KEYS.RECEIVERS, JSON.stringify(updated))
    return updated
  } catch (err) {
    console.error('Error saving receiver profile:', err)
    return null
  }
}

export function deleteReceiverProfile(id) {
  try {
    const list = getSavedReceiverProfiles().filter(r => r.id !== id)
    localStorage.setItem(STORAGE_KEYS.RECEIVERS, JSON.stringify(list))
    return list
  } catch (err) {
    console.error('Error deleting receiver profile:', err)
    return null
  }
}

export function getSavedDespatchedProfiles() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DESPATCHED)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (err) {
    console.error('Error loading despatched profiles:', err)
  }
  return [...DEFAULT_DESPATCHED_PROFILES]
}

export function saveDespatchedProfile(profile) {
  try {
    const list = getSavedDespatchedProfiles()
    const index = list.findIndex(d => d.id === profile.id || (d.name && profile.name && d.name.trim().toLowerCase() === profile.name.trim().toLowerCase()))
    let updated
    if (index >= 0) {
      updated = [...list]
      updated[index] = { ...updated[index], ...profile }
    } else {
      const newP = { ...profile, id: profile.id || `despatched-${Date.now()}` }
      updated = [newP, ...list]
    }
    localStorage.setItem(STORAGE_KEYS.DESPATCHED, JSON.stringify(updated))
    return updated
  } catch (err) {
    console.error('Error saving despatched profile:', err)
    return null
  }
}

export function deleteDespatchedProfile(id) {
  try {
    const list = getSavedDespatchedProfiles().filter(d => d.id !== id)
    localStorage.setItem(STORAGE_KEYS.DESPATCHED, JSON.stringify(list))
    return list
  } catch (err) {
    console.error('Error deleting despatched profile:', err)
    return null
  }
}

export function getSavedVattaInvoices() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVOICES)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (err) {
    console.error('Error loading saved Vatta invoices:', err)
  }
  return []
}

export function saveVattaInvoiceRecord(record) {
  try {
    const current = getSavedVattaInvoices()
    const id = record.id || `vatta_inv_${Date.now()}`
    const recordToSave = {
      ...record,
      id,
      savedAt: new Date().toISOString()
    }
    const index = current.findIndex(inv => inv.id === id)
    let updated
    if (index >= 0) {
      updated = [...current]
      updated[index] = recordToSave
    } else {
      updated = [recordToSave, ...current]
    }
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(updated))

    // Asynchronously sync to Supabase in background
    if (isSupabaseConfigured && supabase) {
      syncVattaInvoiceToSupabase(recordToSave).catch(err => {
        console.warn('Background Supabase vatta invoice sync notice:', err.message)
      })
    }

    return updated
  } catch (err) {
    console.error('Error saving Vatta invoice record:', err)
    return null
  }
}

export function deleteVattaInvoiceRecord(id) {
  try {
    const updated = getSavedVattaInvoices().filter(inv => inv.id !== id)
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(updated))

    // Asynchronously delete from Supabase if connected
    if (isSupabaseConfigured && supabase) {
      supabase.from('vatta_invoices').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase vatta invoice delete warning:', error.message)
      })
    }

    return updated
  } catch (err) {
    console.error('Error deleting Vatta invoice record:', err)
    return null
  }
}

/**
 * Sync a single Vatta GST invoice record to Supabase table `vatta_invoices`
 */
export async function syncVattaInvoiceToSupabase(record) {
  if (!isSupabaseConfigured || !supabase) return null

  const data = record.invoiceData || {}
  const totals = record.totals || {}

  const row = {
    id: record.id,
    invoice_no: data.invoiceNo || 'Draft',
    purchase_order_no: data.purchaseOrderNo || null,
    invoice_date: data.invoiceDate || new Date().toISOString().split('T')[0],
    date_of_supply: data.dateOfSupply || null,
    state: data.state || 'KERALA',
    state_code: data.stateCode || '32',
    place_of_supply: data.placeOfSupply || null,
    transportation_mode: data.transportationMode || null,
    vehicle_no: data.vehicleNo || null,
    forest_pass_no: data.forestPassNo || null,
    total_measurement: Number(data.totalMeasurement) || null,
    eway_bill_no: data.ewayBillNo || null,
    reverse_charge: data.reverseCharge !== undefined && data.reverseCharge !== null ? data.reverseCharge : '',

    receiver_name: data.receiverName || 'Unnamed Purchaser',
    receiver_address: data.receiverAddress || null,
    receiver_pin_no: data.receiverPinNo || null,
    receiver_mobile_no: data.receiverMobileNo || null,
    receiver_gstin: data.receiverGstin || null,
    receiver_state: data.receiverState || null,
    receiver_state_code: data.receiverStateCode || null,

    despatched_name: data.despatchedName || null,
    despatched_address: data.despatchedAddress || null,
    despatched_pin_no: data.despatchedPinNo || null,
    despatched_mobile_no: data.despatchedMobileNo || null,
    despatched_gstin: data.despatchedGstin || null,
    despatched_state: data.despatchedState || null,
    despatched_state_code: data.despatchedStateCode || null,

    bag_quantities: data.bagQuantities || {},
    products_snapshot: record.productsSnapshot || [],
    total_bags: Number(totals.totalBags) || 0,
    total_pieces: Number(totals.totalPieces) || 0,
    sub_total: Number(totals.subTotal) || 0,
    discount_val: Number(totals.discountVal) || 0,
    freight: Number(totals.freightVal) || 0,
    insurance: Number(totals.insuranceVal) || 0,
    packing_charge: Number(totals.packingChargeVal) || 0,
    taxable_value: Number(totals.taxableValue) || 0,
    tax_treatment: data.taxTreatment || 'IGST',
    gst_rate: Number(data.gstRate) || 5,
    cgst_amount: Number(totals.cgstAmount) || 0,
    sgst_amount: Number(totals.sgstAmount) || 0,
    igst_amount: Number(totals.igstAmount) || 0,
    round_off: Number(totals.roundOff) || 0,
    grand_total: Number(record.grandTotal || totals.grandTotal) || 0,

    full_payload: record,
    updated_at: new Date().toISOString()
  }

  const { data: resData, error } = await supabase
    .from('vatta_invoices')
    .upsert(row, { onConflict: 'id' })
    .select()

  if (error) {
    console.warn('Supabase upsert vatta_invoice warning:', error.message)
    throw error
  }
  return resData
}
