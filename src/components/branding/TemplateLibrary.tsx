import { useState } from 'react';
import { templatePresets, categoryLabels, type TemplatePreset } from '@/data/templatePresets';
import { type BrandingTheme } from '@/hooks/useBrandingThemes';
import InvoiceLivePreview from './InvoiceLivePreview';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Eye, Download, Sparkles, Check, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  onApplyPreset: (theme: Partial<BrandingTheme>) => void;
}

const categories = ['all', ...Object.keys(categoryLabels)] as const;

export default function TemplateLibrary({ onApplyPreset }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewPreset, setPreviewPreset] = useState<TemplatePreset | null>(null);

  const filtered = selectedCategory === 'all'
    ? templatePresets
    : templatePresets.filter(p => p.category === selectedCategory);

  const handleApply = (preset: TemplatePreset) => {
    onApplyPreset(preset.theme);
    setPreviewPreset(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <LayoutGrid className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Template Library</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Choose a professionally designed template as a starting point. Customize it further in the editor.
          </p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize',
              selectedCategory === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {cat === 'all' ? 'All Templates' : categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Template grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(preset => (
          <TemplateCard
            key={preset.id}
            preset={preset}
            onPreview={() => setPreviewPreset(preset)}
            onApply={() => handleApply(preset)}
          />
        ))}
      </div>

      {/* Preview dialog */}
      <Dialog open={!!previewPreset} onOpenChange={() => setPreviewPreset(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {previewPreset && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ background: previewPreset.thumbnail }}
                  >
                    <span className="text-white text-sm font-bold">{previewPreset.name.charAt(0)}</span>
                  </div>
                  <div>
                    <DialogTitle className="text-lg">{previewPreset.name}</DialogTitle>
                    <DialogDescription>{previewPreset.description}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 mt-4">
                {/* Live preview */}
                <div className="border rounded-xl overflow-hidden bg-muted/30 p-4">
                  <InvoiceLivePreview theme={previewPreset.theme as BrandingTheme} />
                </div>

                {/* Details panel */}
                <div className="space-y-4">
                  <div className="rounded-xl border bg-card p-4 space-y-3">
                    <h4 className="text-sm font-semibold">Template Details</h4>
                    <div className="space-y-2 text-sm">
                      <DetailRow label="Font" value={previewPreset.theme.fontFamily} />
                      <DetailRow label="Font Size" value={`${previewPreset.theme.fontSize}pt`} />
                      <DetailRow label="Logo Position" value={previewPreset.theme.logoAlignment} />
                      <DetailRow label="Tax Display" value={previewPreset.theme.taxDisplay} />
                      <DetailRow label="Page Size" value={previewPreset.theme.pageSize} />
                      <DetailRow label="Show Item Code" value={previewPreset.theme.showItemCode ? 'Yes' : 'No'} />
                      <DetailRow label="Show Tax Column" value={previewPreset.theme.showTaxColumn ? 'Yes' : 'No'} />
                      <DetailRow label="QR Code" value={previewPreset.theme.showQrCode ? 'Yes' : 'No'} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg border" style={{ backgroundColor: previewPreset.theme.primaryColor }} />
                    <div className="h-8 w-8 rounded-lg border" style={{ backgroundColor: previewPreset.theme.accentColor }} />
                    <span className="text-xs text-muted-foreground ml-1">Color Palette</span>
                  </div>

                  <Button className="w-full gap-2" onClick={() => handleApply(previewPreset)}>
                    <Check className="h-4 w-4" /> Use This Template
                  </Button>
                  <Button variant="outline" className="w-full gap-2" onClick={() => {
                    const json = JSON.stringify(previewPreset.theme, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${previewPreset.id}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}>
                    <Download className="h-4 w-4" /> Export as JSON
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}

function TemplateCard({ preset, onPreview, onApply }: { preset: TemplatePreset; onPreview: () => void; onApply: () => void }) {
  return (
    <div className="group rounded-xl border bg-card overflow-hidden hover:border-primary/30 transition-all hover:shadow-md">
      {/* Thumbnail gradient */}
      <div
        className="h-32 relative cursor-pointer"
        style={{ background: preset.thumbnail }}
        onClick={onPreview}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-sm">
          <Button variant="secondary" size="sm" className="gap-1.5 shadow-lg">
            <Eye className="h-3.5 w-3.5" /> Preview
          </Button>
        </div>
        <Badge className="absolute top-3 right-3 bg-black/40 text-white border-0 capitalize text-[10px]">
          {categoryLabels[preset.category]}
        </Badge>
        {/* Mini color chips */}
        <div className="absolute bottom-3 left-3 flex gap-1.5">
          <div className="h-4 w-4 rounded-full border-2 border-white/30 shadow-sm" style={{ backgroundColor: preset.theme.primaryColor }} />
          <div className="h-4 w-4 rounded-full border-2 border-white/30 shadow-sm" style={{ backgroundColor: preset.theme.accentColor }} />
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-sm font-semibold mb-1">{preset.name}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{preset.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">{preset.theme.fontFamily} · {preset.theme.fontSize}pt</span>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onApply}>
            <Sparkles className="h-3 w-3" /> Use
          </Button>
        </div>
      </div>
    </div>
  );
}
