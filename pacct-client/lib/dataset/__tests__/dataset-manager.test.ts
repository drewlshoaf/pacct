import { describe, it, expect, beforeEach } from 'vitest';
import { DatasetManager } from '../dataset-manager';
import { MemoryAdapter } from '../../persistence/memory-adapter';

let storage: MemoryAdapter;
let manager: DatasetManager;

beforeEach(() => {
  storage = new MemoryAdapter();
  manager = new DatasetManager(storage);
});

describe('DatasetManager', () => {
  const sampleCSV = 'id,age,score\np1,30,95.5\np2,25,88.0\np3,40,72.3';
  const sampleJSON = JSON.stringify([
    { id: 'p1', age: 30, score: 95.5 },
    { id: 'p2', age: 25, score: 88.0 },
    { id: 'p3', age: 40, score: 72.3 },
  ]);

  it('imports CSV and creates dataset', async () => {
    const result = await manager.importFromCSV('Test Dataset', sampleCSV);
    expect(result.success).toBe(true);
    expect(result.dataset).toBeDefined();
    expect(result.dataset!.name).toBe('Test Dataset');
    expect(result.dataset!.rowCount).toBe(3);
    expect(result.dataset!.columnCount).toBe(3);
    expect(result.rowCount).toBe(3);
  });

  it('imports JSON and creates dataset', async () => {
    const result = await manager.importFromJSON('JSON Dataset', sampleJSON);
    expect(result.success).toBe(true);
    expect(result.dataset).toBeDefined();
    expect(result.dataset!.rowCount).toBe(3);
  });

  it('lists all datasets', async () => {
    await manager.importFromCSV('Dataset 1', sampleCSV);
    await manager.importFromCSV('Dataset 2', sampleCSV);
    const datasets = await manager.listDatasets();
    expect(datasets).toHaveLength(2);
  });

  it('gets dataset by ID', async () => {
    const result = await manager.importFromCSV('Test', sampleCSV);
    const dataset = await manager.getDataset(result.dataset!.id);
    expect(dataset).toBeDefined();
    expect(dataset!.name).toBe('Test');
  });

  it('returns null for nonexistent dataset', async () => {
    const dataset = await manager.getDataset('nonexistent');
    expect(dataset).toBeNull();
  });

  it('deletes dataset', async () => {
    const result = await manager.importFromCSV('Test', sampleCSV);
    await manager.deleteDataset(result.dataset!.id);
    const dataset = await manager.getDataset(result.dataset!.id);
    expect(dataset).toBeNull();
    const rows = await manager.getDatasetRows(result.dataset!.id);
    expect(rows).toHaveLength(0);
  });

  it('gets dataset rows', async () => {
    const result = await manager.importFromCSV('Test', sampleCSV);
    const rows = await manager.getDatasetRows(result.dataset!.id);
    expect(rows).toHaveLength(3);
    expect(rows[0].id).toBe('p1');
  });

  it('getDatasetForComputation extracts and converts fields', async () => {
    const result = await manager.importFromCSV('Test', sampleCSV);
    const dataRows = await manager.getDatasetForComputation(
      result.dataset!.id,
      ['age'],
      'score'
    );
    expect(dataRows).toHaveLength(3);
    expect(dataRows[0]).toEqual({ age: 30, score: 95.5 });
    expect(typeof dataRows[0].age).toBe('number');
  });

  it('getDatasetForComputation converts booleans to 0/1', async () => {
    const csv = 'id,flag,val\np1,true,10\np2,false,20';
    const result = await manager.importFromCSV('Bool Test', csv);
    const dataRows = await manager.getDatasetForComputation(
      result.dataset!.id,
      ['flag'],
      'val'
    );
    expect(dataRows[0].flag).toBe(1);
    expect(dataRows[1].flag).toBe(0);
  });

  it('getDatasetForComputation throws on string values', async () => {
    const csv = 'id,name,val\np1,Alice,10';
    const result = await manager.importFromCSV('Str Test', csv);
    await expect(
      manager.getDatasetForComputation(result.dataset!.id, ['name'], 'val')
    ).rejects.toThrow('Cannot convert non-numeric value');
  });
});
