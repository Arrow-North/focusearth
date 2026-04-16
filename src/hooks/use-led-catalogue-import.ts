import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { parseXlsmFile, validateXlsmFile } from '@/lib/led-import/xlsm-parser';
import {
  fetchAndUploadImage,
  buildStoragePath,
  createImportError,
} from '@/lib/led-import/image-fetcher';
import { DEFAULT_IMPORT_CONFIG } from '@/lib/led-import/constants';
import type {
  ImportPhase,
  ParsedSheet,
  ImportProgress,
  ImportError,
  ImportConfig,
  SheetSelection,
  ImportResult,
} from '@/types/led-import';
import { toast } from 'sonner';

interface UseLedCatalogueImportReturn {
  // State
  phase: ImportPhase;
  parsedSheets: ParsedSheet[];
  sheetSelection: SheetSelection;
  progress: ImportProgress;
  result: ImportResult | null;

  // Actions
  parseFile: (file: File) => Promise<boolean>;
  setSheetSelection: (selection: SheetSelection) => void;
  toggleSheet: (sheetName: string) => void;
  selectAllSheets: () => void;
  deselectAllSheets: () => void;
  startImport: () => Promise<void>;
  pauseImport: () => void;
  resumeImport: () => void;
  cancelImport: () => void;
  reset: () => void;
}

const initialProgress: ImportProgress = {
  phase: 'idle',
  currentSheet: null,
  currentOrderCode: null,
  sheetsCompleted: 0,
  sheetsTotal: 0,
  imagesCompleted: 0,
  imagesTotal: 0,
  errors: [],
};

export function useLedCatalogueImport(
  config: ImportConfig = DEFAULT_IMPORT_CONFIG
): UseLedCatalogueImportReturn {
  const { user } = useAuth();

  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [parsedSheets, setParsedSheets] = useState<ParsedSheet[]>([]);
  const [sheetSelection, setSheetSelection] = useState<SheetSelection>({});
  const [progress, setProgress] = useState<ImportProgress>(initialProgress);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Refs for pause/cancel control
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const startTimeRef = useRef<number>(0);

  /**
   * Parse an XLSM file
   */
  const parseFile = useCallback(async (file: File): Promise<boolean> => {
    // Validate file
    const validation = validateXlsmFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return false;
    }

    setPhase('parsing');
    setProgress(prev => ({ ...prev, phase: 'parsing' }));

    try {
      const sheets = await parseXlsmFile(file);

      if (sheets.length === 0) {
        toast.error('No valid sheets found in the file');
        setPhase('idle');
        setProgress(initialProgress);
        return false;
      }

      setParsedSheets(sheets);

      // Initialize selection - all sheets selected by default
      const selection: SheetSelection = {};
      sheets.forEach(sheet => {
        selection[sheet.name] = true;
      });
      setSheetSelection(selection);

      setPhase('previewing');
      setProgress(prev => ({ ...prev, phase: 'previewing' }));
      toast.success(`Parsed ${sheets.length} sheets with ${sheets.reduce((sum, s) => sum + s.rows.length, 0)} items`);

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse file';
      toast.error(message);
      setPhase('error');
      setProgress(prev => ({ ...prev, phase: 'error' }));
      return false;
    }
  }, []);

  /**
   * Toggle a single sheet selection
   */
  const toggleSheet = useCallback((sheetName: string) => {
    setSheetSelection(prev => ({
      ...prev,
      [sheetName]: !prev[sheetName],
    }));
  }, []);

  /**
   * Select all sheets
   */
  const selectAllSheets = useCallback(() => {
    const selection: SheetSelection = {};
    parsedSheets.forEach(sheet => {
      selection[sheet.name] = true;
    });
    setSheetSelection(selection);
  }, [parsedSheets]);

  /**
   * Deselect all sheets
   */
  const deselectAllSheets = useCallback(() => {
    const selection: SheetSelection = {};
    parsedSheets.forEach(sheet => {
      selection[sheet.name] = false;
    });
    setSheetSelection(selection);
  }, [parsedSheets]);

  /**
   * Start the import process
   */
  const startImport = useCallback(async () => {
    if (!user) {
      toast.error('You must be signed in to import');
      return;
    }

    const selectedSheets = parsedSheets.filter(s => sheetSelection[s.name]);
    if (selectedSheets.length === 0) {
      toast.error('Please select at least one sheet to import');
      return;
    }

    // Reset control flags
    isPausedRef.current = false;
    isCancelledRef.current = false;
    startTimeRef.current = Date.now();

    // Calculate totals
    let totalImages = 0;
    selectedSheets.forEach(sheet => {
      sheet.rows.forEach(row => {
        if (row.specificationsUrl) totalImages++;
        if (row.productImageUrl) totalImages++;
      });
    });

    setPhase('importing');
    setProgress({
      phase: 'importing',
      currentSheet: null,
      currentOrderCode: null,
      sheetsCompleted: 0,
      sheetsTotal: selectedSheets.length,
      imagesCompleted: 0,
      imagesTotal: totalImages,
      errors: [],
    });

    const errors: ImportError[] = [];
    let imagesCompleted = 0;
    let sheetsCompleted = 0;

    try {
      for (const sheet of selectedSheets) {
        if (isCancelledRef.current) break;

        setProgress(prev => ({
          ...prev,
          currentSheet: sheet.name,
        }));

        // Process each row
        for (const row of sheet.rows) {
          // Check for pause/cancel
          while (isPausedRef.current && !isCancelledRef.current) {
            await sleep(100);
          }

          if (isCancelledRef.current) break;

          setProgress(prev => ({
            ...prev,
            currentOrderCode: row.orderCode,
          }));

          // Process specifications URL
          if (row.specificationsUrl) {
            const path = buildStoragePath(
              user.id,
              sheet.name,
              row.orderCode,
              'specifications',
              row.specificationsUrl
            );

            const result = await fetchAndUploadImage(row.specificationsUrl, path);

            if (!result.success) {
              errors.push(
                createImportError(
                  row.orderCode,
                  sheet.name,
                  'specifications',
                  row.specificationsUrl,
                  result.error || 'Unknown error'
                )
              );
            }

            imagesCompleted++;
            setProgress(prev => ({
              ...prev,
              imagesCompleted,
              errors: [...errors],
            }));
          }

          // Process product image URL
          if (row.productImageUrl) {
            const path = buildStoragePath(
              user.id,
              sheet.name,
              row.orderCode,
              'product-image',
              row.productImageUrl
            );

            const result = await fetchAndUploadImage(row.productImageUrl, path);

            if (!result.success) {
              errors.push(
                createImportError(
                  row.orderCode,
                  sheet.name,
                  'product-image',
                  row.productImageUrl,
                  result.error || 'Unknown error'
                )
              );
            }

            imagesCompleted++;
            setProgress(prev => ({
              ...prev,
              imagesCompleted,
              errors: [...errors],
            }));
          }

          // Add batch delay to avoid overwhelming the server
          if (config.batchDelay > 0) {
            await sleep(config.batchDelay);
          }
        }

        sheetsCompleted++;
        setProgress(prev => ({
          ...prev,
          sheetsCompleted,
        }));
      }

      // Complete
      const duration = Date.now() - startTimeRef.current;
      const importResult: ImportResult = {
        success: !isCancelledRef.current,
        sheetsProcessed: sheetsCompleted,
        imagesUploaded: imagesCompleted - errors.length,
        errors,
        duration,
      };

      setResult(importResult);
      setPhase('completed');
      setProgress(prev => ({
        ...prev,
        phase: 'completed',
        currentSheet: null,
        currentOrderCode: null,
      }));

      if (errors.length > 0) {
        toast.warning(`Import completed with ${errors.length} errors`);
      } else {
        toast.success('Import completed successfully');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      toast.error(message);
      setPhase('error');
      setProgress(prev => ({ ...prev, phase: 'error' }));
    }
  }, [user, parsedSheets, sheetSelection, config.batchDelay]);

  /**
   * Pause the import
   */
  const pauseImport = useCallback(() => {
    isPausedRef.current = true;
    setPhase('paused');
    setProgress(prev => ({ ...prev, phase: 'paused' }));
  }, []);

  /**
   * Resume the import
   */
  const resumeImport = useCallback(() => {
    isPausedRef.current = false;
    setPhase('importing');
    setProgress(prev => ({ ...prev, phase: 'importing' }));
  }, []);

  /**
   * Cancel the import
   */
  const cancelImport = useCallback(() => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    isPausedRef.current = false;
    isCancelledRef.current = false;
    setPhase('idle');
    setParsedSheets([]);
    setSheetSelection({});
    setProgress(initialProgress);
    setResult(null);
  }, []);

  return {
    phase,
    parsedSheets,
    sheetSelection,
    progress,
    result,
    parseFile,
    setSheetSelection,
    toggleSheet,
    selectAllSheets,
    deselectAllSheets,
    startImport,
    pauseImport,
    resumeImport,
    cancelImport,
    reset,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
