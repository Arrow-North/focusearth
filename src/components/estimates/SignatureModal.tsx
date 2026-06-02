import { useRef, useState, useLayoutEffect } from 'react';
import { X, Pencil, UploadCloud } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthorize: (signatureDataUrl: string | null, uploadedFile: File | null) => void;
}

export function SignatureModal({ isOpen, onClose, onAuthorize }: SignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }, [isOpen]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setUploadedFile(null);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setHasDrawing(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  const handleMouseEnter = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setUploadedFile(file);
    if (file) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        setHasDrawing(true);
      };
      img.src = URL.createObjectURL(file);
    }
  };

  const handleAuthorize = () => {
    const canvas = canvasRef.current;
    const signatureDataUrl = hasDrawing && canvas ? canvas.toDataURL('image/png') : null;
    onAuthorize(signatureDataUrl, uploadedFile);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg w-[850px] shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#7ab8d6] px-6 py-4 flex items-center justify-center relative">
          <h2 className="text-xl font-bold">Electronic Signature Authorization</h2>
          <button onClick={onClose} className="absolute right-6 hover:text-white/70">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-[10.5rem] py-[50px] flex flex-col gap-4">
          <p className="text-center text-xl">Create or upload an electronic signature:</p>

          {/* Draw signature canvas */}
          <div className="relative border border-gray-300 rounded overflow-hidden h-20">
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onMouseEnter={handleMouseEnter}
            />
            {!hasDrawing && (
              <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                <span className="text-slate-400">Write Signature</span>
                <Pencil className="h-4 w-4 text-slate-400" />
              </div>
            )}
            {hasDrawing && (
              <button
                onClick={clearSignature}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 z-10"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Upload signature */}
          <label className="flex items-center justify-between px-4 py-3 border border-gray-300 rounded cursor-pointer hover:bg-gray-50">
            <span className="text-slate-400 text-sm">
              Upload Signature
            </span>
            <UploadCloud className="h-4 w-4 text-slate-400" />
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>

          {/* Authorize */}
          <button
            onClick={handleAuthorize}
            className="w-full bg-[#2c628d] hover:bg-[#24527a] text-white font-bold py-3 rounded transition-colors"
          >
            Authorize
          </button>
        </div>
      </div>
    </div>
  );
}