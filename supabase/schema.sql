-- ========================================================================
-- G.K. SAWMILL - COMPLETE SUPABASE DATABASE SCHEMA & POLICIES
-- Master SQL Script for all 7 modules:
-- 1. vatta_invoices
-- 2. credit_notes
-- 3. debit_notes
-- 4. timber_invoices (Mahogany & Manjiyam)
-- 5. kerala_vat_bills (Kerala VAT Form 8F)
-- 6. vatta_measurement_sheets
-- 7. business_parties (Receivers & Despatched Parties Directory)
-- + Row Level Security (RLS) configured for anon & authenticated roles
-- + Storage bucket 'business-documents'
-- ========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------
-- 1. VATTA INVOICES TABLE (Module 01: Vatta GST Invoices)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vatta_invoices (
  id TEXT PRIMARY KEY,
  invoice_no TEXT NOT NULL,
  purchase_order_no TEXT,
  invoice_date DATE NOT NULL,
  date_of_supply DATE,
  state TEXT DEFAULT 'KERALA',
  state_code TEXT DEFAULT '32',
  place_of_supply TEXT,
  transportation_mode TEXT,
  vehicle_no TEXT,
  forest_pass_no TEXT,
  total_measurement NUMERIC(12, 4),
  eway_bill_no TEXT,
  reverse_charge TEXT DEFAULT 'No',

  -- Receiver Details
  receiver_name TEXT NOT NULL,
  receiver_address TEXT,
  receiver_pin_no TEXT,
  receiver_mobile_no TEXT,
  receiver_gstin TEXT,
  receiver_state TEXT,
  receiver_state_code TEXT,

  -- Despatched Details
  despatched_name TEXT,
  despatched_address TEXT,
  despatched_pin_no TEXT,
  despatched_mobile_no TEXT,
  despatched_gstin TEXT,
  despatched_state TEXT,
  despatched_state_code TEXT,

  -- Quantities & Financial Totals
  bag_quantities JSONB NOT NULL DEFAULT '{}'::jsonb,
  products_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_bags INTEGER DEFAULT 0,
  total_pieces INTEGER DEFAULT 0,
  sub_total NUMERIC(14, 2) DEFAULT 0.00,
  discount_val NUMERIC(14, 2) DEFAULT 0.00,
  freight NUMERIC(14, 2) DEFAULT 0.00,
  insurance NUMERIC(14, 2) DEFAULT 0.00,
  packing_charge NUMERIC(14, 2) DEFAULT 0.00,
  taxable_value NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  tax_treatment TEXT DEFAULT 'IGST',
  gst_rate NUMERIC(5, 2) DEFAULT 5.00,
  cgst_amount NUMERIC(14, 2) DEFAULT 0.00,
  sgst_amount NUMERIC(14, 2) DEFAULT 0.00,
  igst_amount NUMERIC(14, 2) DEFAULT 0.00,
  round_off NUMERIC(8, 2) DEFAULT 0.00,
  grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,

  full_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vatta_invoices_inv_no ON public.vatta_invoices(invoice_no);
CREATE INDEX IF NOT EXISTS idx_vatta_invoices_receiver ON public.vatta_invoices(receiver_name);
CREATE INDEX IF NOT EXISTS idx_vatta_invoices_date ON public.vatta_invoices(invoice_date DESC);

-- ------------------------------------------------------------------------
-- 2. CREDIT NOTES TABLE (Module 06: Credit Notes)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_notes (
  id TEXT PRIMARY KEY,
  credit_note_no TEXT NOT NULL,
  credit_note_date DATE NOT NULL,
  reference_no TEXT,

  original_invoice_id TEXT NOT NULL,
  original_invoice_no TEXT NOT NULL,
  original_invoice_date DATE NOT NULL,

  receiver_name TEXT NOT NULL,
  receiver_address TEXT,
  receiver_pin_no TEXT,
  receiver_mobile_no TEXT,
  receiver_gstin TEXT,
  receiver_state TEXT,
  receiver_state_code TEXT,

  despatched_name TEXT,
  despatched_address TEXT,
  despatched_pin_no TEXT,
  despatched_mobile_no TEXT,
  despatched_gstin TEXT,
  despatched_state TEXT,
  despatched_state_code TEXT,

  goods_description TEXT NOT NULL DEFAULT 'Vatta wood Pencil Slats (Rejection Refund)',
  credit_reason TEXT NOT NULL DEFAULT 'Rejection Refund',
  hsn_code TEXT NOT NULL DEFAULT '44219140',

  taxable_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  tax_treatment TEXT DEFAULT 'IGST',
  gst_rate NUMERIC(5, 2) DEFAULT 5.00,
  cgst_rate NUMERIC(5, 2) DEFAULT 0.00,
  cgst_amount NUMERIC(14, 2) DEFAULT 0.00,
  sgst_rate NUMERIC(5, 2) DEFAULT 0.00,
  sgst_amount NUMERIC(14, 2) DEFAULT 0.00,
  igst_rate NUMERIC(5, 2) DEFAULT 5.00,
  igst_amount NUMERIC(14, 2) DEFAULT 0.00,
  round_off NUMERIC(8, 2) DEFAULT 0.00,
  net_value NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total_in_words TEXT NOT NULL,

  item_breakdown JSONB DEFAULT '[]'::jsonb,
  full_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_cn_no ON public.credit_notes(credit_note_no);
CREATE INDEX IF NOT EXISTS idx_credit_notes_orig_inv ON public.credit_notes(original_invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_receiver ON public.credit_notes(receiver_name);

-- ------------------------------------------------------------------------
-- 3. DEBIT NOTES TABLE (Module 07: Debit Notes)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.debit_notes (
  id TEXT PRIMARY KEY,
  debit_note_no TEXT NOT NULL,
  debit_note_date DATE NOT NULL,
  reference_no TEXT,

  receiver_name TEXT NOT NULL,
  receiver_address TEXT,
  receiver_state TEXT,
  receiver_state_code TEXT,
  receiver_gstin TEXT,

  goods_description TEXT NOT NULL,
  hsn_code TEXT NOT NULL DEFAULT '44219140',

  total_bags INTEGER NOT NULL DEFAULT 0,
  taxable_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  tax_treatment TEXT DEFAULT 'IGST',
  gst_rate NUMERIC(5, 2) DEFAULT 5.00,
  gst_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total_dn_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  total_in_words TEXT NOT NULL,

  items_payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  full_payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debit_notes_dn_no ON public.debit_notes(debit_note_no);
CREATE INDEX IF NOT EXISTS idx_debit_notes_receiver ON public.debit_notes(receiver_name);

-- ------------------------------------------------------------------------
-- 4. TIMBER INVOICES TABLE (Module 03: Mahogany & Manjiyam Invoices)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.timber_invoices (
  id TEXT PRIMARY KEY,
  invoice_no TEXT NOT NULL,
  invoice_date DATE,
  vehicle_no TEXT,
  date_of_supply DATE,
  place_of_supply TEXT,
  state TEXT DEFAULT 'Kerala',
  state_code TEXT DEFAULT '32',
  eway_bill_no TEXT,
  reverse_charge TEXT,

  receiver_name TEXT,
  receiver_address TEXT,
  receiver_gstin TEXT,
  receiver_state TEXT,

  mahogany_enabled BOOLEAN DEFAULT true,
  mahogany_cft NUMERIC(12, 2) DEFAULT 0.00,
  mahogany_rate NUMERIC(12, 2) DEFAULT 0.00,
  mahogany_taxable NUMERIC(14, 2) DEFAULT 0.00,

  manjiyam_enabled BOOLEAN DEFAULT true,
  manjiyam_cft NUMERIC(12, 2) DEFAULT 0.00,
  manjiyam_rate NUMERIC(12, 2) DEFAULT 0.00,
  manjiyam_taxable NUMERIC(14, 2) DEFAULT 0.00,

  total_cft NUMERIC(12, 2) DEFAULT 0.00,
  grand_total NUMERIC(14, 2) DEFAULT 0.00,

  full_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timber_invoices_inv_no ON public.timber_invoices(invoice_no);
CREATE INDEX IF NOT EXISTS idx_timber_invoices_receiver ON public.timber_invoices(receiver_name);

-- ------------------------------------------------------------------------
-- 5. KERALA VAT BILLS TABLE (Module 05: Kerala VAT Form 8F)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kerala_vat_bills (
  id TEXT PRIMARY KEY,
  bill_no TEXT NOT NULL,
  bill_date DATE,
  bill_value NUMERIC(14, 2) DEFAULT 0.00,
  eway_bill_no TEXT,
  vehicle_no TEXT,

  consigner_name TEXT,
  consigner_business_name TEXT,
  consignee_name TEXT,
  consignee_address TEXT,
  consignee_gstin TEXT,
  consignee_state TEXT,

  goods_description TEXT,
  bag_quantity INTEGER DEFAULT 0,

  transporter_name TEXT,
  transport_doc_no TEXT,

  full_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kerala_vat_bills_no ON public.kerala_vat_bills(bill_no);
CREATE INDEX IF NOT EXISTS idx_kerala_vat_bills_consignee ON public.kerala_vat_bills(consignee_name);

-- ------------------------------------------------------------------------
-- 6. VATTA MEASUREMENT SHEETS TABLE (Module 02: Vatta Measurement Calculator)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vatta_measurement_sheets (
  id TEXT PRIMARY KEY,
  sheet_date DATE,
  invoice_no TEXT,
  pass_no TEXT,
  lorry_reg_no TEXT,
  place TEXT,
  total_bags INTEGER DEFAULT 0,
  total_pieces INTEGER DEFAULT 0,
  grand_total_cbm NUMERIC(12, 4) DEFAULT 0.000,
  bag_quantities JSONB NOT NULL DEFAULT '{}'::jsonb,

  full_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vatta_sheets_inv_no ON public.vatta_measurement_sheets(invoice_no);
CREATE INDEX IF NOT EXISTS idx_vatta_sheets_lorry ON public.vatta_measurement_sheets(lorry_reg_no);

-- ------------------------------------------------------------------------
-- 7. BUSINESS PARTIES DIRECTORY TABLE (Receivers & Despatched Parties)
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.business_parties (
  id TEXT PRIMARY KEY,
  party_type TEXT NOT NULL, -- 'RECEIVER' | 'DESPATCHED'
  name TEXT NOT NULL,
  address TEXT,
  pin_no TEXT,
  mobile_no TEXT,
  gstin TEXT,
  state TEXT,
  state_code TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_parties_name ON public.business_parties(name);

-- ========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR ALL TABLES
-- Configured for both 'anon' (browser client) and 'authenticated' roles
-- Ensures uninterrupted syncing in local and cloud modes
-- ========================================================================

-- Enable RLS
ALTER TABLE public.vatta_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timber_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kerala_vat_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vatta_measurement_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_parties ENABLE ROW LEVEL SECURITY;

-- 1. vatta_invoices policies
DROP POLICY IF EXISTS "Allow anon and authenticated full access on vatta_invoices" ON public.vatta_invoices;
DROP POLICY IF EXISTS "Allow authenticated sawmill users full access on vatta_invoices" ON public.vatta_invoices;
CREATE POLICY "Allow anon and authenticated full access on vatta_invoices"
  ON public.vatta_invoices FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- 2. credit_notes policies
DROP POLICY IF EXISTS "Allow anon and authenticated full access on credit_notes" ON public.credit_notes;
DROP POLICY IF EXISTS "Allow authenticated sawmill users full access on credit_notes" ON public.credit_notes;
CREATE POLICY "Allow anon and authenticated full access on credit_notes"
  ON public.credit_notes FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- 3. debit_notes policies
DROP POLICY IF EXISTS "Allow anon and authenticated full access on debit_notes" ON public.debit_notes;
DROP POLICY IF EXISTS "Allow authenticated sawmill users full access on debit_notes" ON public.debit_notes;
CREATE POLICY "Allow anon and authenticated full access on debit_notes"
  ON public.debit_notes FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- 4. timber_invoices policies
DROP POLICY IF EXISTS "Allow anon and authenticated full access on timber_invoices" ON public.timber_invoices;
CREATE POLICY "Allow anon and authenticated full access on timber_invoices"
  ON public.timber_invoices FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- 5. kerala_vat_bills policies
DROP POLICY IF EXISTS "Allow anon and authenticated full access on kerala_vat_bills" ON public.kerala_vat_bills;
CREATE POLICY "Allow anon and authenticated full access on kerala_vat_bills"
  ON public.kerala_vat_bills FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- 6. vatta_measurement_sheets policies
DROP POLICY IF EXISTS "Allow anon and authenticated full access on vatta_measurement_sheets" ON public.vatta_measurement_sheets;
CREATE POLICY "Allow anon and authenticated full access on vatta_measurement_sheets"
  ON public.vatta_measurement_sheets FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- 7. business_parties policies
DROP POLICY IF EXISTS "Allow anon and authenticated full access on business_parties" ON public.business_parties;
DROP POLICY IF EXISTS "Allow authenticated sawmill users full access on business_parties" ON public.business_parties;
CREATE POLICY "Allow anon and authenticated full access on business_parties"
  ON public.business_parties FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------
-- STORAGE BUCKET CONFIGURATION
-- Private bucket for business documents (PDFs)
-- ------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-documents', 'business-documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public access on business documents" ON storage.objects;
CREATE POLICY "Public access on business documents"
  ON storage.objects FOR ALL TO anon, authenticated
  USING (bucket_id = 'business-documents')
  WITH CHECK (bucket_id = 'business-documents');
