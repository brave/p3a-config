const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Read all YAML files from the metrics directory
const metricsDir = path.join(__dirname, 'metrics');
const metricFiles = fs.readdirSync(metricsDir).filter(file => file.endsWith('.yaml'));

// Process each metric file and build the metrics object
const metrics = {};

for (const file of metricFiles) {
  const filePath = path.join(metricsDir, file);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  try {
    // Parse YAML
    const metricData = yaml.load(fileContent);
    
    // Use the filename without extension as the key
    const metricName = path.basename(file, '.yaml');
    
    // Add to metrics object
    metrics[metricName] = metricData;
  } catch (error) {
    console.error(`Error processing ${file}:`, error);
  }
}

// Create the final manifest
const manifest = { metrics };

// Write to dist/p3a_manifest.json
const outputPath = path.join(distDir, 'p3a_manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(manifest));

console.log(`Generated p3a_manifest.json with ${Object.keys(metrics).length} metrics`);
