import type { StorageAdapter } from '../persistence/storage-adapter';
import type { SchemaSpec } from '@pacct/specs';
import type { Dataset, DatasetRow, DatasetImportResult } from './types';
import type { DatasetValidationResult } from './validator';
import { parseCSV, parseJSON, inferColumnTypes } from './parser';
import { validateDataset } from './validator';
import type { DataRow } from '../computation/regression';

const DATASETS_COLLECTION = 'datasets';

function dataRowsKey(datasetId: string): string {
  return `dataset_rows:${datasetId}`;
}

export class DatasetManager {
  constructor(private storage: StorageAdapter) {}

  async importFromCSV(name: string, csvString: string): Promise<DatasetImportResult> {
    return this.importData(name, () => parseCSV(csvString), csvString.length);
  }

  async importFromJSON(name: string, jsonString: string): Promise<DatasetImportResult> {
    return this.importData(name, () => parseJSON(jsonString), jsonString.length);
  }

  private async importData(
    name: string,
    parse: () => { headers: string[]; rows: DatasetRow[] },
    sizeBytes: number
  ): Promise<DatasetImportResult> {
    try {
      const { headers, rows } = parse();
      if (headers.length === 0) {
        return { success: false, errors: ['No columns found in data'], rowCount: 0, skippedRows: 0 };
      }

      const columns = inferColumnTypes(headers, rows);
      const id = crypto.randomUUID();

      const dataset: Dataset = {
        id,
        name,
        rowCount: rows.length,
        columnCount: columns.length,
        columns,
        importedAt: Date.now(),
        validationStatus: 'pending',
        sizeBytes,
      };

      await this.storage.put(DATASETS_COLLECTION, dataset);
      await this.storage.set(dataRowsKey(id), JSON.stringify(rows));

      return {
        success: true,
        dataset,
        rowCount: rows.length,
        skippedRows: 0,
      };
    } catch (err) {
      return {
        success: false,
        errors: [err instanceof Error ? err.message : String(err)],
        rowCount: 0,
        skippedRows: 0,
      };
    }
  }

  async validateAgainstSchema(
    datasetId: string,
    schemaSpec: SchemaSpec
  ): Promise<DatasetValidationResult> {
    const dataset = await this.getDataset(datasetId);
    if (!dataset) {
      return {
        valid: false,
        errors: [{ column: '', code: 'DATASET_NOT_FOUND', message: `Dataset ${datasetId} not found` }],
        warnings: [],
        stats: { totalRows: 0, validRows: 0, invalidRows: 0 },
      };
    }

    const rows = await this.getDatasetRows(datasetId);
    const headers = dataset.columns.map((c) => c.name);
    return validateDataset(headers, rows, schemaSpec);
  }

  async getDataset(id: string): Promise<Dataset | null> {
    return this.storage.getById<Dataset>(DATASETS_COLLECTION, id);
  }

  async listDatasets(): Promise<Dataset[]> {
    return this.storage.getAll<Dataset>(DATASETS_COLLECTION);
  }

  async getDatasetRows(id: string): Promise<DatasetRow[]> {
    const raw = await this.storage.get(dataRowsKey(id));
    if (!raw) return [];
    return JSON.parse(raw);
  }

  async deleteDataset(id: string): Promise<void> {
    await this.storage.deleteById(DATASETS_COLLECTION, id);
    await this.storage.delete(dataRowsKey(id));
  }

  async getDatasetForComputation(
    datasetId: string,
    featureFields: string[],
    targetField: string
  ): Promise<DataRow[]> {
    const rows = await this.getDatasetRows(datasetId);
    const allFields = [...featureFields, targetField];

    return rows.map((row) => {
      const dataRow: DataRow = {};
      for (const field of allFields) {
        const val = row[field];
        if (typeof val === 'boolean') {
          dataRow[field] = val ? 1 : 0;
        } else if (typeof val === 'number') {
          dataRow[field] = val;
        } else if (val === null || val === undefined) {
          dataRow[field] = 0;
        } else {
          throw new Error(
            `Cannot convert non-numeric value "${val}" in field "${field}" for computation`
          );
        }
      }
      return dataRow;
    });
  }
}
