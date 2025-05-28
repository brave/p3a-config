import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { z } from 'zod/v4';

// Valid cadence values
const validCadences = ['typical', 'express', 'slow'];

// Valid attribute values
const validAttributes = [
  'answer_index',
  'version', 
  'yoi',
  'channel',
  'platform',
  'country_code',
  'woi',
  'general_platform',
  'region',
  'subregion',
  'ref',
  'dtoi',
  'dtoa'
];

// Schema for time_period_events definition
const timePeriodEventsSchema = z.object({
  type: z.literal('time_period_events'),
  period_days: z.number().positive(),
  histogram_name: z.string().min(1),
  storage_key: z.string().min(1),
  buckets: z.array(z.number()).min(1),
  report_max: z.boolean().optional(),
  add_histogram_value_to_storage: z.boolean().optional(),
  min_report_amount: z.number().optional(),
}).strict();

// Schema for pref definition
const prefSchema = z.object({
  type: z.literal('pref'),
  pref_name: z.string().min(1),
  value_map: z.record(z.string(), z.any()).refine(
    (obj) => Object.keys(obj).length > 0,
    { error: "value_map must not be empty" }
  ),
  use_profile_prefs: z.boolean().optional(),
}).strict();

// Union of all definition types
const definitionSchema = z.discriminatedUnion('type', [timePeriodEventsSchema, prefSchema]);

// Schema for the complete metric configuration
const metricSchema = z.object({
  ephemeral: z.boolean().optional(),
  constellation_only: z.boolean().optional(),
  nebula: z.boolean().optional(),
  disable_country_strip: z.boolean().optional(),
  attributes: z.array(z.enum(validAttributes)).optional(),
  append_attributes: z.array(z.enum(validAttributes)).optional(),
  record_activation_date: z.boolean().optional(),
  activation_metric_name: z.string().optional(),
  cadence: z.enum(validCadences).optional(),
  definition: definitionSchema.optional(),
}).strict().refine(
  (data) => {
    // If definition is present, cadence must also be present
    if (data.definition && !data.cadence) {
      return false;
    }
    return true;
  },
  {
    error: "cadence must be defined if definition is present",
    path: ["cadence"],
  }
);

const distDir = path.join(import.meta.dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Read all YAML files from the metrics directory
const metricsDir = path.join(import.meta.dirname, 'metrics');
const metricFiles = fs.readdirSync(metricsDir).filter(file => file.endsWith('.yaml'));

// Process each metric file and build the metrics object
const metrics = {};
let hasErrors = false;

for (const file of metricFiles) {
  const filePath = path.join(metricsDir, file);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  try {
    // Parse YAML
    const metricData = yaml.load(fileContent);
    
    // Use the filename without extension as the key
    const metricName = path.basename(file, '.yaml');
    
    // Validate the metric using Zod
    const result = metricSchema.safeParse(metricData);
    if (!result.success) {
      console.error(`Validation errors in ${file}:`);
      if (result.error && result.error.issues) {
        result.error.issues.forEach(error => {
          console.error(`  - ${error.message} at ${error.path.join('.')}`);
        });
      } else {
        console.error(`  - ${result.error}`);
      }
      hasErrors = true;
      continue;
    }
    
    // Add to metrics object
    metrics[metricName] = metricData;
  } catch (error) {
    console.error(`Error processing ${file}:`, error);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('Build failed due to validation errors');
  process.exit(1);
}

// Create the final manifest
const manifest = { metrics };

// Write to dist/p3a_manifest.json
const outputPath = path.join(distDir, 'p3a_manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(manifest));

console.log(`Generated p3a_manifest.json with ${Object.keys(metrics).length} metrics`);
