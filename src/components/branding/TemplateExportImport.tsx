import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import type { BrandingTheme } from '@/hooks/useBrandingThemes';
import { toast } from 'sonner';

interface Props {
  themes: BrandingTheme[];
  onImport: (theme: Partial<BrandingTheme>) => void;
}

export default function TemplateExportImport({ themes, onImport }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = (theme: BrandingTheme) => {
    const { id, createdAt, ...exportable } = theme;
    const json = JSON.stringify(exportable, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${theme.name.replace(/\s+/g, '-').toLowerCase()}-theme.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported "${theme.name}"`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed.name || !parsed.fontFamily) {
          toast.error('Invalid template file');
          return;
        }
        onImport(parsed);
        toast.success(`Imported "${parsed.name}"`);
      } catch {
        toast.error('Failed to parse template file');
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Import / Export</h3>
          <p className="text-xs text-muted-foreground">Share templates as JSON files across tenants.</p>
        </div>
        <div>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Import Template
          </Button>
        </div>
      </div>

      {themes.length > 0 && (
        <div className="space-y-2">
          {themes.map(t => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2.5">
                <div className="h-6 w-6 rounded-md" style={{ backgroundColor: t.primaryColor }} />
                <span className="text-sm font-medium">{t.name}</span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => handleExport(t)}>
                <Download className="h-3 w-3" /> Export
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
