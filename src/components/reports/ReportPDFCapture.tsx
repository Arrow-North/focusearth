import { useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PAGE_WIDTH_PX } from './pdfLayout';

interface Props {
  fileName: string;
  onDone: () => void;
  /** One or more ReportPDFPage-based components, stacked top to bottom — each is exactly one A4 page tall. */
  children: React.ReactNode;
}

/**
 * Renders report pages off-screen vertically, captures the stack in one 
 * html2canvas pass, and slices it cleanly into individual A4 pages using jsPDF.
 */
export function ReportPDFCapture({ fileName, onDone, children }: Props) {
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!captureRef.current) { onDone(); return; }
      try {
        // backgroundColor is explicit (not left to html2canvas's default) because
        // JPEG below has no alpha channel — any transparent pixel would render black.
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
          // JPEG instead of PNG: html2canvas output has anti-aliased text/gradient noise
          // that lossless PNG can't compress well — this is what was inflating file size.
          pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, pageW, sliceH);
          remaining -= sliceH;
          sourceY += sliceH;
          if (remaining > 0) pdf.addPage();
        }
        pdf.save(fileName);
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
