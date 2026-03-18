export interface Dataset {
  id: string;
  name: string;
  networkId?: string;
  schemaSpecId?: string;
  rowCount: number;
  columnCount: number;
  columns: DatasetColumn[];
  importedAt: number;
  validatedAt?: number;
  validationStatus: 'pending' | 'valid' | 'invalid';
  validationErrors?: ValidationError[];
  sizeBytes: number;
}

export interface DatasetColumn {
  name: string;
  type: 'integer' | 'float' | 'boolean' | 'enum' | 'string_id';
  nullCount: number;
  uniqueCount: number;
  min?: number;
  max?: number;
  mean?: number;
  enumValues?: string[];
}

export interface DatasetRow {
  [fieldName: string]: string | number | boolean | null;
}

export interface DatasetImportResult {
  success: boolean;
  dataset?: Dataset;
  errors?: string[];
  warnings?: string[];
  rowCount: number;
  skippedRows: number;
}

export interface ValidationError {
  row?: number;
  column: string;
  code: string;
  message: string;
}
