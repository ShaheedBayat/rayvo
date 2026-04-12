import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { currencySymbols, currencyLabels } from '@/types/invoice';
import type { Currency } from '@/types/invoice';

interface CurrencySelectProps {
  value: Currency;
  onChange: (value: Currency) => void;
  className?: string;
}

export default function CurrencySelect({ value, onChange, className }: CurrencySelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Currency)}>
      <SelectTrigger className={className || "h-9"}><SelectValue /></SelectTrigger>
      <SelectContent>
        {(Object.keys(currencyLabels) as Currency[]).map(code => (
          <SelectItem key={code} value={code}>
            {code} ({currencySymbols[code]})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
