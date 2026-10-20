/**
 * Centralized Settings and Default Configuration for G.K. Saw Mill Invoice Generator
 */

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
    return recordToSave
  } catch (err) {
    console.error('Error saving invoice record', err)
    return invoiceData
  }
}
