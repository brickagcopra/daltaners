import { useState, useRef, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useImportProducts, useDownloadTemplate, CsvImportResult } from '@/hooks/useImport';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ImportState = 'idle' | 'uploading' | 'complete' | 'error';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function CsvImportModal({ isOpen, onClose, onSuccess }: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importState, setImportState] = useState<ImportState>('idle');
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useImportProducts();
  const downloadMutation = useDownloadTemplate();

  const resetState = useCallback(() => {
    setFile(null);
    setImportState('idle');
    setResult(null);
    setErrorMessage('');
    setIsDragOver(false);
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const validateFile = (f: File): string | null => {
    if (!f.name.toLowerCase().endsWith('.csv')) {
      return 'Only CSV files are accepted.';
    }
    if (f.size > MAX_FILE_SIZE) {
      return `File is too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.`;
    }
    return null;
  };

  const handleFileSelect = (f: File) => {
    const error = validateFile(f);
    if (error) {
      setErrorMessage(error);
      setImportState('error');
      setFile(null);
      return;
    }
    setFile(f);
    setErrorMessage('');
    setImportState('idle');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleUpload = async () => {
    if (!file) return;

    setImportState('uploading');
    setErrorMessage('');

    try {
      const importResult = await importMutation.mutateAsync(file);
      setResult(importResult);
      setImportState('complete');
      if (importResult.successful > 0) {
        onSuccess();
      }
    } catch (err: unknown) {
      setImportState('error');
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setErrorMessage(
        axiosErr?.response?.data?.error?.message || axiosErr?.message || 'Import failed. Please try again.',
      );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Products from CSV" size="lg">
      <div className="space-y-5">
        {/* Download template */}
        <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50 p-3">
          <div>
            <p className="text-sm font-medium text-blue-900">Need a template?</p>
            <p className="text-xs text-blue-700">Download our CSV template with example data.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadMutation.mutate()}
            isLoading={downloadMutation.isPending}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Template
          </Button>
        </div>

        {/* Drag & drop zone */}
        {importState !== 'complete' && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
              isDragOver
                ? 'border-primary-400 bg-primary-50'
                : file
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
            {file ? (
              <>
                <svg className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-sm font-medium text-green-700">{file.name}</p>
                <p className="text-xs text-green-600">{(file.size / 1024).toFixed(1)} KB</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="mt-2 text-xs text-gray-500 underline hover:text-gray-700"
                >
                  Remove file
                </button>
              </>
            ) : (
              <>
                <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-medium text-primary-600">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500">CSV files only, max 5MB, up to 500 rows</p>
              </>
            )}
          </div>
        )}

        {/* Error message */}
        {importState === 'error' && errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        {/* Results */}
        {importState === 'complete' && result && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-gray-50 p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{result.total_rows}</p>
                <p className="text-xs text-gray-500">Total Rows</p>
              </div>
              <div className="rounded-lg border bg-green-50 p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{result.successful}</p>
                <p className="text-xs text-green-600">Imported</p>
              </div>
              <div className="rounded-lg border bg-red-50 p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{result.failed}</p>
                <p className="text-xs text-red-600">Failed</p>
              </div>
            </div>

            {/* Error details table */}
            {result.errors.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-gray-700">Import Errors</h4>
                <div className="max-h-48 overflow-auto rounded-lg border">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Row</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Field</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {result.errors.map((err, i) => (
                        <tr key={i}>
                          <td className="whitespace-nowrap px-3 py-2 text-gray-900">{err.row}</td>
                          <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-600">
                            {err.field}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t pt-4">
          <Button variant="outline" onClick={handleClose}>
            {importState === 'complete' ? 'Close' : 'Cancel'}
          </Button>
          {importState !== 'complete' && (
            <Button
              onClick={handleUpload}
              disabled={!file || importState === 'uploading'}
              isLoading={importState === 'uploading'}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload & Import
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
