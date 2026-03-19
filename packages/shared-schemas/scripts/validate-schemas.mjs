import { readFile } from 'node:fs/promises';

const schemaPath = new URL('../schemas/lens-evaluation.schema.json', import.meta.url);

async function main() {
  const raw = await readFile(schemaPath, 'utf8');
  const schema = JSON.parse(raw);

  if (!schema.required || !Array.isArray(schema.required)) {
    throw new Error('Schema missing required[] definition.');
  }

  if (schema.type !== 'object') {
    throw new Error('Schema root type must be object.');
  }

  console.log('shared-schemas: lens-evaluation schema check passed');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
