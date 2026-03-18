// Branded type utility
type Brand<T, B extends string> = T & { readonly __brand: B };

// Branded ID types
export type NodeId = Brand<string, 'NodeId'>;
export type NetworkId = Brand<string, 'NetworkId'>;
export type RunId = Brand<string, 'RunId'>;
export type SpecId = Brand<string, 'SpecId'>;
export type Hash = Brand<string, 'Hash'>;

// Timestamp as epoch milliseconds
export type Timestamp = number;

// Vote type
export type Vote = 'approve' | 'reject';
