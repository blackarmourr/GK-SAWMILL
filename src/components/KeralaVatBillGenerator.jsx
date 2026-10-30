import React, { useState, useEffect, useMemo } from 'react'
import {
  ArrowLeft,
  FileDown,
  Printer,
  RotateCcw,
  Sparkles,
  Save,
  FolderOpen,
  Trash2,
  Edit2,
  Plus,
  AlertCircle,
  CheckCircle2,
  Info,
  Calendar,
  Truck,
  FileText,
  MapPin,
  Layers,
  Hash,
  User,
  Users,
  Building2,
  X,
  CreditCard,
  ShieldCheck,
  Check,
  Receipt
} from 'lucide-react'
import { getSavedVattaInvoices } from '../data/vattaInvoiceSettings.js'
import {
  DEFAULT_VAT_CONSIGNER,
  DEFAULT_VAT_CONSIGNEES,
  DEFAULT_VAT_PRINCIPAL_AGENTS,
  DEFAULT_VAT_TRANSPORTERS,
  DEFAULT_VAT_CARRIERS,
  DEFAULT_VAT_DRIVERS,
  DEFAULT_VAT_SETTINGS,
  SAMPLE_VAT_BILL,
  formatIndianCurrency,
  formatDate,
  getVatConsignerProfile,
  saveVatConsignerProfile,
  getSavedVatConsignees,
  saveVatConsignee,
  deleteVatConsignee,
  getSavedVatPrincipalAgents,
  saveVatPrincipalAgent,
  deleteVatPrincipalAgent,
  getSavedVatTransporters,
  saveVatTransporter,
  deleteVatTransporter,
  getSavedVatCarriers,
  saveVatCarrier,
  deleteVatCarrier,
  getSavedVatDrivers,
  saveVatDriver,
  deleteVatDriver,
  getVatSettings,
  saveVatSettings,
  getSavedVatBills,
  saveVatBillRecord,
  deleteVatBillRecord
} from '../data/vatSettings.js'
import { downloadVatPdf } from '../utils/vatPdfGenerator.js'

export default function KeralaVatBillGenerator({
  onBack,
  initialRecord
}) {
  // Stored Profiles & Defaults
  const [consignerProfile, setConsignerProfile] = useState(() => getVatConsignerProfile())
  const [savedConsignees, setSavedConsignees] = useState(() => getSavedVatConsignees())
  const [savedPrincipalAgents, setSavedPrincipalAgents] = useState(() => getSavedVatPrincipalAgents())
  const [savedTransporters, setSavedTransporters] = useState(() => getSavedVatTransporters())
  const [savedCarriers, setSavedCarriers] = useState(() => getSavedVatCarriers())
  const [savedDrivers, setSavedDrivers] = useState(() => getSavedVatDrivers())
  const [vatSettings, setVatSettings] = useState(() => getVatSettings())
  const [savedBills, setSavedBills] = useState(() => getSavedVatBills())

  // Preload initial record if opened from GST Monthly Register
  useEffect(() => {
    if (initialRecord) {
      if (initialRecord.billData) {
        setBillData({ ...initialRecord.billData })
      } else {
        setBillData(prev => ({ ...prev, ...initialRecord }))
      }
    }
  }, [initialRecord])

  // Linked Vatta GST Invoice state
  const [selectedVattaInvoiceId, setSelectedVattaInvoiceId] = useState('')
  const [savedVattaInvoicesList, setSavedVattaInvoicesList] = useState(() => {
    try {
      const list = getSavedVattaInvoices()
      if (Array.isArray(list) && list.length > 0) return list
      return [{
        id: 'sample-a20',
        title: 'Invoice A-20 - M/S. HINDUSTAN PENCILS PVT. LTD',
        invoiceData: {
          invoiceNo: 'A-20',
          invoiceDate: '2026-10-10',
          receiverName: 'M/S. HINDUSTAN PENCILS PVT. LTD',
          receiverAddress: 'Plot No:-1 TO 15, ACHHAD INDUSTRIAL ESTATE, ACHHAD, TALUKA, TALASARI, PALGHAR, MAHARASHTRA-401606',
          receiverGstin: '27AAACH0401R1ZQ',
          receiverState: 'MAHARASHTRA',
          ewayBillNo: '5420 8705 0063',
          vehicleNo: 'KL-58-D-1555'
        },
        totals: { totalBags: 285, grandTotal: 781292.93 }
      }]
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      const list = getSavedVattaInvoices()
      if (Array.isArray(list) && list.length > 0) {
        setSavedVattaInvoicesList(list)
      }
    } catch {}
  }, [])

  const handleLoadFromVattaInvoice = (invId) => {
    setSelectedVattaInvoiceId(invId)
    if (!invId) return
    const found = savedVattaInvoicesList.find(i => i.id === invId)
    if (found && found.invoiceData) {
      const data = found.invoiceData
      const totalAmount = found.grandTotal || found.totals?.grandTotal || found.totals?.totalTaxable || ''
      const totalBags = found.totals?.totalBags || 0
      setBillData(prev => ({
        ...prev,
        // Field 8: Bill No, Date, Value
        billNo: data.invoiceNo || prev.billNo,
        billDate: data.invoiceDate || prev.billDate,
        billValue: totalAmount ? String(totalAmount) : prev.billValue,
        // Field 2: E-Way Bill No
        ewayBillNo: data.ewayBillNo || prev.ewayBillNo,
        // Field 4: Consignee Details
        consigneeName: data.receiverName || prev.consigneeName,
        consigneeAddress: data.receiverAddress || prev.consigneeAddress,
        consigneeGstin: data.receiverGstin || prev.consigneeGstin,
        consigneeState: data.receiverState || prev.consigneeState,
        // Field 7: Goods Description & Bag Quantity
        goodsDescription: 'Vatta wood & Pencil Slats',
        bagQuantity: totalBags > 0 ? totalBags : prev.bagQuantity,
        // Field 9: Vehicle No
        vehicleNo: data.vehicleNo || prev.vehicleNo
      }))
      notify(`Loaded Invoice ${data.invoiceNo} into Kerala VAT Form 8F! (${data.receiverName || 'Consignee'})`)
    }
  }

  // Active Bill Form State
  const [billData, setBillData] = useState(() => {
    const today = new Date().toISOString().split('T')[0]
    return {
      // Field 1
      consignerName: consignerProfile.name || 'Anil Kumar G',
      consignerBusinessName: consignerProfile.businessName || 'G.K. Saw Mill',
      consignerAddress: consignerProfile.address || 'Kattur, Nedumpana, Kollam',
      consignerPin: consignerProfile.pinCode || '691576',
      consignerRegistration: consignerProfile.registration || '32AHOPG1823G1ZP',
      consignerPan: consignerProfile.pan || '',
      consignerPhone: consignerProfile.phone || '',

      // Field 2
      ewayBillNo: '5420 8705 0063',

      // Field 3
      transactionType: vatSettings.transactionType || 'Regular',

      // Field 4
      consigneeName: 'M/S. HINDUSTAN PENCILS PVT. LTD',
      consigneeAddress: '217/1 GIDC Estate',
      consigneeCity: '',
      consigneeState: '',
      consigneeGstin: '24AAACH0401R1ZT',
      consigneeTinCst: '',

      // Field 5
      consignerSeller: 'G.K. SAW MILL',

      // Field 6
      principalAgentName: 'UMESH PENCILS PROCESSORS (P) LTD',
      principalAgentGstin: '33AAACU0701F1Z3',

      // Field 7
      goodsDescription: 'Vatta wood & Pencil Slats',
      bagQuantity: 285,

      // Field 8
      billNo: 'A-22',
      billDate: today,
      billValue: '781292.93',

      // Field 9
      transportMode: vatSettings.transportMode || 'By Road',
      vehicleNo: '',

      // Field 10
      transporterName: 'TOTAL LOGISTICS (INDIA) PVT. LTD.',
      transporterGstin: '',
      transportDocNo: '',
      transportDocDate: '',

      // Field 11
      carrierName: 'JEILANI P',
      carrierGstin: '',
      carrierAddress: '',

      // Field 12
      driverName: 'JEILANI P',
      driverLicenceNo: 'TN 41 19970001161',
      driverState: 'TAMILNADU',
      driverAddress: '',

      // Declaration & Bottom
      declarationDate: today,
      declarationPlace: vatSettings.place || 'Nedumpana',
      signatoryName: consignerProfile.name && !consignerProfile.name.includes('G. Anil') ? consignerProfile.name : 'Anil Kumar G'
    }
  })

  // Selected Profile IDs for quick dropdowns
  const [selectedConsigneeId, setSelectedConsigneeId] = useState('consignee-hindustan')
  const [selectedAgentId, setSelectedAgentId] = useState('agent-umesh')
  const [selectedTransporterId, setSelectedTransporterId] = useState('transporter-total')
  const [selectedCarrierId, setSelectedCarrierId] = useState('carrier-jeilani')
  const [selectedDriverId, setSelectedDriverId] = useState('driver-jeilani')

  // Modals & UI States
  const [showSavedBillsModal, setShowSavedBillsModal] = useState(false)
  const [showProfilesModal, setShowProfilesModal] = useState(false)
  const [activeProfilesTab, setActiveProfilesTab] = useState('consignees') // consignees | agents | transporters | carriers | drivers | consigner
  const [editingProfile, setEditingProfile] = useState(null) // null or { type, id, data: { name, gstin, address, phone, licenceNo, state, city, tinCst } }
  const [feedbackMsg, setFeedbackMsg] = useState(null)
  const [validationError, setValidationError] = useState('')

  // Show auto-dismiss feedback toast
  const showNotification = (text, type = 'success') => {
    setFeedbackMsg({ text, type })
    setTimeout(() => {
      setFeedbackMsg(null)
    }, 3500)
  }

  // Update a field in billData
  const handleFieldChange = (field, value) => {
    setBillData(prev => {
      const next = { ...prev, [field]: value }
      // Auto-sync signatory if consigner name changes
      if (field === 'consignerName' && !prev.signatoryName) {
        next.signatoryName = value
      }
      return next
    })
  }

  // Selection handlers
  const handleSelectConsignee = (id) => {
    setSelectedConsigneeId(id)
    const found = savedConsignees.find(c => c.id === id)
    if (found) {
      setBillData(prev => ({
        ...prev,
        consigneeName: found.companyName || '',
        consigneeAddress: found.address || '',
        consigneeCity: found.city || '',
        consigneeState: found.state || '',
        consigneeGstin: found.gstin || '',
        consigneeTinCst: found.tinCst || ''
      }))
      showNotification(`Loaded Consignee: ${found.companyName}`)
    }
  }

  const handleSelectAgent = (id) => {
    setSelectedAgentId(id)
    const found = savedPrincipalAgents.find(a => a.id === id)
    if (found) {
      setBillData(prev => ({
        ...prev,
        principalAgentName: found.name || '',
        principalAgentGstin: found.gstin || ''
      }))
      showNotification(`Loaded Field 6: ${found.name}`)
    }
  }

  const handleSelectTransporter = (id) => {
    setSelectedTransporterId(id)
    const found = savedTransporters.find(t => t.id === id)
    if (found) {
      setBillData(prev => ({
        ...prev,
        transporterName: found.name || '',
        transporterGstin: found.gstin || ''
      }))
      showNotification(`Loaded Transporter: ${found.name}`)
    }
  }

  const handleSelectCarrier = (id) => {
    setSelectedCarrierId(id)
    const found = savedCarriers.find(c => c.id === id)
    if (found) {
      setBillData(prev => ({
        ...prev,
        carrierName: found.name || '',
        carrierGstin: found.gstin || '',
        carrierAddress: found.address || ''
      }))
      showNotification(`Loaded Carrier: ${found.name}`)
    }
  }

  const handleSelectDriver = (id) => {
    setSelectedDriverId(id)
    const found = savedDrivers.find(d => d.id === id)
    if (found) {
      setBillData(prev => ({
        ...prev,
        driverName: found.name || '',
        driverLicenceNo: found.licenceNo || '',
        driverState: found.state || '',
        driverAddress: found.address || ''
      }))
      showNotification(`Loaded Driver: ${found.name}`)
    }
  }

  // Save current consigner profile as default
  const handleSaveConsignerAsDefault = () => {
    const updated = {
      ...consignerProfile,
      name: billData.consignerName,
      businessName: billData.consignerBusinessName,
      address: billData.consignerAddress,
      pinCode: billData.consignerPin,
      registration: billData.consignerRegistration,
      pan: billData.consignerPan,
      phone: billData.consignerPhone
    }
    setConsignerProfile(updated)
    saveVatConsignerProfile(updated)
    showNotification('Consigner profile saved as default!')
  }

  // Quick save current consignee to directory
  const handleQuickSaveConsignee = () => {
    if (!billData.consigneeName.trim()) {
      alert('Please enter a consignee company name.')
      return
    }
    const newConsignee = {
      id: selectedConsigneeId && selectedConsigneeId !== 'custom' ? selectedConsigneeId : `consignee-${Date.now()}`,
      companyName: billData.consigneeName,
      address: billData.consigneeAddress,
      city: billData.consigneeCity,
      state: billData.consigneeState,
      gstin: billData.consigneeGstin,
      tinCst: billData.consigneeTinCst
    }
    const list = saveVatConsignee(newConsignee)
    if (list) {
      setSavedConsignees(list)
      setSelectedConsigneeId(newConsignee.id)
      showNotification(`Saved "${newConsignee.companyName}" to consignee directory!`)
    }
  }

  // Quick save current transporter
  const handleQuickSaveTransporter = () => {
    if (!billData.transporterName.trim()) {
      alert('Please enter a transporter name.')
      return
    }
    const newTransporter = {
      id: selectedTransporterId && selectedTransporterId !== 'custom' ? selectedTransporterId : `transporter-${Date.now()}`,
      name: billData.transporterName,
      gstin: billData.transporterGstin || '',
      phone: '',
      address: ''
    }
    const list = saveVatTransporter(newTransporter)
    if (list) {
      setSavedTransporters(list)
      setSelectedTransporterId(newTransporter.id)
      showNotification(`Saved transporter "${newTransporter.name}"!`)
    }
  }

  // Quick save current carrier
  const handleQuickSaveCarrier = () => {
    if (!billData.carrierName.trim()) {
      alert('Please enter a carrier name.')
      return
    }
    const newCarrier = {
      id: selectedCarrierId && selectedCarrierId !== 'custom' ? selectedCarrierId : `carrier-${Date.now()}`,
      name: billData.carrierName,
      gstin: billData.carrierGstin || '',
      address: billData.carrierAddress
    }
    const list = saveVatCarrier(newCarrier)
    if (list) {
      setSavedCarriers(list)
      setSelectedCarrierId(newCarrier.id)
      showNotification(`Saved carrier "${newCarrier.name}"!`)
    }
  }

  // Quick save current driver
  const handleQuickSaveDriver = () => {
    if (!billData.driverName.trim()) {
      alert('Please enter a driver name.')
      return
    }
    const newDriver = {
      id: selectedDriverId && selectedDriverId !== 'custom' ? selectedDriverId : `driver-${Date.now()}`,
      name: billData.driverName,
      licenceNo: billData.driverLicenceNo,
      state: billData.driverState,
      address: billData.driverAddress
    }
    const list = saveVatDriver(newDriver)
    if (list) {
      setSavedDrivers(list)
      setSelectedDriverId(newDriver.id)
      showNotification(`Saved driver "${newDriver.name}"!`)
    }
  }

  // Handle adding new profile in Profiles modal
  const handleAddNewProfile = (type) => {
    setEditingProfile({
      type,
      isNew: true,
      id: `${type.slice(0, -1)}-${Date.now()}`,
      name: '',
      companyName: '',
      gstin: '',
      tinCst: '',
      address: '',
      city: '',
      state: '',
      phone: '',
      licenceNo: ''
    })
  }

  // Handle editing profile in Profiles modal
  const handleEditProfile = (type, item) => {
    setEditingProfile({
      type,
      isNew: false,
      ...item,
      name: item.companyName || item.name || '',
      companyName: item.companyName || item.name || ''
    })
  }

  // Handle saving profile from the Profiles modal
  const handleSaveProfileItem = (profileToSave) => {
    const { type, isNew, ...itemData } = profileToSave
    const displayName = (itemData.companyName || itemData.name || '').trim()
    if (!displayName) {
      alert('Name / Company Name is required.')
      return
    }

    if (type === 'consignees') {
      const payload = {
        id: itemData.id || `consignee-${Date.now()}`,
        companyName: displayName,
        address: itemData.address || '',
        city: itemData.city || '',
        state: itemData.state || '',
        gstin: (itemData.gstin || '').trim(),
        tinCst: itemData.tinCst || ''
      }
      const list = saveVatConsignee(payload)
      if (list) {
        setSavedConsignees(list)
        if (selectedConsigneeId === payload.id) {
          setBillData(prev => ({
            ...prev,
            consigneeName: payload.companyName,
            consigneeAddress: payload.address,
            consigneeCity: payload.city,
            consigneeState: payload.state,
            consigneeGstin: payload.gstin,
            consigneeTinCst: payload.tinCst
          }))
        }
        showNotification(`Saved consignee: ${payload.companyName}`)
      }
    } else if (type === 'agents') {
      const payload = {
        id: itemData.id || `agent-${Date.now()}`,
        name: displayName,
        gstin: (itemData.gstin || '').trim()
      }
      const list = saveVatPrincipalAgent(payload)
      if (list) {
        setSavedPrincipalAgents(list)
        if (selectedAgentId === payload.id) {
          setBillData(prev => ({
            ...prev,
            principalAgentName: payload.name,
            principalAgentGstin: payload.gstin
          }))
        }
        showNotification(`Saved Field 6 Agent: ${payload.name}`)
      }
    } else if (type === 'transporters') {
      const payload = {
        id: itemData.id || `transporter-${Date.now()}`,
        name: displayName,
        gstin: (itemData.gstin || '').trim(),
        address: itemData.address || '',
        phone: itemData.phone || ''
      }
      const list = saveVatTransporter(payload)
      if (list) {
        setSavedTransporters(list)
        if (selectedTransporterId === payload.id) {
          setBillData(prev => ({
            ...prev,
            transporterName: payload.name,
            transporterGstin: payload.gstin
          }))
        }
        showNotification(`Saved Transporter: ${payload.name}`)
      }
    } else if (type === 'carriers') {
      const payload = {
        id: itemData.id || `carrier-${Date.now()}`,
        name: displayName,
        gstin: (itemData.gstin || '').trim(),
        address: itemData.address || '',
        phone: itemData.phone || ''
      }
      const list = saveVatCarrier(payload)
      if (list) {
        setSavedCarriers(list)
        if (selectedCarrierId === payload.id) {
          setBillData(prev => ({
            ...prev,
            carrierName: payload.name,
            carrierGstin: payload.gstin,
            carrierAddress: payload.address
          }))
        }
        showNotification(`Saved Carrier: ${payload.name}`)
      }
    } else if (type === 'drivers') {
      const payload = {
        id: itemData.id || `driver-${Date.now()}`,
        name: displayName,
        licenceNo: itemData.licenceNo || '',
        state: itemData.state || '',
        address: itemData.address || '',
        phone: itemData.phone || ''
      }
      const list = saveVatDriver(payload)
      if (list) {
        setSavedDrivers(list)
        if (selectedDriverId === payload.id) {
          setBillData(prev => ({
            ...prev,
            driverName: payload.name,
            driverLicenceNo: payload.licenceNo,
            driverState: payload.state,
            driverAddress: payload.address
          }))
        }
        showNotification(`Saved Driver: ${payload.name}`)
      }
    }

    setEditingProfile(null)
  }

  // Load sample test data matching Kerala VAT.pdf
  const handleLoadSample = () => {
    setBillData({
      ...SAMPLE_VAT_BILL,
      transporterGstin: '',
      carrierGstin: ''
    })
    showNotification('Loaded Kerala VAT.pdf benchmark sample data!')
  }

  // Reset form to blank / clean draft
  const handleResetForm = () => {
    if (window.confirm('Reset this form to a blank draft?')) {
      const today = new Date().toISOString().split('T')[0]
      setBillData({
        consignerName: consignerProfile.name || '',
        consignerBusinessName: consignerProfile.businessName || '',
        consignerAddress: consignerProfile.address || '',
        consignerPin: consignerProfile.pinCode || '',
        consignerRegistration: consignerProfile.registration || '',
        consignerPan: consignerProfile.pan || '',
        consignerPhone: consignerProfile.phone || '',

        ewayBillNo: '',
        transactionType: vatSettings.transactionType || 'Regular',

        consigneeName: '',
        consigneeAddress: '',
        consigneeCity: '',
        consigneeState: '',
        consigneeGstin: '',
        consigneeTinCst: '',

        consignerSeller: 'G.K. SAW MILL',

        principalAgentName: '',
        principalAgentGstin: '',

        goodsDescription: 'Vatta wood & Pencil Slats',
        bagQuantity: '',

        billNo: '',
        billDate: today,
        billValue: '',

        transportMode: vatSettings.transportMode || 'By Road',
        vehicleNo: '',

        transporterName: '',
        transporterGstin: '',
        transportDocNo: '',
        transportDocDate: '',

        carrierName: '',
        carrierGstin: '',
        carrierAddress: '',

        driverName: '',
        driverLicenceNo: '',
        driverState: '',
        driverAddress: '',

        declarationDate: today,
        declarationPlace: vatSettings.place || 'Nedumpana',
        signatoryName: consignerProfile.name || ''
      })
      showNotification('Form reset to blank draft.')
    }
  }

  // Save current bill to saved bills
  const handleSaveCurrentBill = () => {
    const title = prompt('Enter a label or title for this saved bill:', `Bill ${billData.billNo || 'Draft'} - ${billData.consigneeName || 'Consignee'}`)
    if (title === null) return
    const res = saveVatBillRecord(billData, title)
    if (res) {
      setSavedBills(res.list)
      showNotification('Bill saved successfully in browser storage!')
    }
  }

  // Generate and download A4 PDF
  const handleGeneratePdf = () => {
    setValidationError('')

    // Basic friendly validation
    if (!billData.consignerBusinessName.trim()) {
      setValidationError('Field 1: Consigner business name is required.')
      return
    }
    if (!billData.billNo.trim()) {
      setValidationError('Field 8: Bill/Invoice Number is required.')
      return
    }

    try {
      // Remember last used settings
      saveVatSettings({
        transactionType: billData.transactionType,
        transportMode: billData.transportMode,
        place: billData.declarationPlace
      })

      const filename = downloadVatPdf(billData)
      showNotification(`A4 PDF generated & downloaded: ${filename}`)
    } catch (err) {
      console.error('Error generating VAT PDF:', err)
      setValidationError(`Failed to generate PDF: ${err.message}`)
    }
  }

  // Constructed values for on-screen preview
  const previewData = useMemo(() => {
    // Field 7 text
    const desc = billData.goodsDescription || 'Vatta wood & Pencil Slats'
    const qty = billData.bagQuantity !== undefined && billData.bagQuantity !== '' ? `${billData.bagQuantity} bag` : ''
    const field7 = qty ? `${desc}, ${qty}` : desc

    // Field 8 text
    const bNo = billData.billNo ? billData.billNo : 'A-20'
    const bVal = billData.billValue !== '' && billData.billValue !== undefined ? `Rs:- ${formatIndianCurrency(billData.billValue)}/-` : ''
    const bDate = billData.billDate ? `Dt-${formatDate(billData.billDate, '-')}` : ''
    const field8 = [bNo, bVal, bDate].filter(Boolean).join('/')

    // Field 9 text
    const mode = billData.transportMode || 'By Road'
    const veh = billData.vehicleNo ? billData.vehicleNo.trim() : ''
    const field9 = veh ? `${mode}, ${veh}` : `${mode},,`

    // Field 10 text
    const tName = billData.transporterName || ''
    const docParts = []
    if (billData.transportDocNo) docParts.push(`Doc: ${billData.transportDocNo}`)
    if (billData.transportDocDate) docParts.push(`Dt: ${formatDate(billData.transportDocDate, '-')}`)
    const field10Extra = docParts.length ? ` (${docParts.join(', ')})` : ''
    const field10 = tName ? `${tName}${field10Extra}` : ''

    // Declaration text
    const cName = billData.consignerName || 'Anil Kumar G'
    const bName = billData.consignerBusinessName || 'G.K. Saw Mill'
    const addr = billData.consignerAddress || 'Kattur, Nedumpana, Kollam'
    const pin = billData.consignerPin ? ` - ${billData.consignerPin}` : ' - 691576'
    const declaration = `I, ${cName}, ${bName}, ${addr}${pin} the consigner hereby declare that the information above correct and complete.`

    return {
      field7,
      field8,
      field9,
      field10,
      declaration
    }
  }, [billData])

  return (
    <div className="vat-generator-container" style={{ padding: '1.25rem 1rem 3rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {feedbackMsg && (
        <div
          style={{
            position: 'fixed',
            top: '1.25rem',
            right: '1.25rem',
            zIndex: 9999,
            backgroundColor: feedbackMsg.type === 'error' ? '#ef4444' : '#1e3a2b',
            color: '#ffffff',
            padding: '0.75rem 1.25rem',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          {feedbackMsg.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} color="#4ade80" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Top Header & Navigation Bar */}
      <div className="module-top-header">
        <div className="module-top-left">
          <button
            type="button"
            onClick={onBack}
            className="module-back-btn"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="module-page-title">
            Kerala VAT Bill Generator
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="module-top-actions">
          <button
            type="button"
            onClick={handleLoadSample}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #d4a373',
              background: '#fffbf5',
              color: '#925c38',
              fontWeight: 700,
              fontSize: '0.825rem',
              cursor: 'pointer'
            }}
          >
            <Sparkles size={15} />
            Sample (Kerala VAT.pdf)
          </button>

          <button
            type="button"
            onClick={() => setShowProfilesModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--card-bg, #ffffff)',
              color: '#334155',
              fontWeight: 600,
              fontSize: '0.825rem',
              cursor: 'pointer'
            }}
          >
            <Users size={15} />
            Profiles Directory
          </button>

          <button
            type="button"
            onClick={() => setShowSavedBillsModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--card-bg, #ffffff)',
              color: '#334155',
              fontWeight: 600,
              fontSize: '0.825rem',
              cursor: 'pointer'
            }}
          >
            <FolderOpen size={15} />
            Saved Bills ({savedBills.length})
          </button>

          <button
            type="button"
            onClick={handleSaveCurrentBill}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--card-bg, #ffffff)',
              color: '#1e3a2b',
              fontWeight: 700,
              fontSize: '0.825rem',
              cursor: 'pointer'
            }}
          >
            <Save size={15} />
            Save Draft
          </button>

          <button
            type="button"
            onClick={handleGeneratePdf}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              border: 'none',
              background: '#1e3a2b',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(30, 58, 43, 0.25)'
            }}
          >
            <FileDown size={16} />
            Generate A4 PDF
          </button>

          <button
            type="button"
            onClick={handleResetForm}
            title="Reset Form"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #e2e8f0)',
              background: 'var(--card-bg, #ffffff)',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.875rem'
          }}
        >
          <AlertCircle size={18} />
          <span>{validationError}</span>
        </div>
      )}

      {/* Main Two-Column Layout: Left Form & Right Live A4 Preview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(380px, 1.15fr) minmax(360px, 1fr)',
          gap: '1.5rem',
          alignItems: 'start'
        }}
        className="vat-main-grid"
      >
        {/* Left Form: Field Groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Link & Load from Vatta GST Invoice Bar */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(30, 58, 43, 0.06) 0%, rgba(212, 163, 115, 0.12) 100%)',
              border: '1.5px dashed #2d6a4f',
              borderRadius: '12px',
              padding: '0.9rem 1.15rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  background: '#1e3a2b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Receipt size={17} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Link & Load from Vatta GST Invoice
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Auto-fills consignee, Bill No, date, total amount, e-way bill, vehicle & bag quantity
                </div>
              </div>
            </div>

            <select
              value={selectedVattaInvoiceId}
              onChange={(e) => handleLoadFromVattaInvoice(e.target.value)}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                border: '1.5px solid #2d6a4f',
                background: 'var(--card-bg)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                minWidth: '230px'
              }}
            >
              <option value="">-- Select Vatta Invoice to Load --</option>
              {savedVattaInvoicesList.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  Invoice {inv.invoiceData?.invoiceNo || 'Draft'} • {inv.invoiceData?.receiverName || 'Vatta'} • ₹{Number(inv.grandTotal || inv.totals?.grandTotal || 0).toLocaleString('en-IN')}
                </option>
              ))}
            </select>
          </div>

          {/* Card 1: Field 1 - Consigner Profile & Field 5 */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ background: '#eaf3ed', color: '#1e3a2b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                  Field 1 & 5
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                  Consigner Details (Seller / Principal Agent)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleSaveConsignerAsDefault}
                style={{
                  border: 'none',
                  background: 'none',
                  color: '#2d6a4f',
                  fontSize: '0.775rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}
              >
                <Save size={13} />
                Save as Default
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Name of Consigner
                </label>
                <input
                  type="text"
                  value={billData.consignerName}
                  onChange={(e) => handleFieldChange('consignerName', e.target.value)}
                  placeholder="e.g. Anil Kumar G"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Business Name
                </label>
                <input
                  type="text"
                  value={billData.consignerBusinessName}
                  onChange={(e) => handleFieldChange('consignerBusinessName', e.target.value)}
                  placeholder="e.g. G.K. Saw Mill"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Address
                </label>
                <input
                  type="text"
                  value={billData.consignerAddress}
                  onChange={(e) => handleFieldChange('consignerAddress', e.target.value)}
                  placeholder="e.g. Kattur, Nedumpana, Kollam"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  TIN / CST RC / GSTIN
                </label>
                <input
                  type="text"
                  value={billData.consignerRegistration}
                  onChange={(e) => handleFieldChange('consignerRegistration', e.target.value)}
                  placeholder="e.g. 32AHOPG1823G1ZP"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  PIN Code
                </label>
                <input
                  type="text"
                  value={billData.consignerPin}
                  onChange={(e) => handleFieldChange('consignerPin', e.target.value)}
                  placeholder="e.g. 691576"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Field 5: Seller / Principal Agent
                </label>
                <input
                  type="text"
                  value={billData.consignerSeller}
                  onChange={(e) => handleFieldChange('consignerSeller', e.target.value)}
                  placeholder="e.g. G.K. SAW MILL"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  PAN / Phone (Optional)
                </label>
                <input
                  type="text"
                  value={billData.consignerPan}
                  onChange={(e) => handleFieldChange('consignerPan', e.target.value)}
                  placeholder="e.g. AHOPG1823G"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Field 4 - Consignee Directory */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ background: '#eaf3ed', color: '#1e3a2b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                  Field 4
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                  Consignee Details (Purchaser)
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <select
                  value={selectedConsigneeId}
                  onChange={(e) => handleSelectConsignee(e.target.value)}
                  style={{
                    padding: '0.35rem 0.6rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    fontSize: '0.775rem',
                    fontWeight: 600,
                    color: '#334155',
                    maxWidth: '180px'
                  }}
                >
                  <option value="custom">-- Select Saved Consignee --</option>
                  {savedConsignees.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleQuickSaveConsignee}
                  title="Save this consignee to directory"
                  style={{
                    border: '1px solid var(--border-color, #cbd5e1)',
                    background: 'var(--tag-bg, #f8fafc)',
                    color: '#334155',
                    padding: '0.35rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <Save size={13} />
                  Save
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Company Name
                </label>
                <input
                  type="text"
                  value={billData.consigneeName}
                  onChange={(e) => handleFieldChange('consigneeName', e.target.value)}
                  placeholder="e.g. M/S. HINDUSTAN PENCILS PVT. LTD"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Address
                </label>
                <input
                  type="text"
                  value={billData.consigneeAddress}
                  onChange={(e) => handleFieldChange('consigneeAddress', e.target.value)}
                  placeholder="e.g. 217/1 GIDC Estate"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  GSTIN
                </label>
                <input
                  type="text"
                  value={billData.consigneeGstin}
                  onChange={(e) => handleFieldChange('consigneeGstin', e.target.value)}
                  placeholder="e.g. 24AAACH0401R1ZT"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  City / State / TIN (Optional)
                </label>
                <input
                  type="text"
                  value={billData.consigneeCity}
                  onChange={(e) => handleFieldChange('consigneeCity', e.target.value)}
                  placeholder="e.g. Valsad, Gujarat"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Field 6 - Consigner / Principal Agent Details */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ background: '#eaf3ed', color: '#1e3a2b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                  Field 6
                </span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                  Principal Agent / Consigner Details
                </h3>
              </div>

              <select
                value={selectedAgentId}
                onChange={(e) => handleSelectAgent(e.target.value)}
                style={{
                  padding: '0.35rem 0.6rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '0.775rem',
                  fontWeight: 600,
                  color: '#334155',
                  maxWidth: '180px'
                }}
              >
                <option value="custom">-- Saved Agents --</option>
                {savedPrincipalAgents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Company Name
                </label>
                <input
                  type="text"
                  value={billData.principalAgentName}
                  onChange={(e) => handleFieldChange('principalAgentName', e.target.value)}
                  placeholder="e.g. UMESH PENCILS PROCESSORS (P) LTD"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  GSTIN
                </label>
                <input
                  type="text"
                  value={billData.principalAgentGstin}
                  onChange={(e) => handleFieldChange('principalAgentGstin', e.target.value)}
                  placeholder="e.g. 33AAACU0701F1Z3"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                />
              </div>
            </div>
          </div>

          {/* Card 4: Fields 2, 3, 7, 8 - Transaction, Goods & Bill Value */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.9rem' }}>
              <span style={{ background: '#eaf3ed', color: '#1e3a2b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                Fields 2, 3, 7, 8
              </span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                Bill Number, Value, E-Way Bill & Goods
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Field 8: Bill / Invoice No.
                </label>
                <input
                  type="text"
                  value={billData.billNo}
                  onChange={(e) => handleFieldChange('billNo', e.target.value)}
                  placeholder="e.g. A-22"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Field 8: Bill Date
                </label>
                <input
                  type="date"
                  value={billData.billDate}
                  onChange={(e) => handleFieldChange('billDate', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Field 8: Bill Value (Rs.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={billData.billValue}
                  onChange={(e) => handleFieldChange('billValue', e.target.value)}
                  placeholder="e.g. 781292.93"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Field 2: E-Way Bill Number
                </label>
                <input
                  type="text"
                  value={billData.ewayBillNo}
                  onChange={(e) => handleFieldChange('ewayBillNo', e.target.value)}
                  placeholder="e.g. 5420 8705 0063"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Field 3: Transaction Type
                </label>
                <select
                  value={billData.transactionType}
                  onChange={(e) => handleFieldChange('transactionType', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                >
                  <option value="Regular">Regular</option>
                  <option value="Interstate Purchase">Interstate Purchase</option>
                  <option value="Interstate Stock Transfer">Interstate Stock Transfer</option>
                  <option value="Stock Transfer">Stock Transfer</option>
                  <option value="Job Work">Job Work</option>
                  <option value="Branch Transfer">Branch Transfer</option>
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Field 7: Goods Description
                </label>
                <input
                  type="text"
                  value={billData.goodsDescription}
                  onChange={(e) => handleFieldChange('goodsDescription', e.target.value)}
                  placeholder="e.g. Vatta wood & Pencil Slats"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Field 7: Quantity (Bags)
                </label>
                <input
                  type="number"
                  min="0"
                  value={billData.bagQuantity}
                  onChange={(e) => handleFieldChange('bagQuantity', e.target.value)}
                  placeholder="e.g. 285"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontWeight: 700 }}
                />
              </div>
            </div>
          </div>

          {/* Card 5: Fields 9, 10, 11, 12 - Transport, Logistics, Carrier & Driver */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.9rem' }}>
              <span style={{ background: '#eaf3ed', color: '#1e3a2b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                Fields 9, 10, 11, 12
              </span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                Transport, Carrier & Driver Information
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Field 9: Mode of Transport
                </label>
                <select
                  value={billData.transportMode}
                  onChange={(e) => handleFieldChange('transportMode', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                >
                  <option value="By Road">By Road</option>
                  <option value="By Rail">By Rail</option>
                  <option value="By Air">By Air</option>
                  <option value="By Sea">By Sea</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Field 9: Vehicle Number
                </label>
                <input
                  type="text"
                  value={billData.vehicleNo}
                  onChange={(e) => handleFieldChange('vehicleNo', e.target.value)}
                  placeholder="e.g. KL-58-D-1555 (or leave blank)"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                />
              </div>

              {/* Field 10: Transporter */}
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>
                    Field 10: Transporter / Logistics Company
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <select
                      value={selectedTransporterId}
                      onChange={(e) => handleSelectTransporter(e.target.value)}
                      style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.725rem' }}
                    >
                      <option value="custom">-- Saved Transporters --</option>
                      {savedTransporters.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleQuickSaveTransporter}
                      title="Save this transporter to directory"
                      style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', background: 'var(--tag-bg, #f8fafc)', fontSize: '0.725rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    >
                      <Save size={12} /> Save
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={billData.transporterName}
                    onChange={(e) => handleFieldChange('transporterName', e.target.value)}
                    placeholder="e.g. TOTAL LOGISTICS (INDIA) PVT. LTD."
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                  />
                  <input
                    type="text"
                    value={billData.transporterGstin || ''}
                    onChange={(e) => handleFieldChange('transporterGstin', e.target.value)}
                    placeholder="Transporter GSTIN (Optional)"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              {/* Field 11: Carrier */}
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>
                    Field 11: Carrier (Transporter Co. or Vehicle Owner)
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <select
                      value={selectedCarrierId}
                      onChange={(e) => handleSelectCarrier(e.target.value)}
                      style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.725rem' }}
                    >
                      <option value="custom">-- Saved Carriers --</option>
                      {savedCarriers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleQuickSaveCarrier}
                      title="Save this carrier to directory"
                      style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', background: 'var(--tag-bg, #f8fafc)', fontSize: '0.725rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    >
                      <Save size={12} /> Save
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={billData.carrierName}
                    onChange={(e) => handleFieldChange('carrierName', e.target.value)}
                    placeholder="Carrier Name (e.g. JEILANI P)"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                  />
                  <input
                    type="text"
                    value={billData.carrierGstin || ''}
                    onChange={(e) => handleFieldChange('carrierGstin', e.target.value)}
                    placeholder="Carrier GSTIN (Optional)"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                  />
                  <input
                    type="text"
                    value={billData.carrierAddress}
                    onChange={(e) => handleFieldChange('carrierAddress', e.target.value)}
                    placeholder="Address (Optional)"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              {/* Field 12: Driver */}
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>
                    Field 12: Driver Details & Driving Licence
                  </label>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <select
                      value={selectedDriverId}
                      onChange={(e) => handleSelectDriver(e.target.value)}
                      style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.725rem' }}
                    >
                      <option value="custom">-- Saved Drivers --</option>
                      {savedDrivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.licenceNo || 'No DL'})</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleQuickSaveDriver}
                      style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color, #cbd5e1)', background: 'var(--tag-bg, #f8fafc)', fontSize: '0.725rem', cursor: 'pointer' }}
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={billData.driverName}
                    onChange={(e) => handleFieldChange('driverName', e.target.value)}
                    placeholder="Driver Name (e.g. JEILANI P)"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                  />
                  <input
                    type="text"
                    value={billData.driverLicenceNo}
                    onChange={(e) => handleFieldChange('driverLicenceNo', e.target.value)}
                    placeholder="DL No: TN 41 19970001161"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                  />
                  <input
                    type="text"
                    value={billData.driverState}
                    onChange={(e) => handleFieldChange('driverState', e.target.value)}
                    placeholder="State (e.g. TAMILNADU)"
                    style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card 6: Declaration & Sign-off Details */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '12px',
              padding: '1.25rem',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.9rem' }}>
              <span style={{ background: '#eaf3ed', color: '#1e3a2b', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 800 }}>
                Declaration
              </span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary, #0f172a)' }}>
                Declaration, Place, Date & Signatory
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Declaration Date
                </label>
                <input
                  type="date"
                  value={billData.declarationDate}
                  onChange={(e) => handleFieldChange('declarationDate', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Declaration Place
                </label>
                <input
                  type="text"
                  value={billData.declarationPlace}
                  onChange={(e) => handleFieldChange('declarationPlace', e.target.value)}
                  placeholder="e.g. Nedumpana"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                  Signatory Name
                </label>
                <input
                  type="text"
                  value={billData.signatoryName}
                  onChange={(e) => handleFieldChange('signatoryName', e.target.value)}
                  placeholder="e.g. Anil Kumar G"
                  style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontWeight: 700 }}
                />
              </div>
            </div>

            <div style={{ background: 'var(--tag-bg, #f8fafc)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color, #e2e8f0)' }}>
              <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Declaration Statement (Auto-Generated):
              </div>
              <div style={{ fontSize: '0.825rem', color: '#1e293b', fontStyle: 'italic', lineHeight: '1.4' }}>
                "{previewData.declaration}"
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live A4 Document Replica */}
        <div style={{ position: 'sticky', top: '1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={16} color="#1e3a2b" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: 0 }}>
                Live A4 Form 8F Replica
              </h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
              Single Page A4
            </span>
          </div>

          {/* Paper Document Preview Card */}
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              borderRadius: '6px',
              padding: '2.4rem 2rem',
              border: '1px solid #d1d5db',
              fontFamily: 'serif',
              color: '#000000',
              lineHeight: 1.45,
              fontSize: '0.9rem'
            }}
          >
            {/* Document Heading */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                KERALA VALUE ADDED TAX RULES - 2005 FORM No, 8F
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                PARTICULARS TO BE CONTAINED IN
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                INTERSTATE PURCHASE/ STOCK TRANSFER BLLS
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '0.825rem', marginTop: '0.25rem' }}>
                (SEE RULE 66(6))
              </div>
            </div>

            {/* 12 Numbered Fields Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
              {/* Field 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1.1fr 1.2fr', gap: '0.5rem', alignItems: 'start' }}>
                <div style={{ fontWeight: 'normal' }}>1</div>
                <div>
                  Name & Address of the Consigner with<br />
                  TIN/CST RC No. Phone No. E-mail, PAN etc.
                </div>
                <div style={{ textAlign: 'center' }}>
                  {billData.consignerName && <div>{billData.consignerName}</div>}
                  {billData.consignerBusinessName && <div>{billData.consignerBusinessName}</div>}
                  {billData.consignerAddress && <div>{billData.consignerAddress}</div>}
                  {billData.consignerRegistration && <div>{billData.consignerRegistration}</div>}
                  {billData.consignerPan && <div>PAN: {billData.consignerPan}</div>}
                </div>
              </div>

              {/* Field 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1.1fr 1.2fr', gap: '0.5rem', alignItems: 'start' }}>
                <div>2</div>
                <div>E Way Bill No:</div>
                <div style={{ textAlign: 'center', whiteSpace: 'nowrap', fontFamily: 'monospace', fontWeight: 600 }}>
                  {billData.ewayBillNo || '—'}
                </div>
              </div>

              {/* Field 3 */}
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1.1fr 1.2fr', gap: '0.5rem', alignItems: 'start' }}>
                <div>3</div>
                <div>Transaction Type</div>
                <div style={{ textAlign: 'center' }}>
                  {billData.transactionType || 'Regular'}
                </div>
              </div>

              {/* Field 4 */}
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1.1fr 1.2fr', gap: '0.5rem', alignItems: 'start' }}>
                <div>4</div>
                <div>
                  Name &, Address of the Consignee with<br />
                  TIN/CST RC No. Phone No. E-mail, PAN etc.
                </div>
                <div style={{ textAlign: 'center' }}>
                  {billData.consigneeName && <div>{billData.consigneeName}</div>}
                  {billData.consigneeAddress && <div>{billData.consigneeAddress}</div>}
                  {billData.consigneeCity && <div>{billData.consigneeCity}</div>}
                  {billData.consigneeGstin && <div>GSTN:-{billData.consigneeGstin}</div>}
                </div>
              </div>

              {/* Field 5 */}
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1.1fr 1.2fr', gap: '0.5rem', alignItems: 'start' }}>
                <div>5</div>
                <div>Consigner(Whether Seller/Principal Agent)</div>
                <div style={{ textAlign: 'center' }}>
                  {billData.consignerSeller || 'G.K. SAW MILL'}
                </div>
              </div>

              {/* Field 6 */}
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1.1fr 1.2fr', gap: '0.5rem', alignItems: 'start' }}>
                <div>6</div>
                <div>Consigner(Whether Seller/Principal Agent)</div>
                <div style={{ textAlign: 'center' }}>
                  {billData.principalAgentName && <div>{billData.principalAgentName}</div>}
                  {billData.principalAgentGstin && <div>GSTN:-{billData.principalAgentGstin}</div>}
                </div>
              </div>

              {/* Field 7 */}
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1.1fr 1.2fr', gap: '0.5rem', alignItems: 'start' }}>
                <div>7</div>
                <div>Full Description of Goods with Quantity</div>
                <div style={{ textAlign: 'center' }}>
                  {previewData.field7}
                </div>
              </div>

              {/* Field 8 */}
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1.1fr 1.2fr', gap: '0.5rem', alignItems: 'start' }}>
                <div>8</div>
                <div>Bill No./Date and Value</div>
                <div style={{ textAlign: 'center' }}>
                  {previewData.field8}
                </div>
              </div>

              {/* Field 9 */}
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1.1fr 1.2fr', gap: '0.5rem', alignItems: 'start' }}>
                <div>9</div>
                <div>Mode of Trasport / Vehicle No.</div>
                <div style={{ textAlign: 'center' }}>
                  {previewData.field9}
                </div>
              </div>

              {/* Field 10 */}
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1.1fr 1.2fr', gap: '0.5rem', alignItems: 'start' }}>
                <div>10</div>
                <div>Trasport Document No./ Date</div>
                <div style={{ textAlign: 'center' }}>
                  {billData.transporterName && <div>{billData.transporterName}</div>}
                  {billData.transporterGstin && <div>GSTN:-{billData.transporterGstin}</div>}
                  {billData.transportDocNo && <div>Doc No: {billData.transportDocNo}</div>}
                  {billData.transportDocDate && <div>Dt: {formatDate(billData.transportDocDate, '-')}</div>}
                  {!billData.transporterName && !billData.transportDocNo && '—'}
                </div>
              </div>

              {/* Field 11 */}
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1.1fr 1.2fr', gap: '0.5rem', alignItems: 'start' }}>
                <div>11</div>
                <div>
                  Name & Full Address of the Carrier<br />
                  (Trasporter Co. or Owner of the Vehicle)
                </div>
                <div style={{ textAlign: 'center' }}>
                  {billData.carrierName && <div>{billData.carrierName}</div>}
                  {billData.carrierGstin && <div>GSTN:-{billData.carrierGstin}</div>}
                  {billData.carrierAddress && <div>{billData.carrierAddress}</div>}
                  {!billData.carrierName && !billData.carrierAddress && '—'}
                </div>
              </div>

              {/* Field 12 */}
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1.1fr 1.2fr', gap: '0.5rem', alignItems: 'start' }}>
                <div>12</div>
                <div>
                  Name &, Full Address of the Driver of the<br />
                  Vehicle with Driving Licence No.
                </div>
                <div style={{ textAlign: 'center' }}>
                  {billData.driverName && <div>{billData.driverName}</div>}
                  {billData.driverLicenceNo && <div>DL NO; {billData.driverLicenceNo}</div>}
                  {billData.driverState && <div>{billData.driverState}</div>}
                </div>
              </div>
            </div>

            {/* Declaration */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.925rem', marginBottom: '0.5rem' }}>
                DECLARATION
              </div>
              <div style={{ textAlign: 'left', fontSize: '0.85rem', lineHeight: '1.5' }}>
                {previewData.declaration}
              </div>
            </div>

            {/* Bottom: Date/Place & Signature */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '2.25rem' }}>
              <div style={{ fontSize: '0.875rem' }}>
                <div>{formatDate(billData.declarationDate, '/')}</div>
                <div style={{ marginTop: '0.25rem' }}>{billData.declarationPlace}</div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
                <div>Signature & Name</div>
                <div style={{ marginTop: '1.8rem', fontWeight: 'bold' }}>
                  {billData.signatoryName || billData.consignerName || 'Anil Kumar G'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODAL 1: SAVED BILLS
          ========================================================================= */}
      {showSavedBillsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}
          onClick={() => setShowSavedBillsModal(false)}
        >
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              borderRadius: '12px',
              maxWidth: '600px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FolderOpen size={20} color="#1e3a2b" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Saved VAT Bills</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSavedBillsModal(false)}
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.825rem', color: '#64748b', marginBottom: '1rem' }}>
              Restore previously saved bills into the editor. Data is stored locally in this browser.
            </p>

            {savedBills.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--tag-bg, #f8fafc)', borderRadius: '8px', color: '#94a3b8' }}>
                No saved bills found. Click "Save Draft" in the top bar to save your current bill.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {savedBills.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      background: 'var(--tag-bg, #f8fafc)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color, #e2e8f0)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary, #0f172a)' }}>{b.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                        Saved: {new Date(b.savedAt).toLocaleDateString()} {new Date(b.savedAt).toLocaleTimeString()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setBillData({ ...b.billData })
                          setShowSavedBillsModal(false)
                          showNotification(`Restored: ${b.title}`)
                        }}
                        style={{
                          background: '#1e3a2b',
                          color: '#ffffff',
                          border: 'none',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Load
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete saved bill "${b.title}"?`)) {
                            const updated = deleteVatBillRecord(b.id)
                            if (updated) setSavedBills(updated)
                          }
                        }}
                        style={{
                          background: '#fee2e2',
                          color: '#b91c1c',
                          border: 'none',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: PROFILES & DIRECTORY MANAGEMENT
          ========================================================================= */}
      {showProfilesModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}
          onClick={() => setShowProfilesModal(false)}
        >
          <div
            style={{
              background: 'var(--card-bg, #ffffff)',
              borderRadius: '12px',
              maxWidth: '720px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} color="#1e3a2b" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Profiles Directory</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProfilesModal(false)}
                style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Navigation Tabs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
              {[
                { id: 'consignees', label: `Consignees (${savedConsignees.length})` },
                { id: 'agents', label: `Field 6 Agents (${savedPrincipalAgents.length})` },
                { id: 'transporters', label: `Transporters (${savedTransporters.length})` },
                { id: 'carriers', label: `Carriers (${savedCarriers.length})` },
                { id: 'drivers', label: `Drivers (${savedDrivers.length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveProfilesTab(tab.id)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: activeProfilesTab === tab.id ? '#1e3a2b' : '#f1f5f9',
                    color: activeProfilesTab === tab.id ? '#ffffff' : '#475569',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* If Editing a Profile */}
            {editingProfile ? (
              <div style={{ background: 'var(--tag-bg, #f8fafc)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color, #cbd5e1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                    {editingProfile.isNew ? 'Add New' : 'Edit'} {
                      activeProfilesTab === 'consignees' ? 'Consignee' :
                      activeProfilesTab === 'agents' ? 'Field 6 Agent' :
                      activeProfilesTab === 'transporters' ? 'Transporter' :
                      activeProfilesTab === 'carriers' ? 'Carrier' : 'Driver'
                    }
                  </h4>
                  <button
                    type="button"
                    onClick={() => setEditingProfile(null)}
                    style={{ background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {/* Name field */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                      {activeProfilesTab === 'consignees' ? 'Company Name *' :
                       activeProfilesTab === 'agents' ? 'Principal / Agent Name *' :
                       activeProfilesTab === 'transporters' ? 'Transporter / Logistics Company Name *' :
                       activeProfilesTab === 'carriers' ? 'Carrier Name / Vehicle Owner *' : 'Driver Name *'}
                    </label>
                    <input
                      type="text"
                      value={editingProfile.companyName || editingProfile.name || ''}
                      onChange={(e) => setEditingProfile(prev => ({ ...prev, companyName: e.target.value, name: e.target.value }))}
                      placeholder="Enter name"
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                    />
                  </div>

                  {/* GSTIN field for consignees, agents, transporters, carriers */}
                  {activeProfilesTab !== 'drivers' && (
                    <div style={{ gridColumn: activeProfilesTab === 'agents' ? 'span 2' : 'auto' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                        GSTIN / GST Number {activeProfilesTab === 'consignees' ? '*' : '(Optional)'}
                      </label>
                      <input
                        type="text"
                        value={editingProfile.gstin || ''}
                        onChange={(e) => setEditingProfile(prev => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                        placeholder="e.g. 24AAACH0401R1ZT"
                        style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                      />
                    </div>
                  )}

                  {/* TIN/CST for Consignees */}
                  {activeProfilesTab === 'consignees' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                        TIN / CST RC No. (Optional)
                      </label>
                      <input
                        type="text"
                        value={editingProfile.tinCst || ''}
                        onChange={(e) => setEditingProfile(prev => ({ ...prev, tinCst: e.target.value }))}
                        placeholder="e.g. 24040100000"
                        style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                      />
                    </div>
                  )}

                  {/* DL No and State for Drivers */}
                  {activeProfilesTab === 'drivers' && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                          Driving Licence No.
                        </label>
                        <input
                          type="text"
                          value={editingProfile.licenceNo || ''}
                          onChange={(e) => setEditingProfile(prev => ({ ...prev, licenceNo: e.target.value }))}
                          placeholder="e.g. TN 41 19970001161"
                          style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem', fontFamily: 'monospace' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                          State
                        </label>
                        <input
                          type="text"
                          value={editingProfile.state || ''}
                          onChange={(e) => setEditingProfile(prev => ({ ...prev, state: e.target.value }))}
                          placeholder="e.g. TAMILNADU"
                          style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                        />
                      </div>
                    </>
                  )}

                  {/* Address field for consignees, transporters, carriers, drivers */}
                  {activeProfilesTab !== 'agents' && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                        Address
                      </label>
                      <input
                        type="text"
                        value={editingProfile.address || ''}
                        onChange={(e) => setEditingProfile(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Enter full address"
                        style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                      />
                    </div>
                  )}

                  {/* City and State for Consignees */}
                  {activeProfilesTab === 'consignees' && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                          City
                        </label>
                        <input
                          type="text"
                          value={editingProfile.city || ''}
                          onChange={(e) => setEditingProfile(prev => ({ ...prev, city: e.target.value }))}
                          placeholder="e.g. Ankleshwar"
                          style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                          State
                        </label>
                        <input
                          type="text"
                          value={editingProfile.state || ''}
                          onChange={(e) => setEditingProfile(prev => ({ ...prev, state: e.target.value }))}
                          placeholder="e.g. Gujarat"
                          style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                        />
                      </div>
                    </>
                  )}

                  {/* Phone for Transporters, Carriers, Drivers */}
                  {(activeProfilesTab === 'transporters' || activeProfilesTab === 'carriers' || activeProfilesTab === 'drivers') && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary, #475569)', marginBottom: '0.25rem' }}>
                        Phone / Contact (Optional)
                      </label>
                      <input
                        type="text"
                        value={editingProfile.phone || ''}
                        onChange={(e) => setEditingProfile(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="e.g. 9876543210"
                        style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color, #cbd5e1)', fontSize: '0.85rem' }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditingProfile(null)}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      color: 'var(--text-secondary, #475569)',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      fontSize: '0.825rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveProfileItem(editingProfile)}
                    style={{
                      background: '#1e3a2b',
                      border: 'none',
                      color: '#ffffff',
                      padding: '0.5rem 1.25rem',
                      borderRadius: '6px',
                      fontSize: '0.825rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <Check size={15} /> Save Profile
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Tab: Consignees */}
                {activeProfilesTab === 'consignees' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.825rem', color: '#64748b' }}>Saved purchasers / consignees</span>
                      <button
                        type="button"
                        onClick={() => handleAddNewProfile('consignees')}
                        style={{ background: '#1e3a2b', color: '#ffffff', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Plus size={14} /> Add New Consignee
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {savedConsignees.map(c => (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--tag-bg, #f8fafc)', borderRadius: '6px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary, #0f172a)' }}>{c.companyName}</div>
                            <div style={{ fontSize: '0.775rem', color: '#64748b', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.2rem' }}>
                              {c.address && <span>{c.address}</span>}
                              {c.city && <span>• {c.city}</span>}
                              <span style={{ background: '#eaf3ed', color: '#1e3a2b', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.725rem', fontWeight: 700, fontFamily: 'monospace' }}>
                                GST: {c.gstin || 'None'}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectConsignee(c.id)
                                setShowProfilesModal(false)
                              }}
                              style={{ background: '#eaf3ed', color: '#1e3a2b', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Use
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditProfile('consignees', c)}
                              title="Edit Consignee"
                              style={{ background: '#f1f5f9', color: '#334155', border: '1px solid var(--border-color, #cbd5e1)', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete consignee "${c.companyName}"?`)) {
                                  const list = deleteVatConsignee(c.id)
                                  if (list) setSavedConsignees(list)
                                }
                              }}
                              style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '0.3rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab: Field 6 Principal Agents */}
                {activeProfilesTab === 'agents' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.825rem', color: '#64748b' }}>Field 6 Consigner / Principal Agents</span>
                      <button
                        type="button"
                        onClick={() => handleAddNewProfile('agents')}
                        style={{ background: '#1e3a2b', color: '#ffffff', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Plus size={14} /> Add New
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {savedPrincipalAgents.map(a => (
                        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--tag-bg, #f8fafc)', borderRadius: '6px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary, #0f172a)' }}>{a.name}</div>
                            <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '0.2rem' }}>
                              <span style={{ background: '#eaf3ed', color: '#1e3a2b', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.725rem', fontWeight: 700, fontFamily: 'monospace' }}>
                                GST: {a.gstin || 'None'}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectAgent(a.id)
                                setShowProfilesModal(false)
                              }}
                              style={{ background: '#eaf3ed', color: '#1e3a2b', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Use
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditProfile('agents', a)}
                              title="Edit Agent"
                              style={{ background: '#f1f5f9', color: '#334155', border: '1px solid var(--border-color, #cbd5e1)', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete agent "${a.name}"?`)) {
                                  const list = deleteVatPrincipalAgent(a.id)
                                  if (list) setSavedPrincipalAgents(list)
                                }
                              }}
                              style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '0.3rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab: Transporters */}
                {activeProfilesTab === 'transporters' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.825rem', color: '#64748b' }}>Logistics providers / transport companies</span>
                      <button
                        type="button"
                        onClick={() => handleAddNewProfile('transporters')}
                        style={{ background: '#1e3a2b', color: '#ffffff', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Plus size={14} /> Add New
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {savedTransporters.map(t => (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--tag-bg, #f8fafc)', borderRadius: '6px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary, #0f172a)' }}>{t.name}</div>
                            <div style={{ fontSize: '0.775rem', color: '#64748b', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.2rem' }}>
                              <span style={{ background: '#eaf3ed', color: '#1e3a2b', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.725rem', fontWeight: 700, fontFamily: 'monospace' }}>
                                GST: {t.gstin || 'None'}
                              </span>
                              {t.address && <span>• {t.address}</span>}
                              {t.phone && <span>• Ph: {t.phone}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectTransporter(t.id)
                                setShowProfilesModal(false)
                              }}
                              style={{ background: '#eaf3ed', color: '#1e3a2b', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Use
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditProfile('transporters', t)}
                              title="Edit Transporter"
                              style={{ background: '#f1f5f9', color: '#334155', border: '1px solid var(--border-color, #cbd5e1)', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete transporter "${t.name}"?`)) {
                                  const list = deleteVatTransporter(t.id)
                                  if (list) setSavedTransporters(list)
                                }
                              }}
                              style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '0.3rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab: Carriers */}
                {activeProfilesTab === 'carriers' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.825rem', color: '#64748b' }}>Field 11 Vehicle owners & carriers</span>
                      <button
                        type="button"
                        onClick={() => handleAddNewProfile('carriers')}
                        style={{ background: '#1e3a2b', color: '#ffffff', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Plus size={14} /> Add New
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {savedCarriers.map(c => (
                        <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--tag-bg, #f8fafc)', borderRadius: '6px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary, #0f172a)' }}>{c.name}</div>
                            <div style={{ fontSize: '0.775rem', color: '#64748b', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.2rem' }}>
                              <span style={{ background: '#eaf3ed', color: '#1e3a2b', padding: '0.15rem 0.45rem', borderRadius: '4px', fontSize: '0.725rem', fontWeight: 700, fontFamily: 'monospace' }}>
                                GST: {c.gstin || 'None'}
                              </span>
                              {c.address && <span>• {c.address}</span>}
                              {c.phone && <span>• Ph: {c.phone}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectCarrier(c.id)
                                setShowProfilesModal(false)
                              }}
                              style={{ background: '#eaf3ed', color: '#1e3a2b', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Use
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditProfile('carriers', c)}
                              title="Edit Carrier"
                              style={{ background: '#f1f5f9', color: '#334155', border: '1px solid var(--border-color, #cbd5e1)', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete carrier "${c.name}"?`)) {
                                  const list = deleteVatCarrier(c.id)
                                  if (list) setSavedCarriers(list)
                                }
                              }}
                              style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '0.3rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab: Drivers */}
                {activeProfilesTab === 'drivers' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.825rem', color: '#64748b' }}>Field 12 Drivers & driving licence numbers</span>
                      <button
                        type="button"
                        onClick={() => handleAddNewProfile('drivers')}
                        style={{ background: '#1e3a2b', color: '#ffffff', border: 'none', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      >
                        <Plus size={14} /> Add New
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {savedDrivers.map(d => (
                        <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--tag-bg, #f8fafc)', borderRadius: '6px', border: '1px solid var(--border-color, #e2e8f0)' }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary, #0f172a)' }}>{d.name}</div>
                            <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '0.2rem' }}>
                              DL: {d.licenceNo || 'None'} {d.state ? `• ${d.state}` : ''} {d.phone ? `• Ph: ${d.phone}` : ''}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              type="button"
                              onClick={() => {
                                handleSelectDriver(d.id)
                                setShowProfilesModal(false)
                              }}
                              style={{ background: '#eaf3ed', color: '#1e3a2b', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Use
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditProfile('drivers', d)}
                              title="Edit Driver"
                              style={{ background: '#f1f5f9', color: '#334155', border: '1px solid var(--border-color, #cbd5e1)', padding: '0.3rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            >
                              <Edit2 size={12} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete driver "${d.name}"?`)) {
                                  const list = deleteVatDriver(d.id)
                                  if (list) setSavedDrivers(list)
                                }
                              }}
                              style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '0.3rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* LocalStorage Note */}
            <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: 'var(--tag-bg, #f8fafc)', borderRadius: '8px', border: '1px solid var(--border-color, #e2e8f0)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <Info size={16} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: '1.4' }}>
                <strong>Storage Notice:</strong> All profiles are saved in your local browser's storage (<code style={{ color: 'var(--text-primary, #0f172a)' }}>localStorage</code>). They will remain available on this computer whenever you open this site, but will not automatically synchronize across different devices.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
