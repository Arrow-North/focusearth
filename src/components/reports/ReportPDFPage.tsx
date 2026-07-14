import LogoIcon from '@/assets/LogoIconImage.png';
import { PAGE_WIDTH_PX, PAGE_HEIGHT_PX, formatDownloadDate } from './pdfLayout';

interface ReportPDFPageProps {
  title: string;
  companyName: string;
  pageNumber: number;
  children: React.ReactNode;
}

export function ReportPDFPage({ title, companyName, pageNumber, children }: ReportPDFPageProps) {
  return (
    <div
      className="bg-white p-10 font-sans flex flex-col"
      style={{ width: PAGE_WIDTH_PX, height: PAGE_HEIGHT_PX }}
    >
      <div className="flex items-center justify-between pb-4 border-b-2 border-gray-900 shrink-0">
        <img src={LogoIcon} alt="Focus Earth" className="h-14 object-contain" />
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      </div>

      <div className="py-6 flex-1 flex flex-col justify-between">{children}</div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-300 text-xs text-gray-600 shrink-0">
        <span>Downloaded: {formatDownloadDate(new Date())}</span>
        <span>{String(pageNumber).padStart(2, '0')}</span>
        <span>Information For: {companyName}</span>
      </div>
    </div>
  );
}
