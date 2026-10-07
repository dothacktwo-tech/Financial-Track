/**
 * Format number to Indonesian Rupiah (IDR)
 * Example: 1500000 -> "Rp 1.500.000"
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'Rp 0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Clean currency string to number
 */
export function parseCurrency(input: string | number): number {
  if (typeof input === 'number') return input;
  if (!input) return 0;
  const cleaned = input.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
