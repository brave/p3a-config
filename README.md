# P3A Remote Configuration

Provides remote configuration for P3A metrics via the component updater.

## Usage

```bash
npm run build
```

Generates `dist/p3a_manifest.json` from YAML metric definitions in the `metrics/` directory. 

This manifest will be served to clients via the component updater.

## Metric Schema

Each YAML file in the `metrics/` directory defines a single metric configuration. The filename (without `.yaml` extension) becomes the metric name in the generated manifest.

### Top-level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ephemeral` | boolean | No | Whether the metric is ephemeral |
| `constellation_only` | boolean | No | Whether the metric is only reported via Constellation |
| `nebula` | boolean | No | Whether the metric uses Nebula |
| `disable_country_strip` | boolean | No | Whether to disable country stripping |
| `attributes` | array[string] | No | List of metric attributes to include |
| `append_attributes` | array[string] | No | List of metric attributes to append |
| `record_activation_date` | boolean | No | Whether to record activation date for the given metric |
| `activation_metric_name` | string | No | Name of the activation metric to use for reporting the date of activation |
| `cadence` | string | No* | Reporting cadence (required if `definition` is present) |
| `definition` | object | No | Metric definition object |

### Cadence Values

The `cadence` field must be one of:
- `typical` - Weekly reporting 
- `express` - Daily reporting  
- `slow` - Monthly reporting

### Valid Attributes

Both `attributes` and `append_attributes` arrays can only contain these values:
- `answer_index` - Answer index attribute
- `version` - Version attribute
- `yoi` - Year of install attribute
- `channel` - Channel attribute
- `platform` - Platform attribute
- `country_code` - Country code attribute
- `woi` - Week of install attribute
- `general_platform` - Generalized platform attribute
- `region` - Region attribute
- `subregion` - Subregion attribute
- `ref` - Ref code attribute
- `dtoi` - Date of install attribute
- `dtoa` - Date of activation attribute

### Definition Structure

The `definition` field uses a nested intermediate system where different intermediate types can be composed together. Each intermediate has a `type` field that determines its structure and behavior.

The root definition can also include an optional `min_version` field to specify the minimum browser version required for the metric.

### Intermediate Types

#### Time Period Events

Counts & reports events over a time period, optionally aggregating from multiple sources.

```yaml
type: time_period_events
storage_key: "example_key"        # Storage key (non-empty string)
period_days: 7                    # Number of days in the event period (positive integer)
replace_today: true               # Optional: whether to replace today's data
report_highest: false             # Optional: whether to report highest value
add_histogram_value: true         # Optional: add histogram value instead of count
sources:                          # Optional: array of source intermediates
  - type: probe
    histogram_name: "ExampleHistogram"
```

#### Pref

Reads preference values.

```yaml
type: pref
pref_name: "example.preference"   # Preference name (non-empty string)
use_profile_prefs: true           # Whether to use profile preferences
```

#### Probe

Captures histogram/probe events.

```yaml
type: probe
histogram_name: "ExampleHistogram" # Histogram name (non-empty string)
filter: [1, 2, 3]                  # Optional: array of bucket filters
```

#### Bucket

Groups values from a source intermediate into numeric buckets based on defined thresholds.

```yaml
type: bucket
buckets: [1, 5, 10, 50]          # Array of bucket values (at least one number)
source:                          # Source intermediate to bucket
  type: time_period_events
  # ... time_period_events fields
```

#### Value Map Intermediate

Maps values from a source intermediate using a lookup table.

```yaml
type: value_map
map:                             # Map of source values to output values (must not be empty)
  "enabled": 1
  "disabled": 0
source:                          # Source intermediate to map
  type: pref
  # ... pref fields
```

#### Percentage Intermediate

Calculates a percentage from numerator and denominator intermediates.

```yaml
type: percentage
multiplier: 1                    # Optional: multiplier for the percentage (default: 1)
numerator:                       # Numerator intermediate
  type: time_period_events
  # ... time_period_events fields
denominator:                     # Denominator intermediate
  type: time_period_events  
  # ... time_period_events fields
```


### Example Metric Configuration

```yaml
ephemeral: false
constellation_only: true
attributes:
  - "platform"
  - "version"
  - "country_code"
cadence: "typical"
definition:
  type: bucket
  buckets: [1, 3]
  min_version: "1.60.0"
  source:
    type: time_period_events
    period_days: 7
    storage_key: 'example'
    sources:
      - type: probe
        histogram_name: 'Brave.Core.ExampleProbe'
```
