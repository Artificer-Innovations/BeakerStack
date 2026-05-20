import { z } from 'zod';
import type { ObservabilityConfig } from './types.js';

const exporterSchema = z.object({
  type: z.enum(['sentry', 'otlp']),
  endpoint: z.string().url().optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

const samplingSchema = z.object({
  traces: z.number().min(0).max(1).optional(),
  replayOnError: z.number().min(0).max(1).optional(),
  replay: z.number().min(0).max(1).optional(),
});

const piiSchema = z.object({
  captureUserEmail: z.boolean().optional(),
  captureIp: z.boolean().optional(),
  captureRequestBodies: z.boolean().optional(),
});

export const observabilityConfigSchema = z.object({
  project: z.string().min(1),
  environment: z.string().min(1),
  release: z.string().min(1).optional(),
  dsn: z.string().url().optional(),
  exporter: exporterSchema.optional(),
  sampling: samplingSchema.optional(),
  pii: piiSchema.optional(),
});

export function normalizeObservabilityConfig(
  config: ObservabilityConfig
): ObservabilityConfig {
  const { dsn: rawDsn, release: rawRelease, ...rest } = config;
  const dsn = rawDsn?.trim();
  const release = rawRelease?.trim();

  return {
    ...rest,
    environment: config.environment.trim(),
    ...(dsn ? { dsn } : {}),
    ...(release ? { release } : {}),
  };
}

export function validateConfig(config: ObservabilityConfig): void {
  const normalized = normalizeObservabilityConfig(config);
  observabilityConfigSchema.parse(normalized);

  if (normalized.exporter?.type === 'otlp') {
    throw new Error(
      'OTLP exporter is not supported in v1 — set exporter.type to "sentry" or remove the exporter field. ' +
        'OTLP support is tracked for a future release.'
    );
  }
}
