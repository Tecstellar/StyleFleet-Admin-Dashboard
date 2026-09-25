/**
 * Format currency from minor units (paise) to INR (₹)
 */
export function formatCurrency(amountMinor: number | null | undefined): string {
  if (amountMinor === null || amountMinor === undefined || isNaN(amountMinor)) {
    return '₹0.00';
  }
  const rupees = amountMinor / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/**
 * Format numbers with Indian numbering grouping (lakhs, crores)
 */
export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return new Intl.NumberFormat('en-IN').format(val);
}

/**
 * Format phone number
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return phone;
}

/**
 * Export data array to CSV file
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
): void {
  if (!data || data.length === 0) {
    alert('No records available to export.');
    return;
  }

  const headers = columns
    ? columns.map((c) => `"${c.label.replace(/"/g, '""')}"`)
    : Object.keys(data[0]).map((k) => `"${k.replace(/"/g, '""')}"`);

  const keys = columns ? columns.map((c) => c.key) : Object.keys(data[0]);

  const rows = data.map((item) =>
    keys
      .map((k) => {
        const val = item[k];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
