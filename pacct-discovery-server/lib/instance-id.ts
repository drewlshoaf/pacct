import { randomUUID } from 'crypto';

const INSTANCE_ID = process.env.INSTANCE_ID || randomUUID();

export function getInstanceId(): string {
  return INSTANCE_ID;
}
