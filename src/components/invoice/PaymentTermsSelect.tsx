import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAYMENT_TERMS = [
  { value: 'due_on_receipt', label: 'Due on Receipt', days: 0 },
  { value: 'net_7', label: 'Net 7', days: 7 },
  { value: 'net_14', label: 'Net 14', days: 14 },
  { value: 'net_30', label: 'Net 30', days: 30 },
  { value: 'net_60', label: 'Net 60', days: 60 },
  { value: 'net_90', label: 'Net 90', days: 90 },
];

interface Props {
  value: string;
  onChange: (terms: string, dueDate: string) => void;
}

export default function PaymentTermsSelect({ value, onChange }: Props) {
  const handleChange = (v: string) => {
    const term = PAYMENT_TERMS.find(t => t.value === v);
    if (term) {
      const d = new Date();
      d.setDate(d.getDate() + term.days);
      onChange(v, d.toISOString().split('T')[0]);
    }
  };

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder="Select terms" />
      </SelectTrigger>
      <SelectContent>
        {PAYMENT_TERMS.map(t => (
          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { PAYMENT_TERMS };
