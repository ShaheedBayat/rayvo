import { useCallback, useState } from 'react';
import { Upload, X, FileText, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FileUploadProps {
  onUpload: (file: File) => Promise<any>;
  maxSizeMb?: number;
  accept?: string;
}

export default function FileUpload({ onUpload, maxSizeMb = 10, accept = '.pdf,.jpg,.jpeg,.png,.webp' }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`File too large. Max ${maxSizeMb}MB.`);
      return;
    }
    setUploading(true);
    const result = await onUpload(file);
    setUploading(false);
    if (result) toast.success(`${file.name} uploaded`);
    else toast.error('Upload failed');
  }, [onUpload, maxSizeMb]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
        dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
      }`}
    >
      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground mb-2">
        {uploading ? 'Uploading...' : 'Drag & drop or click to upload'}
      </p>
      <input
        type="file"
        accept={accept}
        className="hidden"
        id="file-upload-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
        disabled={uploading}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => document.getElementById('file-upload-input')?.click()}
      >
        Choose File
      </Button>
      <p className="text-[10px] text-muted-foreground mt-2">PDF, JPG, PNG up to {maxSizeMb}MB</p>
    </div>
  );
}
