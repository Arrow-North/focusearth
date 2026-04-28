import { useRef, useState, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PenLine, Upload, X, Check } from 'lucide-react';

interface SignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (dataUrl: string) => void;
  title?: string;
  isAdmin?: boolean;
  existingSignature?: string | null;
}

type Mode = 'draw' | 'upload' | 'view';

export function SignatureModal({
  open,
  onOpenChange,
  onConfirm,
  title = 'Electronic Signature Authorization',
  isAdmin = false,
  existingSignature,
}: SignatureModalProps) {
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('draw');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const handleClear = useCallback(() => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
    }
    setUploadedImage(null);
    setIsDrawing(false);
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedImage(result);
      setMode('upload');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleConfirm = useCallback(() => {
    let dataUrl: string | null = null;

    if (mode === 'upload' && uploadedImage) {
      dataUrl = uploadedImage;
    } else if (mode === 'draw' && sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      dataUrl = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');
    }

    if (dataUrl) {
      onConfirm(dataUrl);
      handleClear();
      onOpenChange(false);
    }
  }, [mode, uploadedImage, onConfirm, onOpenChange, handleClear]);

  const handleClose = useCallback(() => {
    handleClear();
    onOpenChange(false);
  }, [handleClear, onOpenChange]);

  const canConfirm =
    (mode === 'upload' && uploadedImage) ||
    (mode === 'draw' && sigCanvasRef.current && !sigCanvasRef.current?.isEmpty());

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {isAdmin
              ? 'Create or upload your admin authorization signature.'
              : 'Create or upload an electronic signature to authorize this document.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Mode selector */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'draw' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setMode('draw');
                setUploadedImage(null);
              }}
            >
              <PenLine className="h-4 w-4 mr-2" />
              Draw
            </Button>
            <Button
              type="button"
              variant={mode === 'upload' ? 'default' : 'outline'}
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>

          {/* Signature area */}
          <div className="relative border border-border rounded-lg bg-white overflow-hidden">
            {mode === 'draw' && (
              <>
                <SignatureCanvas
                  ref={sigCanvasRef}
                  penColor="black"
                  canvasProps={{
                    width: 450,
                    height: 150,
                    className: 'w-full cursor-crosshair',
                    style: { touchAction: 'none' },
                  }}
                  onBegin={() => setIsDrawing(true)}
                />
                {!isDrawing && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground text-sm">
                    Draw your signature here
                  </div>
                )}
              </>
            )}

            {mode === 'upload' && uploadedImage && (
              <div className="h-[150px] flex items-center justify-center p-4">
                <img
                  src={uploadedImage}
                  alt="Uploaded signature"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}

            {/* Clear button */}
            {((mode === 'draw' && isDrawing) || (mode === 'upload' && uploadedImage)) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Existing signature display */}
          {existingSignature && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Current Signature:</Label>
              <div className="border border-border rounded-lg p-3 bg-muted/50">
                {existingSignature.startsWith('data:image') ? (
                  <img
                    src={existingSignature}
                    alt="Current signature"
                    className="h-12 object-contain"
                  />
                ) : (
                  <p className="italic font-medium">{existingSignature}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!canConfirm}>
            <Check className="h-4 w-4 mr-2" />
            Authorize
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
