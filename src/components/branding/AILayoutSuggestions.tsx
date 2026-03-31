import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import type { BrandingTheme } from '@/hooks/useBrandingThemes';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  currentTheme: BrandingTheme | null;
  onApplySuggestion: (updates: Partial<BrandingTheme>) => void;
}

const quickPrompts = [
  { label: 'Make it premium', prompt: 'Make this invoice template look more premium and luxury. Suggest elegant fonts, rich colors, and refined spacing.' },
  { label: 'Corporate & clean', prompt: 'Optimize this template for corporate clients. Make it professional, structured, and trust-worthy.' },
  { label: 'Reduce clutter', prompt: 'Simplify this template. Remove unnecessary elements, increase whitespace, and make it minimal.' },
  { label: 'Highlight totals', prompt: 'Make the totals section more prominent and visible. Suggest better visual hierarchy for the financial summary.' },
];

export default function AILayoutSuggestions({ currentTheme, onApplySuggestion }: Props) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestedUpdates, setSuggestedUpdates] = useState<Partial<BrandingTheme> | null>(null);

  const handleSubmit = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setSuggestion(null);
    setSuggestedUpdates(null);

    try {
      const themeContext = currentTheme
        ? `Current theme settings: font=${currentTheme.fontFamily}, fontSize=${currentTheme.fontSize}, primaryColor=${currentTheme.primaryColor}, accentColor=${currentTheme.accentColor}, logoAlignment=${currentTheme.logoAlignment}, showItemCode=${currentTheme.showItemCode}, showTaxColumn=${currentTheme.showTaxColumn}, showBankDetails=${currentTheme.showBankDetails}, showQrCode=${currentTheme.showQrCode}, watermark=${currentTheme.watermark || 'none'}`
        : 'No theme selected yet.';

      const { data, error } = await supabase.functions.invoke('ai-template-suggest', {
        body: { prompt: text, themeContext },
      });

      if (error) throw error;

      if (data?.suggestion) {
        setSuggestion(data.suggestion);
      }
      if (data?.updates) {
        setSuggestedUpdates(data.updates);
      }
    } catch (err: any) {
      if (err?.status === 429) {
        toast.error('Rate limit reached. Please try again in a moment.');
      } else if (err?.status === 402) {
        toast.error('AI credits exhausted. Please add funds in Settings > Workspace > Usage.');
      } else {
        toast.error('Failed to get AI suggestions');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-semibold">AI Layout Assistant</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Describe how you want your invoice to look and the AI will suggest design changes.
      </p>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-1.5">
        {quickPrompts.map(qp => (
          <button
            key={qp.label}
            onClick={() => { setPrompt(qp.prompt); handleSubmit(qp.prompt); }}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Custom prompt */}
      <div className="space-y-2">
        <Textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="e.g., 'Make it more modern with a dark blue primary color and show QR codes'"
          rows={3}
          className="text-sm"
        />
        <Button
          size="sm"
          className="gap-1.5 w-full"
          onClick={() => handleSubmit(prompt)}
          disabled={loading || !prompt.trim()}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
          {loading ? 'Analyzing...' : 'Get Suggestions'}
        </Button>
      </div>

      {/* Suggestion result */}
      {suggestion && (
        <div className="rounded-xl border bg-primary/5 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground whitespace-pre-line">{suggestion}</p>
          </div>
          {suggestedUpdates && (
            <Button
              size="sm"
              className="gap-1.5 w-full"
              onClick={() => {
                onApplySuggestion(suggestedUpdates);
                toast.success('AI suggestions applied to theme');
              }}
            >
              <Wand2 className="h-3.5 w-3.5" /> Apply Suggestions
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
