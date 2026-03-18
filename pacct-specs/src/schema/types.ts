import type { SpecId, Timestamp } from '@pacct/protocol-ts';
import type { SpecLifecycle } from '@pacct/protocol-ts';

export type SchemaFieldType = 'integer' | 'float' | 'boolean' | 'enum' | 'string_id';

export interface SchemaField {
  name: string;
  type: SchemaFieldType;
  required: boolean;
  description?: string;
  min?: number;
  max?: number;
  enumValues?: string[];
}

export interface SchemaSpec {
  specId: SpecId;
  lifecycle: SpecLifecycle;
  version: string;
  name: string;
  description?: string;
  fields: SchemaField[];
  identifierFieldName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
