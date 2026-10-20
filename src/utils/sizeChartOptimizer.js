import { calculateUnitCft, convertCftToCbm } from '../data/woodStandardSizes.js'

/**
 * Deterministic Quantity Optimization Algorithm
 * 
 * Objectives:
 * 1. Maintain authentic quantity proportions of reference charts (do not distribute evenly).
 * 2. Find whole-number quantities (Nos) for each row.
 * 3. Minimize |Actual Total CFT - Target CFT|.
 * 4. Never alter standard Width, Thick, or Length.
 * 
 * @param {Array} templateRows - Array of { slNo, item, width, thick, length, refNos }
 * @param {number} targetCft - Requested Target CFT
 * @returns {Object} Optimized chart result with rows, totals, and validation
 */
export function generateOptimizedSizeChart(templateRows, targetCft) {
  if (!templateRows || templateRows.length === 0) {
    return null
  }

  const target = parseFloat(targetCft)
  if (isNaN(target) || target <= 0) {
    return null
  }

  const n = templateRows.length
  const unitCfts = templateRows.map((r) => calculateUnitCft(r.width, r.thick, r.length))
  const refNos = templateRows.map((r) => r.refNos)
  const refTotalCft = templateRows.reduce((acc, r, i) => acc + unitCfts[i] * refNos[i], 0)

  let optimizedNos = []

  // Check if target is an exact match for the reference template
  if (Math.abs(target - refTotalCft) < 0.001) {
    optimizedNos = [...refNos]
  } else {
    // Proportional ideal quantities based on reference template pattern
    const scale = target / refTotalCft
    const idealNos = refNos.map((nos) => nos * scale)

    // Initial integer seed using nearest rounding
    let curr = idealNos.map((val) => Math.max(1, Math.round(val)))

    let bestNos = [...curr]
    let bestErr = Math.abs(curr.reduce((acc, v, i) => acc + unitCfts[i] * v, 0) - target)

    // Deterministic Optimization Loop
    const MAX_ITERATIONS = 400
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const currTotal = curr.reduce((acc, v, i) => acc + unitCfts[i] * v, 0)
      const diff = target - currTotal

      if (Math.abs(diff) < 0.001) {
        bestNos = [...curr]
        bestErr = 0
        break
      }

      let bestCandIdx = -1
      let bestCandDelta = 0
      let bestCandErr = Math.abs(diff)

      // Try single-piece increment or decrement
      if (diff > 0) {
        // We are below target: search for the best row to add 1 piece
        for (let i = 0; i < n; i++) {
          const candTotal = currTotal + unitCfts[i]
          const candErr = Math.abs(target - candTotal)
          if (candErr < bestCandErr) {
            bestCandErr = candErr
            bestCandIdx = i
            bestCandDelta = 1
          }
        }
      } else {
        // We are above target: search for the best row to remove 1 piece
        for (let i = 0; i < n; i++) {
          if (curr[i] > 1) {
            const candTotal = currTotal - unitCfts[i]
            const candErr = Math.abs(target - candTotal)
            if (candErr < bestCandErr) {
              bestCandErr = candErr
              bestCandIdx = i
              bestCandDelta = -1
            }
          }
        }
      }

      if (bestCandIdx !== -1 && bestCandErr < Math.abs(diff) - 0.0001) {
        curr[bestCandIdx] += bestCandDelta
        if (bestCandErr < bestErr) {
          bestErr = bestCandErr
          bestNos = [...curr]
        }
      } else {
        // Try fine-grain pair adjustment: +1 on row i and -1 on row j
        let pairImproved = false
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if (i !== j && curr[j] > 1) {
              const candTotal = currTotal + unitCfts[i] - unitCfts[j]
              const candErr = Math.abs(target - candTotal)
              if (candErr < Math.abs(diff) - 0.001) {
                curr[i] += 1
                curr[j] -= 1
                if (candErr < bestErr) {
                  bestErr = candErr
                  bestNos = [...curr]
                }
                pairImproved = true
                break
              }
            }
          }
          if (pairImproved) break
        }

        if (!pairImproved) {
          break
        }
      }
    }

    optimizedNos = bestNos
  }

  // Build output rows
  const rows = templateRows.map((tRow, i) => {
    const nos = optimizedNos[i]
    const exactCft = unitCfts[i] * nos
    return {
      slNo: tRow.slNo,
      item: tRow.item,
      width: tRow.width,
      thick: tRow.thick,
      length: tRow.length,
      nos: nos,
      cft: exactCft,
      cftFormatted: exactCft.toFixed(2),
    }
  })

  const totalNos = rows.reduce((sum, r) => sum + r.nos, 0)
  const actualTotalCft = rows.reduce((sum, r) => sum + r.cft, 0)
  const diff = actualTotalCft - target
  const isExact = Math.abs(diff) < 0.01

  return {
    rows,
    targetCft: target,
    actualTotalCft: Number(actualTotalCft.toFixed(2)),
    actualTotalCftRaw: actualTotalCft,
    difference: Number(diff.toFixed(2)),
    isExact,
    totalNos,
    cbm: Number(convertCftToCbm(actualTotalCft).toFixed(2)),
  }
}

/**
 * Format table for Canva copying
 * Generates tab-separated text suitable for pasting directly into Canva tables
 */
export function formatTableForCanva(chartResult) {
  if (!chartResult || !chartResult.rows) return ''

  const header = ['Sl No', 'Item', 'Width', 'Thick', 'Length', 'Nos', 'Cft'].join('\t')
  const rows = chartResult.rows.map((r) =>
    [r.slNo, r.item, r.width, r.thick, r.length, r.nos, r.cftFormatted].join('\t')
  )
  const footerTotal = ['Total', '', '', '', '', chartResult.totalNos, chartResult.actualTotalCft.toFixed(2)].join('\t')
  const footerCbm = ['CBM', '', '', '', '', '', chartResult.cbm.toFixed(2)].join('\t')

  return [header, ...rows, footerTotal, footerCbm].join('\n')
}

/**
 * Format numerical values only (tab-separated)
 */
export function formatNumericalValuesOnly(chartResult) {
  if (!chartResult || !chartResult.rows) return ''

  const header = ['Sl No', 'Width', 'Thick', 'Length', 'Nos', 'Cft'].join('\t')
  const rows = chartResult.rows.map((r) =>
    [r.slNo, r.width, r.thick, r.length, r.nos, r.cftFormatted].join('\t')
  )
  const footer = ['Total', '', '', '', chartResult.totalNos, chartResult.actualTotalCft.toFixed(2)].join('\t')

  return [header, ...rows, footer].join('\n')
}

/**
 * Generate CSV text for download
 */
export function generateCsvContent(chartResult) {
  if (!chartResult || !chartResult.rows) return ''

  const header = ['Sl No', 'Item', 'Width', 'Thick', 'Length', 'Nos', 'Cft'].join(',')
  const rows = chartResult.rows.map((r) =>
    [
      r.slNo,
      `"${r.item}"`,
      r.width,
      r.thick,
      r.length,
      r.nos,
      r.cftFormatted,
    ].join(',')
  )
  const totalRow = ['Total', '""', '', '', '', chartResult.totalNos, chartResult.actualTotalCft.toFixed(2)].join(',')
  const cbmRow = ['CBM', '""', '', '', '', '', chartResult.cbm.toFixed(2)].join(',')

  return [header, ...rows, totalRow, cbmRow].join('\n')
}
