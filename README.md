# P3A Remote Configuration Builder

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

### Definition Types

The `definition` field can be one of the following:

#### Time Period Events Definition

Counts & reports events from a given histogram.

```yaml
definition:
  type: time_period_events
  period_days: 7                    # Number of days in the event period (positive integer)
  histogram_name: "example_histogram" # Name of the histogram (non-empty string)
  storage_key: "example_key"        # Storage key (non-empty string)
  buckets: [1, 5, 10, 50]          # Array of bucket values (at least one number)
  report_max: true                  # Optional: whether to report daily maximum instead of count; add_histogram_value_to_storage
  add_histogram_value_to_storage: false # Optional: add histogram value to storage instead of adding 1
  min_report_amount: 10             # Optional: minimum amount to report
```

#### Preference Definition

```yaml
definition:
  type: pref
  pref_name: "example.preference"   # Preference name (non-empty string)
  value_map:                        # Map of pref values to metric answers (must not be empty)
    "enabled": 1
    "disabled": 0
  use_profile_prefs: true           # Optional: whether to use profile preferences instead of local state
```

### Example Metric Configuration

```yaml
# metrics/example_metric.yaml
ephemeral: false
constellation_only: true
attributes:
  - "platform"
  - "version"
  - "country_code"
cadence: "typical"
definition:
  type: "time_period_events"
  period_days: 7
  histogram_name: "ExampleHistogram"
  storage_key: "example_storage_key"
  buckets: [1, 5, 10, 25, 50]
  report_max: true
```