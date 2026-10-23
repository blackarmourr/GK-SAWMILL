/**
 * Kerala Value Added Tax Rules - 2005 Form No. 8F
 * Data definitions, storage helpers, and sample specifications
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'

export const STORAGE_KEYS = {
  CONSIGNER: 'gk_vat_consigner_profile',
  CONSIGNEES: 'gk_vat_saved_consignees',
  PRINCIPAL_AGENTS: 'gk_vat_saved_principal_agents',
  TRANSPORTERS: 'gk_vat_saved_transporters',
  CARRIERS: 'gk_vat_saved_carriers',
  DRIVERS: 'gk_vat_saved_drivers',
  SETTINGS: 'gk_vat_settings',
  SAVED_BILLS: 'gk_vat_saved_bills'
}

export const DEFAULT_VAT_CONSIGNER = {
  id: 'default-consigner',
  name: 'G. Anil Kumar',
  businessName: 'G.K. Saw Mill',
  address: 'Kattur, Nedumpana, Kollam',
  pinCode: '691576',
  registration: '32AHOPG1823G1ZP',
  phone: '',
  email: '',
  pan: 'AHOPG1823G'
}

export const DEFAULT_VAT_CONSIGNEES = [
  {
    id: 'consignee-hindustan',
    companyName: 'M/S. HINDUSTAN PENCILS PVT. LTD',
    address: '217/1 GIDC Estate',
    city: '',
    state: '',
    pinCode: '',
    gstin: '24AAACH0401R1ZT',
    tinCst: '',
    phone: '',
    email: ''
  }
]

export const DEFAULT_VAT_PRINCIPAL_AGENTS = [
  {
    id: 'agent-umesh',
    name: 'UMESH PENCILS PROCESSORS (P) LTD',
    gstin: '33AAACU0701F1Z3',
    address: '',
    phone: ''
  }
]

export const DEFAULT_VAT_TRANSPORTERS = [
  {
    id: 'transporter-total',
    name: 'TOTAL LOGISTICS (INDIA) PVT. LTD.',
    gstin: '',
    phone: '',
    address: ''
  }
]

export const DEFAULT_VAT_CARRIERS = [
  {
    id: 'carrier-jeilani',
    name: 'JEILANI P',
    gstin: '',
    address: '',
    phone: ''
  }
]

export const DEFAULT_VAT_DRIVERS = [
  {
    id: 'driver-jeilani',
    name: 'JEILANI P',
    licenceNo: 'TN 41 19970001161',
    state: 'TAMILNADU',
    address: '',
    phone: ''
  }
]

export const DEFAULT_VAT_SETTINGS = {
  transactionType: 'Regular',
  transportMode: 'By Road',
  place: 'Nedumpana'
}

export const SAMPLE_VAT_BILL = {
  // Field 1
  consignerName: 'Anil Kumar.G',
  consignerBusinessName: 'G.K. Saw Mill',
  consignerAddress: 'Kattur, Nedumpana, Kollam',
  consignerRegistration: '32AHOPG1823G1ZP',
  consignerPin: '691576',

  // Field 2
  ewayBillNo: '5420 8705 0063',

  // Field 3
  transactionType: 'Regular',

  // Field 4
  consigneeName: 'M/S. HINDUSTAN PENCILS PVT. LTD',
  consigneeAddress: '217/1 GIDC Estate',
  consigneeGstin: '24AAACH0401R1ZT',

  // Field 5
  consignerSeller: 'G.K. SAW MILL',

  // Field 6
  principalAgentName: 'UMESH PENCILS PROCESSORS (P) LTD',
  principalAgentGstin: '33AAACU0701F1Z3',

  // Field 7
  goodsDescription: 'Vatta wood & Pencil Slats',
  bagQuantity: 285,

  // Field 8
  billNo: 'A-20',
  billDate: '2026-10-10',
  billValue: 781292.93,

  // Field 9
  transportMode: 'By Road',
  vehicleNo: '',

  // Field 10
  transporterName: 'TOTAL LOGISTICS (INDIA) PVT. LTD.',
  transportDocNo: '',
  transportDocDate: '',

  // Field 11
  carrierName: 'JEILANI P',
  carrierAddress: '',

  // Field 12
  driverName: 'JEILANI P',
  driverLicenceNo: 'TN 41 19970001161',
  driverState: 'TAMILNADU',

  // Declaration & Signature
  declarationDate: '2026-10-10',
  declarationPlace: 'Nedumpana',
  signatoryName: 'G. Anil Kumar'
}

/**
 * Format a number as Indian Currency (e.g. 781292.93 -> 7,81,292.93)
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
 * Format a Date object or YYYY-MM-DD string to DD-MM-YYYY or DD/MM/YYYY
 */
export function formatDate(dateStr, separator = '-') {
  if (!dateStr) return ''
  // If already in DD-MM-YYYY or DD/MM/YYYY
  if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(dateStr)) {
    return dateStr.replace(/[-/]/g, separator)
  }
  // If in YYYY-MM-DD
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

/* =========================================================================
   LOCAL STORAGE PERSISTENCE HELPERS
   ========================================================================= */

export function getVatConsignerProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONSIGNER)
    if (raw) return { ...DEFAULT_VAT_CONSIGNER, ...JSON.parse(raw) }
  } catch (err) {
    console.error('Failed to load VAT consigner profile:', err)
  }
  return { ...DEFAULT_VAT_CONSIGNER }
}

export function saveVatConsignerProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEYS.CONSIGNER, JSON.stringify(profile))
    return true
  } catch (err) {
    console.error('Failed to save VAT consigner profile:', err)
    return false
  }
}

export function getSavedVatConsignees() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONSIGNEES)
    if (raw) return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to load saved VAT consignees:', err)
  }
  return [...DEFAULT_VAT_CONSIGNEES]
}

export function saveVatConsignee(consignee) {
  try {
    const list = getSavedVatConsignees()
    const index = list.findIndex(c => c.id === consignee.id)
    if (index >= 0) {
      list[index] = consignee
    } else {
      list.unshift(consignee)
    }
    localStorage.setItem(STORAGE_KEYS.CONSIGNEES, JSON.stringify(list))
    return list
  } catch (err) {
    console.error('Failed to save consignee:', err)
    return null
  }
}

export function deleteVatConsignee(id) {
  try {
    const list = getSavedVatConsignees().filter(c => c.id !== id)
    localStorage.setItem(STORAGE_KEYS.CONSIGNEES, JSON.stringify(list))
    return list
  } catch (err) {
    console.error('Failed to delete consignee:', err)
    return null
  }
}

export function getSavedVatPrincipalAgents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRINCIPAL_AGENTS)
    if (raw) return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to load saved principal agents:', err)
  }
  return [...DEFAULT_VAT_PRINCIPAL_AGENTS]
}

export function saveVatPrincipalAgent(agent) {
  try {
    const list = getSavedVatPrincipalAgents()
    const index = list.findIndex(a => a.id === agent.id)
    if (index >= 0) {
      list[index] = agent
    } else {
      list.unshift(agent)
    }
    localStorage.setItem(STORAGE_KEYS.PRINCIPAL_AGENTS, JSON.stringify(list))
    return list
  } catch (err) {
    console.error('Failed to save principal agent:', err)
    return null
  }
}

export function deleteVatPrincipalAgent(id) {
  try {
    const list = getSavedVatPrincipalAgents().filter(a => a.id !== id)
    localStorage.setItem(STORAGE_KEYS.PRINCIPAL_AGENTS, JSON.stringify(list))
    return list
  } catch (err) {
    console.error('Failed to delete principal agent:', err)
    return null
  }
}

export function getSavedVatTransporters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSPORTERS)
    if (raw) return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to load saved transporters:', err)
  }
  return [...DEFAULT_VAT_TRANSPORTERS]
}

export function saveVatTransporter(transporter) {
  try {
    const list = getSavedVatTransporters()
    const index = list.findIndex(t => t.id === transporter.id)
    if (index >= 0) {
      list[index] = transporter
    } else {
      list.unshift(transporter)
    }
    localStorage.setItem(STORAGE_KEYS.TRANSPORTERS, JSON.stringify(list))
    return list
  } catch (err) {
    console.error('Failed to save transporter:', err)
    return null
  }
}

export function deleteVatTransporter(id) {
  try {
    const list = getSavedVatTransporters().filter(t => t.id !== id)
    localStorage.setItem(STORAGE_KEYS.TRANSPORTERS, JSON.stringify(list))
    return list
  } catch (err) {
    console.error('Failed to delete transporter:', err)
    return null
  }
}

export function getSavedVatCarriers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CARRIERS)
    if (raw) return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to load saved carriers:', err)
  }
  return [...DEFAULT_VAT_CARRIERS]
}

export function saveVatCarrier(carrier) {
  try {
    const list = getSavedVatCarriers()
    const index = list.findIndex(c => c.id === carrier.id)
    if (index >= 0) {
      list[index] = carrier
    } else {
      list.unshift(carrier)
    }
    localStorage.setItem(STORAGE_KEYS.CARRIERS, JSON.stringify(list))
    return list
  } catch (err) {
    console.error('Failed to save carrier:', err)
    return null
  }
}

export function deleteVatCarrier(id) {
  try {
    const list = getSavedVatCarriers().filter(c => c.id !== id)
    localStorage.setItem(STORAGE_KEYS.CARRIERS, JSON.stringify(list))
    return list
  } catch (err) {
    console.error('Failed to delete carrier:', err)
    return null
  }
}

export function getSavedVatDrivers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRIVERS)
    if (raw) return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to load saved drivers:', err)
  }
  return [...DEFAULT_VAT_DRIVERS]
}

export function saveVatDriver(driver) {
  try {
    const list = getSavedVatDrivers()
    const index = list.findIndex(d => d.id === driver.id)
    if (index >= 0) {
      list[index] = driver
    } else {
      list.unshift(driver)
    }
    localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(list))
    return list
  } catch (err) {
    console.error('Failed to save driver:', err)
    return null
  }
}

export function deleteVatDriver(id) {
  try {
    const list = getSavedVatDrivers().filter(d => d.id !== id)
    localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(list))
    return list
  } catch (err) {
    console.error('Failed to delete driver:', err)
    return null
  }
}

export function getVatSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS)
    if (raw) return { ...DEFAULT_VAT_SETTINGS, ...JSON.parse(raw) }
  } catch (err) {
    console.error('Failed to load VAT settings:', err)
  }
  return { ...DEFAULT_VAT_SETTINGS }
}

export function saveVatSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
    return true
  } catch (err) {
    console.error('Failed to save VAT settings:', err)
    return false
  }
}

export function getSavedVatBills() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SAVED_BILLS)
    if (raw) return JSON.parse(raw)
  } catch (err) {
    console.error('Failed to load saved VAT bills:', err)
  }
  return []
}

export function saveVatBillRecord(billData, title) {
  try {
    const list = getSavedVatBills()
    const id = billData.id || `vat-bill-${Date.now()}`
    const record = {
      id,
      title: title || `Bill ${billData.billNo || 'Draft'} - ${billData.consigneeName || 'Consignee'}`,
      savedAt: new Date().toISOString(),
      billData: { ...billData, id }
    }
    const index = list.findIndex(b => b.id === id)
    if (index >= 0) {
      list[index] = record
    } else {
      list.unshift(record)
    }
    localStorage.setItem(STORAGE_KEYS.SAVED_BILLS, JSON.stringify(list))

    // Asynchronously sync to Supabase in background
    if (isSupabaseConfigured && supabase) {
      syncVatBillToSupabase(record).catch(err => {
        console.warn('Background Supabase vat bill sync notice:', err.message)
      })
    }

    return { list, record }
  } catch (err) {
    console.error('Failed to save VAT bill record:', err)
    return null
  }
}

export function deleteVatBillRecord(id) {
  try {
    const list = getSavedVatBills().filter(b => b.id !== id)
    localStorage.setItem(STORAGE_KEYS.SAVED_BILLS, JSON.stringify(list))

    // Asynchronously delete from Supabase if connected
    if (isSupabaseConfigured && supabase) {
      supabase.from('kerala_vat_bills').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase vat bill delete warning:', error.message)
      })
    }

    return list
  } catch (err) {
    console.error('Failed to delete VAT bill record:', err)
    return null
  }
}

/**
 * Sync Kerala VAT bill to Supabase table `kerala_vat_bills`
 */
export async function syncVatBillToSupabase(record) {
  if (!isSupabaseConfigured || !supabase) return null

  const bill = record.billData || {}

  const row = {
    id: record.id,
    bill_no: bill.billNo || 'Draft',
    bill_date: bill.billDate || new Date().toISOString().split('T')[0],
    bill_value: Number(bill.billValue) || 0,
    eway_bill_no: bill.ewayBillNo || null,
    vehicle_no: bill.vehicleNo || null,

    consigner_name: bill.consignerName || null,
    consigner_business_name: bill.consignerBusinessName || null,

    consignee_name: bill.consigneeName || 'Consignee',
    consignee_address: bill.consigneeAddress || null,
    consignee_gstin: bill.consigneeGstin || null,
    consignee_state: bill.consigneeState || null,

    goods_description: bill.goodsDescription || null,
    bag_quantity: Number(bill.bagQuantity) || 0,

    transporter_name: bill.transporterName || null,
    transport_doc_no: bill.transportDocNo || null,

    full_payload: record,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('kerala_vat_bills')
    .upsert(row, { onConflict: 'id' })
    .select()

  if (error) {
    console.warn('Supabase upsert vat bill warning:', error.message)
    throw error
  }
  return data
}
