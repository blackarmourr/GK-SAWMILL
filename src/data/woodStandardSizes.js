/**
 * Standard Wood Sizes and Reference Templates for G.K. Saw Mill
 * 
 * Source of Truth:
 * 1. Mahogany 419 CFT Chart (15 Standard Rows) - Invoice A-21
 * 2. Manjiyam 120 CFT Chart (7 Standard Rows) - Invoice A-17 / WhatsApp Spec
 * 3. Manjiyam 238 CFT Chart (10 Standard Rows) - Invoice A-21
 */

export const MAHAGANI_ITEM_DESC = 'Mahagani Wood Size Cuttings'
export const MANJIYAM_ITEM_DESC = 'Manjiyam Wood Size Cuttings'

/**
 * 15 Standard Mahogany Rows (Fixed standard dimensions)
 * Unit CFT = (Width × Thick × Length) / 144
 */
export const MAHOGANY_STANDARD_ROWS = [
  { slNo: 1, item: MAHAGANI_ITEM_DESC, width: 6, thick: 4, length: 7, refNos: 62 },
  { slNo: 2, item: MAHAGANI_ITEM_DESC, width: 4, thick: 3, length: 7, refNos: 41 },
  { slNo: 3, item: MAHAGANI_ITEM_DESC, width: 4, thick: 1.5, length: 7, refNos: 96 },
  { slNo: 4, item: MAHAGANI_ITEM_DESC, width: 4, thick: 3, length: 2, refNos: 121 },
  { slNo: 5, item: MAHAGANI_ITEM_DESC, width: 3, thick: 1.5, length: 5, refNos: 102 },
  { slNo: 6, item: MAHAGANI_ITEM_DESC, width: 6, thick: 4, length: 7, refNos: 26 },
  { slNo: 7, item: MAHAGANI_ITEM_DESC, width: 3, thick: 1.5, length: 7, refNos: 53 },
  { slNo: 8, item: MAHAGANI_ITEM_DESC, width: 3, thick: 1.5, length: 3, refNos: 115 },
  { slNo: 9, item: MAHAGANI_ITEM_DESC, width: 4, thick: 1.5, length: 4, refNos: 173 },
  { slNo: 10, item: MAHAGANI_ITEM_DESC, width: 4, thick: 2, length: 7, refNos: 69 },
  { slNo: 11, item: MAHAGANI_ITEM_DESC, width: 5, thick: 1.5, length: 6, refNos: 73 },
  { slNo: 12, item: MAHAGANI_ITEM_DESC, width: 3, thick: 2, length: 7, refNos: 72 },
  { slNo: 13, item: MAHAGANI_ITEM_DESC, width: 5, thick: 3, length: 7, refNos: 68 },
  { slNo: 14, item: MAHAGANI_ITEM_DESC, width: 3, thick: 1.5, length: 2, refNos: 112 },
  { slNo: 15, item: MAHAGANI_ITEM_DESC, width: 6, thick: 1.5, length: 7, refNos: 114 },
]

/**
 * 10 Standard Manjiyam Rows in their canonical Sl No order
 * Rows 1-7 represent the 7-row standard chart (120 CFT reference)
 * Rows 1-10 represent the 10-row standard chart (238 CFT reference)
 */
export const MANJIYAM_STANDARD_ROWS_10 = [
  { slNo: 1, item: MANJIYAM_ITEM_DESC, width: 6, thick: 4, length: 7, refNos: 45 },
  { slNo: 2, item: MANJIYAM_ITEM_DESC, width: 4, thick: 3, length: 7, refNos: 20 },
  { slNo: 3, item: MANJIYAM_ITEM_DESC, width: 4, thick: 1.5, length: 7, refNos: 100 },
  { slNo: 4, item: MANJIYAM_ITEM_DESC, width: 4, thick: 3, length: 2, refNos: 123 },
  { slNo: 5, item: MANJIYAM_ITEM_DESC, width: 3, thick: 1.5, length: 5, refNos: 170 },
  { slNo: 6, item: MANJIYAM_ITEM_DESC, width: 6, thick: 4, length: 7, refNos: 25 },
  { slNo: 7, item: MANJIYAM_ITEM_DESC, width: 3, thick: 1.5, length: 7, refNos: 120 },
  { slNo: 8, item: MANJIYAM_ITEM_DESC, width: 4, thick: 1.5, length: 7, refNos: 90 },
  { slNo: 9, item: MANJIYAM_ITEM_DESC, width: 3, thick: 1.5, length: 5, refNos: 70 },
  { slNo: 10, item: MANJIYAM_ITEM_DESC, width: 4, thick: 3, length: 2, refNos: 30 },
]

/**
 * 7 Standard Manjiyam Rows with reference Nos from the 120 CFT Chart
 */
export const MANJIYAM_STANDARD_ROWS_7 = [
  { slNo: 1, item: MANJIYAM_ITEM_DESC, width: 6, thick: 4, length: 7, refNos: 35 },
  { slNo: 2, item: MANJIYAM_ITEM_DESC, width: 4, thick: 3, length: 7, refNos: 12 },
  { slNo: 3, item: MANJIYAM_ITEM_DESC, width: 4, thick: 1.5, length: 7, refNos: 79 },
  { slNo: 4, item: MANJIYAM_ITEM_DESC, width: 4, thick: 3, length: 2, refNos: 23 },
  { slNo: 5, item: MANJIYAM_ITEM_DESC, width: 3, thick: 1.5, length: 5, refNos: 64 },
  { slNo: 6, item: MANJIYAM_ITEM_DESC, width: 6, thick: 4, length: 7, refNos: 10 },
  { slNo: 7, item: MANJIYAM_ITEM_DESC, width: 3, thick: 1.5, length: 7, refNos: 108 },
]

/**
 * Calculates Unit CFT for a single piece
 * Formula: (Width × Thick × Length) / 144
 */
export function calculateUnitCft(width, thick, length) {
  return (width * thick * length) / 144
}

/**
 * Converts CFT to CBM
 * Formula: CFT × 0.0283168466
 */
export function convertCftToCbm(cft) {
  return cft * 0.0283168466
}
