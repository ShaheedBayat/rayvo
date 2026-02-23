import { format, parseISO } from 'date-fns';

export function formatDate(date: string | Date): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMM yyyy');
  } catch {
    return '—';
  }
}
