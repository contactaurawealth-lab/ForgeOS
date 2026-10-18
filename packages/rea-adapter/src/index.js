import { z } from 'zod';

export const ReaTargetTypeSchema = z.enum([
  'javascript_bundle',
  'web_application',
  'electron_app',
  'android_apk',
  'binary_native',
]);

export const ReaEvidenceItemSchema = z.object({
  id: z.string(),
  kind: z.enum(['route', 'component', 'api_endpoint', 'data_model', 'dependency']),
  name: z.string(),
  sourceLocation: z.string().optional(),
  confidence: z.number().min(0).max(1).default(1),
  rawPayload: z.record(z.unknown()).default({}),
});

export const ReaInspectionReportSchema = z.object({
  targetPath: z.string(),
  targetType: ReaTargetTypeSchema,
  analyzedAt: z.string(),
  engineVersion: z.string().default('6.7.0'),
  summary: z.string(),
  evidence: z.array(ReaEvidenceItemSchema),
});

/**
 * REA Adapter Interface for Phase 4
 */
export class ReaAdapter {
  constructor(options = {}) {
    this.options = options;
    this.reaBinaryPath = options.binaryPath || 'rea';
  }

  /**
   * Translates collected reverse-engineering evidence into a draft ForgeOS AppSpecification
   * @param {z.infer<typeof ReaInspectionReportSchema>} report
   * @returns {Record<string, unknown>}
   */
  translateToAppSpecification(report) {
    const validatedReport = ReaInspectionReportSchema.parse(report);

    const routes = validatedReport.evidence
      .filter(e => e.kind === 'route')
      .map((r, idx) => ({
        id: `route_${idx + 1}`,
        path: r.name.startsWith('/') ? r.name : `/${r.name}`,
        title: r.name.replace(/^\//, '') || 'Home',
        layout: 'default',
        rootComponent: {
          id: `root_comp_${idx + 1}`,
          type: 'Container',
          props: { padding: '24px' },
          children: [
            {
              id: `heading_${idx + 1}`,
              type: 'Heading',
              props: { level: 1, text: `${r.name} (Extracted via REA)` },
              children: [],
            },
          ],
        },
      }));

    if (routes.length === 0) {
      routes.push({
        id: 'route_default',
        path: '/',
        title: 'Extracted Application',
        layout: 'default',
        rootComponent: {
          id: 'root_default',
          type: 'Container',
          props: { padding: '24px' },
          children: [
            {
              id: 'heading_default',
              type: 'Heading',
              props: { level: 1, text: 'Reverse-Engineered Application' },
              children: [],
            },
          ],
        },
      });
    }

    return {
      schemaVersion: '1.0.0',
      metadata: {
        id: `extracted-${Date.now()}`,
        name: 'extracted-app',
        title: `Application Extracted from ${report.targetPath}`,
        description: report.summary,
        version: '1.0.0',
        author: 'REA Reverse Engineer Adapter',
        tags: ['reverse-engineered', 'rea', report.targetType],
      },
      theme: { mode: 'light' },
      routes,
      state: [],
      actions: [],
    };
  }
}
