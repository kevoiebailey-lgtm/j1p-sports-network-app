import { UserRole } from '../types';

export interface CsvRawRow {
  [key: string]: string | undefined;
}

export interface ParsedMemberRecord {
  id: string;
  rowNumber: number;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone: string;
  role: UserRole;
  sport: string;
  graduationYear: string;
  teamName: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CsvImportProgress {
  status: 'idle' | 'parsing' | 'ready' | 'importing' | 'completed' | 'error';
  currentBatch: number;
  totalBatches: number;
  processedCount: number;
  totalCount: number;
  percentage: number;
  message: string;
}

export interface CsvImportSummary {
  fileName: string;
  fileSizeBytes: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedCount: number;
  failedCount: number;
  importedAt: string;
  records: ParsedMemberRecord[];
}
