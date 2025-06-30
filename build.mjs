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

const intermediateDefinitionSchema = z.lazy(() => z.discriminatedUnion('type', [
  timePeriodEventsIntermediateSchema,
  prefIntermediateSchema,
  probeIntermediateSchema,
  bucketIntermediateSchema,
  valueMapIntermediateSchema,
  percentageIntermediateSchema,
]));

// Schema for time_period_events intermediate
const timePeriodEventsIntermediateSchema = z.object({
  type: z.literal('time_period_events'),
  storage_key: z.string().min(1),
  period_days: z.number().positive(),
  replace_today: z.boolean().optional(),
  report_highest: z.boolean().optional(),
  add_histogram_value: z.boolean().optional(),
  sources: z.array(intermediateDefinitionSchema).optional(),
}).strict();

// Schema for pref intermediate
const prefIntermediateSchema = z.object({
  type: z.literal('pref'),
  pref_name: z.string().min(1),
  use_profile_prefs: z.boolean(),
}).strict();

// Schema for probe intermediate
const probeIntermediateSchema = z.object({
  type: z.literal('probe'),
  histogram_name: z.string().min(1),
  filter: z.array(z.number()).optional(),
}).strict();

// Schema for bucket intermediate
const bucketIntermediateSchema = z.object({
  type: z.literal('bucket'),
  source: intermediateDefinitionSchema,
  buckets: z.array(z.number()).min(1),
}).strict();

// Schema for value_map intermediate
const valueMapIntermediateSchema = z.object({
  type: z.literal('value_map'),
  source: intermediateDefinitionSchema,
  map: z.record(z.string(), z.any()).refine(
    (obj) => Object.keys(obj).length > 0,
    { error: "map must not be empty" }
  ),
}).strict();

// Schema for percentage intermediate
const percentageIntermediateSchema = z.object({
  type: z.literal('percentage'),
  numerator: intermediateDefinitionSchema,
  denominator: intermediateDefinitionSchema,
  multiplier: z.number().optional(),
}).strict();

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
  definition: intermediateDefinitionSchema.and(z.object({
    min_version: z.string().optional(),
  })).optional(),
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
