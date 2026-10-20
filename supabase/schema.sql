-- ========================================================================
-- G.K. SAW MILL CALCULATOR - SUPABASE DATABASE SCHEMA & POLICIES
-- Enterprise timber suite data model for Vatta Invoicing & Credit Notes
-- ========================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------
-- 1. VATTA INVOICES TABLE (Exclusively for Vatta Wood Business)
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
  tax_treatment TEXT DEFAULT 'IGST', -- 'IGST' | 'CGST_SGST'
  gst_rate NUMERIC(5, 2) DEFAULT 5.00,
  cgst_amount NUMERIC(14, 2) DEFAULT 0.00,
  sgst_amount NUMERIC(14, 2) DEFAULT 0.00,
  igst_amount NUMERIC(14, 2) DEFAULT 0.00,
  round_off NUMERIC(8, 2) DEFAULT 0.00,
  grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,

  -- Documents & Metadata
  pdf_storage_path TEXT,
  full_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for speedy searching by invoice number and receiver
CREATE INDEX IF NOT EXISTS idx_vatta_invoices_inv_no ON public.vatta_invoices(invoice_no);
CREATE INDEX IF NOT EXISTS idx_vatta_invoices_receiver ON public.vatta_invoices(receiver_name);
CREATE INDEX IF NOT EXISTS idx_vatta_invoices_date ON public.vatta_invoices(invoice_date DESC);

-- ------------------------------------------------------------------------
-- 2. CREDIT NOTES TABLE (Exclusively for Vatta Wood Business)
-- References vatta_invoices(id) via foreign key
-- ------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.credit_notes (
  id TEXT PRIMARY KEY,
  credit_note_no TEXT NOT NULL,
  credit_note_date DATE NOT NULL,
  reference_no TEXT,

  -- Foreign Key link to Original Vatta Invoice
  original_invoice_id TEXT NOT NULL REFERENCES public.vatta_invoices(id) ON DELETE RESTRICT,
  original_invoice_no TEXT NOT NULL,
  original_invoice_date DATE NOT NULL,

  -- Receiver Details (snapshot as of credit note issuance)
  receiver_name TEXT NOT NULL,
  receiver_address TEXT,
  receiver_pin_no TEXT,
  receiver_mobile_no TEXT,
  receiver_gstin TEXT,
  receiver_state TEXT,
  receiver_state_code TEXT,

  -- Despatched Party Details
  despatched_name TEXT,
  despatched_address TEXT,
  despatched_pin_no TEXT,
  despatched_mobile_no TEXT,
  despatched_gstin TEXT,
  despatched_state TEXT,
  despatched_state_code TEXT,

  -- Credit Specific Details
  goods_description TEXT NOT NULL DEFAULT 'Vatta wood Pencil Slats (Rejection Refund)',
  credit_reason TEXT NOT NULL DEFAULT 'Rejection Refund',
  hsn_code TEXT NOT NULL DEFAULT '44219140',

  -- Financial Calculations
  taxable_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  tax_treatment TEXT DEFAULT 'IGST', -- 'IGST' | 'CGST_SGST'
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

  -- Itemized breakdown snapshot if rejected by ply size
  item_breakdown JSONB DEFAULT '[]'::jsonb,

  -- Document Storage & Metadata
  pdf_storage_path TEXT,
  full_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for searching credit notes
CREATE INDEX IF NOT EXISTS idx_credit_notes_cn_no ON public.credit_notes(credit_note_no);
CREATE INDEX IF NOT EXISTS idx_credit_notes_orig_inv ON public.credit_notes(original_invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_receiver ON public.credit_notes(receiver_name);
CREATE INDEX IF NOT EXISTS idx_credit_notes_date ON public.credit_notes(credit_note_date DESC);

-- ------------------------------------------------------------------------
-- 3. BUSINESS PARTIES DIRECTORY TABLE (Receivers & Despatched Parties)
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

-- ------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures data is accessible only by authenticated sawmill users
-- ------------------------------------------------------------------------
ALTER TABLE public.vatta_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_parties ENABLE ROW LEVEL SECURITY;

-- Policies for vatta_invoices
CREATE POLICY "Allow authenticated sawmill users full access on vatta_invoices"
  ON public.vatta_invoices
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for credit_notes
CREATE POLICY "Allow authenticated sawmill users full access on credit_notes"
  ON public.credit_notes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policies for business_parties
CREATE POLICY "Allow authenticated sawmill users full access on business_parties"
  ON public.business_parties
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------
-- 5. STORAGE BUCKET CONFIGURATION (Run in SQL Editor or Storage Dashboard)
-- Private bucket for business documents (PDFs)
-- ------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-documents', 'business-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for business-documents bucket
CREATE POLICY "Authenticated users can upload business documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'business-documents');

CREATE POLICY "Authenticated users can read business documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'business-documents');

CREATE POLICY "Authenticated users can update/delete business documents"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'business-documents');
