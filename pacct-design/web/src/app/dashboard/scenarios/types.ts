/**
 * Re-exports canonical scenario types from @runtimemax/schema
 * plus UI-only constants (colors, display helpers).
 */

import type { HttpMethod, ContentType, StepType } from "@loadtoad/schema";

export type {
  // Step type
  StepType,
  StepConfig,
  // HTTP / REST
  HttpMethod,
  Protocol,
  RestStepConfig,
  ScenarioStep,
  HeaderEntry,
  QueryParam,
  // Auth
  AuthConfig,
  AuthType,
  // Payload
  PayloadConfig,
  ContentType,
  KeyValuePair,
  MultipartField,
  GraphQLPayload,
  // GraphQL
  GraphQLStepConfig,
  GraphQLOperationType,
  // Browser
  BrowserStepConfig,
  BrowserAction,
  BrowserActionType,
  BrowserSelectorStrategy,
  BrowserWaitCondition,
  BrowserCookieOp,
  BrowserStorageOp,
  // Assertions & Extraction
  StepAssertion,
  Extraction,
  AssertionSource,
  AssertionOperator,
  ExtractionSource,
  // Think Time & Failure
  ThinkTimeConfig,
  ThinkTimeType,
  FailureConfig,
  FailureBehavior,
  BackoffStrategy,
  // Variables & Secrets
  Variable,
  SecretRef,
  VariableSource,
  ParamSource,
  // Scenario-level
  ScenarioAssertion,
  ScenarioMetadata,
  PolicyMode,
  Scenario,
  // Load Profile
  LoadProfile,
  LoadPatternConfig,
  LoadPatternType,
  RampConfig,
  RampCurve,
  DurationConfig,
  DurationType,
  DataSource,
  DataSourceType,
  CustomStage,
  RandomField,
  // Advanced
  AdvancedConfig,
  ConnectionConfig,
  ProtocolConfig,
  NetworkConfig,
  ObservabilityConfig,
  // SLO
  SloMetric,
  SloOperator,
  // Misc
  ApiKeyLocation,
  OAuthGrantType,
  MultipartFieldType,
  SyntheticFieldType,
} from "@loadtoad/schema";

export {
  // Step factories
  create_default_step,
  create_default_step_config,
  // Protocol config factories
  create_default_rest_config,
  create_default_graphql_config,
  create_default_browser_config,
  create_default_browser_action,
  create_default_browser_cookie_op,
  create_default_browser_storage_op,
  // Shared primitives
  create_default_header,
  create_default_query_param,
  create_default_multipart_field,
  create_default_step_assertion,
  create_default_extraction,
  create_default_auth,
  create_default_payload,
  create_default_think_time,
  create_default_failure,
  create_default_variable,
  create_default_secret_ref,
  create_default_scenario_assertion,
  // Load profile
  create_default_ramp,
  create_default_custom_stage,
  create_default_data_source,
  create_default_random_field,
  create_default_load_profile,
  // Advanced & Metadata & Scenario
  create_default_advanced,
  create_default_metadata,
  create_default_scenario,
} from "@loadtoad/schema";

// ─── UI-only constants ───────────────────────────────────────────────────

export const HTTP_METHODS: HttpMethod[] = [
  "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS",
];

export const BODY_CONTENT_TYPES: ContentType[] = [
  "json", "form_urlencoded", "multipart", "raw", "xml", "binary", "graphql",
];

export const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "var(--rm-pass)",
  POST: "var(--rm-signal)",
  PUT: "var(--rm-caution)",
  PATCH: "var(--rm-caution)",
  DELETE: "var(--rm-fail)",
  HEAD: "var(--rm-text-muted)",
  OPTIONS: "var(--rm-text-muted)",
};

export const STEP_TYPES: StepType[] = [
  "rest", "graphql", "browser",
];

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  rest: "REST",
  graphql: "GraphQL",
  browser: "Web Page",
};

export const STEP_TYPE_COLORS: Record<StepType, string> = {
  rest: "var(--rm-pass)",
  graphql: "var(--rm-stress)",
  browser: "var(--rm-signal)",
};
