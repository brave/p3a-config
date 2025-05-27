# P3A Remote Configuration Builder

Provides remote configuration for P3A metrics via the component updater.

## Usage

```bash
npm run build
```

Generates `dist/p3a_manifest.json` from YAML metric definitions in the `metrics/` directory. 

This manifest will be served to clients via the component updater.