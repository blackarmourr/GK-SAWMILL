/**
 * Converts a numeric amount to Indian Currency Words format
 * e.g. 147706.50 -> "One Lakh Forty Seven Thousand Seven Hundred Six & Fifty Paise"
 * e.g. 125175.00 -> "One Lakh Twenty Five Thousand One Hundred Seventy Five Only"
 */

export function convertNumberToIndianWords(num) {
  if (num === null || num === undefined || isNaN(num)) return ''
  
  const val = Math.round(Number(num) * 100) / 100
  if (val === 0) return 'Zero Rupees Only'
  
  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ]
  
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ]

  function twoDigits(n) {
    if (n < 20) return ones[n]
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')
  }

  function threeDigits(n) {
    const h = Math.floor(n / 100)
    const rest = n % 100
    let res = ''
    if (h > 0) res += ones[h] + ' Hundred'
    if (rest > 0) {
      if (res) res += ' '
      res += twoDigits(rest)
    }
    return res
  }

  const parts = Math.abs(val).toFixed(2).split('.')
  let rupees = parseInt(parts[0], 10)
  const paise = parseInt(parts[1], 10)

  let words = ''
  
  const crore = Math.floor(rupees / 10000000)
  rupees %= 10000000
  
  const lakh = Math.floor(rupees / 100000)
  rupees %= 100000
  
  const thousand = Math.floor(rupees / 1000)
  rupees %= 1000
  
  const hundredAndRest = rupees

  if (crore > 0) words += convertNumberToIndianWords(crore).replace(/ Only$/, '').replace(/^Zero /, '') + ' Crore '
  if (lakh > 0) words += twoDigits(lakh) + ' Lakh '
  if (thousand > 0) words += twoDigits(thousand) + ' Thousand '
  if (hundredAndRest > 0) words += threeDigits(hundredAndRest)

  words = words.trim()
  if (!words) words = 'Zero'

  let result = words
  if (paise > 0) {
    result += ' & ' + twoDigits(paise) + ' Paise'
  } else {
    result += ' Only'
  }

  return result.replace(/\s+/g, ' ').trim()
}

/**
 * Format total words exactly matching Form GST Invoice-I:
 * "(Seven Lakh Eighty One Thousand Two Hundred and Ninety Two Rupees and Ninety Three Paise Only)"
 */
export function formatInvoiceGrandTotalWords(num) {
  if (num === null || num === undefined || isNaN(num)) return ''
  const val = Math.round(Number(num) * 100) / 100
  if (val === 0) return '(Zero Rupees Only)'

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ]
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ]

  function twoDigits(n) {
    if (n < 20) return ones[n]
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')
  }

  function threeDigits(n) {
    const h = Math.floor(n / 100)
    const rest = n % 100
    let res = ''
    if (h > 0) res += ones[h] + ' Hundred'
    if (rest > 0) {
      if (res) res += ' and '
      res += twoDigits(rest)
    }
    return res
  }

  const parts = Math.abs(val).toFixed(2).split('.')
  let rupees = parseInt(parts[0], 10)
  const paise = parseInt(parts[1], 10)

  let words = ''
  const crore = Math.floor(rupees / 10000000)
  rupees %= 10000000
  const lakh = Math.floor(rupees / 100000)
  rupees %= 100000
  const thousand = Math.floor(rupees / 1000)
  rupees %= 1000
  const hundredAndRest = rupees

  if (crore > 0) {
    const croreWords = formatInvoiceGrandTotalWords(crore).replace(/^\(/, '').replace(/ Only\)$/, '').replace(/ Rupees$/, '')
    words += croreWords + ' Crore '
  }
  if (lakh > 0) words += twoDigits(lakh) + ' Lakh '
  if (thousand > 0) words += twoDigits(thousand) + ' Thousand '
  if (hundredAndRest > 0) words += threeDigits(hundredAndRest)

  words = words.trim()
  if (!words) words = 'Zero'

  let result = words + ' Rupees'
  if (paise > 0) {
    result += ' and ' + twoDigits(paise) + ' Paise Only'
  } else {
    result += ' Only'
  }

  return `(${result.replace(/\s+/g, ' ').trim()})`
}

/**
 * Format total words exactly matching the official Credit Note sample:
 * "One Thousand Three Hundred and Sixty Seven Only."
 */
export function formatCreditNoteWords(num) {
  if (num === null || num === undefined || isNaN(num)) return ''
  const val = Math.round(Number(num) * 100) / 100
  if (val === 0) return 'Zero Rupees Only.'

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ]
  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ]

  function twoDigits(n) {
    if (n < 20) return ones[n]
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '')
  }

  function threeDigits(n) {
    const h = Math.floor(n / 100)
    const rest = n % 100
    let res = ''
    if (h > 0) res += ones[h] + ' Hundred'
    if (rest > 0) {
      if (res) res += ' and '
      res += twoDigits(rest)
    }
    return res
  }

  const parts = Math.abs(val).toFixed(2).split('.')
  let rupees = parseInt(parts[0], 10)
  const paise = parseInt(parts[1], 10)

  let words = ''
  const crore = Math.floor(rupees / 10000000)
  rupees %= 10000000
  const lakh = Math.floor(rupees / 100000)
  rupees %= 100000
  const thousand = Math.floor(rupees / 1000)
  rupees %= 1000
  const hundredAndRest = rupees

  if (crore > 0) {
    words += twoDigits(crore) + ' Crore '
  }
  if (lakh > 0) words += twoDigits(lakh) + ' Lakh '
  if (thousand > 0) words += twoDigits(thousand) + ' Thousand '
  if (hundredAndRest > 0) words += threeDigits(hundredAndRest)

  words = words.trim()
  if (!words) words = 'Zero'

  let result = words
  if (paise > 0) {
    result += ' Rupees and ' + twoDigits(paise) + ' Paise'
  }
  result += ' Only.'

  return result.replace(/\s+/g, ' ').trim()
}


