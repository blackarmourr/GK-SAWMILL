/**
 * Centralized Settings and Default Configuration for G.K. Saw Mill Invoice Generator
 */

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'

export const DEFAULT_BUSINESS_SETTINGS = {
  businessName: 'G.K. SAW MILL',
  addressLine1: 'KATOOR, NEDUMPANA - P.O.,',
  addressLine2: 'KOLLAM, KERALA - 691576',
  telephone: '9446786175',
  email: 'anilkumarkottiyam175@gmail.com',
  gstin: '32AHOPG1823G1ZP',
  state: 'Kerala',
  stateCode: '32',
  
  // Product defaults
  mahoganyHsn: '4407',
  mahoganyDefaultRate: 215.00,
  manjiyamHsn: '4407',
  manjiyamDefaultRate: 210.00,
  
  // Tax defaults
  defaultGstRate: 18.00,
  defaultTaxTreatment: 'IGST', // 'IGST' | 'CGST_SGST'
  
  // Bank details
  bankName: '',
  accountNumber: '',
  branchIfsc: '',
  termsAndConditions: '',
  
  // Rounding setting: 'exact' | 'nearest_rupee'
  roundingMode: 'exact'
}

const SETTINGS_STORAGE_KEY = 'gk_sawmill_invoice_settings'
const SAVED_CUSTOMERS_KEY = 'gk_sawmill_saved_customers'
const SAVED_INVOICES_KEY = 'gk_sawmill_saved_invoices'

/**
 * Retrieve current settings merged with defaults
 */
export function getStoredSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_BUSINESS_SETTINGS, ...parsed }
    }
  } catch (err) {
    console.error('Error loading settings from localStorage', err)
  }
  return { ...DEFAULT_BUSINESS_SETTINGS }
}

/**
 * Save updated settings to localStorage
 */
export function saveStoredSettings(newSettings) {
  try {
    const merged = { ...getStoredSettings(), ...newSettings }
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged))
    return merged
  } catch (err) {
    console.error('Error saving settings to localStorage', err)
    return newSettings
  }
}

/**
 * Saved Customers Management
 */
export const DEFAULT_CUSTOMERS = [
  {
    id: 'cust-amman',
    name: 'SREE AMMAN TRADERS',
    address: '15, Solaialagupuram Ist Street\n25 Solaialagupuram Main Road\nJAIHINDPURAM\nMADURAI, TAMILNADU -625011',
    gstin: '33JYGPK7174A1ZF',
    state: 'Tamil Nadu',
    stateCode: '33',
    placeOfSupply: 'Tamil Nadu'
  }
]

export function getSavedCustomers() {
  try {
    const raw = localStorage.getItem(SAVED_CUSTOMERS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (err) {
    console.error('Error reading saved customers', err)
  }
  return DEFAULT_CUSTOMERS
}

export function saveCustomer(customer) {
  try {
    const current = getSavedCustomers()
    const existingIndex = current.findIndex(c => c.id === customer.id || (c.name && c.name.trim().toLowerCase() === customer.name.trim().toLowerCase()))
    
    let updated
    if (existingIndex >= 0) {
      updated = [...current]
      updated[existingIndex] = { ...updated[existingIndex], ...customer }
    } else {
      const newCust = { ...customer, id: customer.id || 'cust_' + Date.now() }
      updated = [newCust, ...current]
    }
    localStorage.setItem(SAVED_CUSTOMERS_KEY, JSON.stringify(updated))
    return updated
  } catch (err) {
    console.error('Error saving customer', err)
    return []
  }
}

/**
 * Saved Invoices Management
 */
export function getSavedInvoices() {
  try {
    const raw = localStorage.getItem(SAVED_INVOICES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (err) {
    console.error('Error reading saved invoices', err)
  }
  return []
}

export function saveInvoiceRecord(invoiceData) {
  try {
    const current = getSavedInvoices()
    const id = invoiceData.id || 'inv_' + Date.now()
    const recordToSave = {
      ...invoiceData,
      id,
      savedAt: new Date().toISOString()
    }
    
    const existingIndex = current.findIndex(inv => inv.id === id)
    let updated
    if (existingIndex >= 0) {
      updated = [...current]
      updated[existingIndex] = recordToSave
    } else {
      updated = [recordToSave, ...current]
    }
    
    localStorage.setItem(SAVED_INVOICES_KEY, JSON.stringify(updated))

    // Asynchronously sync to Supabase in background
    if (isSupabaseConfigured && supabase) {
      syncTimberInvoiceToSupabase(recordToSave).catch(err => {
        console.warn('Background Supabase timber invoice sync notice:', err.message)
      })
    }

    return recordToSave
  } catch (err) {
    console.error('Error saving invoice record', err)
    return invoiceData
  }
}

export function deleteInvoiceRecord(id) {
  try {
    const updated = getSavedInvoices().filter(inv => inv.id !== id)
    localStorage.setItem(SAVED_INVOICES_KEY, JSON.stringify(updated))

    // Asynchronously delete from Supabase if connected
    if (isSupabaseConfigured && supabase) {
      supabase.from('timber_invoices').delete().eq('id', id).then(({ error }) => {
        if (error) console.warn('Supabase timber invoice delete warning:', error.message)
      })
    }

    return updated
  } catch (err) {
    console.error('Error deleting invoice record', err)
    return null
  }
}

/**
 * Sync Mahogany & Manjiyam Timber invoice to Supabase table `timber_invoices`
 */
export async function syncTimberInvoiceToSupabase(record) {
  if (!isSupabaseConfigured || !supabase) return null

  const row = {
    id: record.id,
    invoice_no: record.invoiceNo || 'Draft',
    invoice_date: record.invoiceDate || new Date().toISOString().split('T')[0],
    vehicle_no: record.vehicleNo || null,
    date_of_supply: record.dateOfSupply || null,
    place_of_supply: record.placeOfSupply || null,
    state: record.state || 'Kerala',
    state_code: record.stateCode || '32',
    eway_bill_no: record.ewayBillNo || null,
    reverse_charge: record.reverseCharge || '',

    receiver_name: record.receiverName || 'Timber Customer',
    receiver_address: record.receiverAddress || null,
    receiver_gstin: record.receiverGstin || null,
    receiver_state: record.receiverState || null,

    mahogany_enabled: Boolean(record.mahoganyEnabled),
    mahogany_cft: Number(record.mahoganyCft) || 0,
    mahogany_rate: Number(record.mahoganyRate) || 0,
    mahogany_taxable: Number(record.mahoganyTaxableValue) || 0,

    manjiyam_enabled: Boolean(record.manjiyamEnabled),
    manjiyam_cft: Number(record.manjiyamCft) || 0,
    manjiyam_rate: Number(record.manjiyamRate) || 0,
    manjiyam_taxable: Number(record.manjiyamTaxableValue) || 0,

    total_cft: Number(record.totalCft) || 0,
    grand_total: Number(record.grandTotal) || 0,

    full_payload: record,
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('timber_invoices')
    .upsert(row, { onConflict: 'id' })
    .select()

  if (error) {
    console.warn('Supabase upsert timber_invoice warning:', error.message)
    throw error
  }
  return data
}
