import { useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PAGE_WIDTH_PX } from './pdfLayout';

interface Props {
  fileName: string;
  onDone: () => void;
  // 'print' loads the PDF into a hidden iframe and triggers the browser's print dialog — no navigation, no new tab.
  mode?: 'download' | 'print';
  /** One or more ReportPDFPage-based components, stacked top to bottom — each is exactly one A4 page tall. */
  children: React.ReactNode;
}

/** Renders report pages off-screen, captures them in one html2canvas pass, and slices the result into A4 pages via jsPDF. */
export function ReportPDFCapture({ fileName, onDone, mode = 'download', children }: Props) {
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!captureRef.current) { onDone(); return; }
      try {
        // Explicit backgroundColor: JPEG has no alpha channel, so a transparent pixel would render black.
        const canvas = await html2canvas(captureRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgH = (canvas.height * pageW) / canvas.width;
        let remaining = imgH;
        let sourceY = 0;
        while (remaining > 0) {
          const sliceH = Math.min(remaining, pageH);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = (sliceH / pageW) * canvas.width;
          sliceCanvas
            .getContext('2d')!
            .drawImage(canvas, 0, sourceY * (canvas.width / pageW), canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
          // JPEG not PNG: anti-aliased noise from html2canvas compresses poorly as lossless PNG, inflating file size.
          pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, pageW, sliceH);
          remaining -= sliceH;
          sourceY += sliceH;
          if (remaining > 0) pdf.addPage();
        }
        if (mode === 'print') {
          const iframe = document.createElement('iframe');
          Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
          iframe.src = pdf.output('bloburl').toString();
          iframe.onload = () => iframe.contentWindow?.print();
          document.body.appendChild(iframe);
        } else {
          pdf.save(fileName);
        }
      } finally {
        onDone();
      }
    }, 800);

    return () => clearTimeout(t);
  }, []);

  return (
    <div
      aria-hidden
      style={{ position: 'fixed', top: 0, left: '-9999px', width: PAGE_WIDTH_PX, pointerEvents: 'none', zIndex: -1 }}
    >
      <div ref={captureRef} className="flex flex-col">
        {children}
      </div>
    </div>
  );
}
