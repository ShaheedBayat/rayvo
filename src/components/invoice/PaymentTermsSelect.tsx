import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PAYMENT_TERMS = [
  { value: '3_days', label: '3 Days from Invoice' },
  { value: '7_days', label: '7 Days from Invoice' },
  { value: 'end_of_month', label: 'End of Invoice Month' },
  { value: 'specific_date', label: 'Specific Date' },
];

function computeDueDate(term: string, invoiceDate?: Date): string {
  const base = invoiceDate || new Date();
  if (term === '3_days') {
    const d = new Date(base);
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  }
  if (term === '7_days') {
    const d = new Date(base);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }
  if (term === 'end_of_month') {
    const d = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    return d.toISOString().split('T')[0];
  }
  return '';
}

interface Props {
  value: string;
  onChange: (terms: string, dueDate: string) => void;
}

export default function PaymentTermsSelect({ value, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>();

  const handleChange = (v: string) => {
    if (v === 'specific_date') {
      onChange(v, '');
      setPickerOpen(true);
      return;
    }
    const due = computeDueDate(v);
    onChange(v, due);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setPickerDate(date);
      onChange('specific_date', date.toISOString().split('T')[0]);
      setPickerOpen(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="h-9 flex-1">
          <SelectValue placeholder="Select terms" />
        </SelectTrigger>
        <SelectContent>
          {PAYMENT_TERMS.map(t => (
            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value === 'specific_date' && (
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn("h-9 w-[140px] justify-start text-left font-normal", !pickerDate && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {pickerDate ? format(pickerDate, 'dd MMM yyyy') : 'Pick date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={pickerDate}
              onSelect={handleDateSelect}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export { PAYMENT_TERMS };
