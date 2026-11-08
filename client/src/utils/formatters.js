// Currency formatting for Ethiopian Birr (ETB)
export function formatETB(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0.00 ETB';
  }
  return new Intl.NumberFormat('en-ET', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ETB';
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (e) {
    return dateStr;
  }
}

export function formatTime(timeStr) {
  if (!timeStr) return '';
  return timeStr;
}

export function formatDateTime(dateTimeStr) {
  if (!dateTimeStr) return '';
  try {
    const d = new Date(dateTimeStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateTimeStr;
  }
}
