import { useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useEstimate } from '@/hooks/use-estimates';
import { OrderContentContainer } from './OrderContentContainer';
import type { EstimateTableType } from '@/types/database';

interface Props {
  estimateId: number;
  tableType: EstimateTableType;
  stage: string;
  onDone: () => void;
}

export function EstimatePDFCapture({ estimateId, tableType, stage, onDone }: Props) {
  const captureRef = useRef<HTMLDivElement>(null);
  const triggered = useRef(false);
  const { data: estimate, isLoading } = useEstimate(estimateId, tableType);

  useEffect(() => {
    if (isLoading || !estimate || triggered.current) return;
    triggered.current = true;

    const t = setTimeout(async () => {
      if (!captureRef.current) { onDone(); return; }
      try {
        const canvas = await html2canvas(captureRef.current, { scale: 2, useCORS: true });
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
          pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, sliceH);
          remaining -= sliceH;
          sourceY += sliceH;
          if (remaining > 0) pdf.addPage();
        }
        pdf.save(`${stage}-${estimate.reference ?? estimateId}.pdf`);
      } finally {
        onDone();
      }
    }, 800);

    return () => clearTimeout(t);
  }, [isLoading, estimate]);

  if (!estimate) return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: '-9999px',
        width: '1200px',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    >
      <OrderContentContainer
        ref={captureRef}
        content={stage}
        estimate={estimate}
        isSU={tableType === 'estimate'}
      />
    </div>
  );
}
