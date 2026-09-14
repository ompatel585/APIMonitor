import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const OPENAPI_JSON_PATH = join(__dirname, '..', 'Backend', 'openapi.json');
const OUTPUT_PATH = join(__dirname, '..', 'Frontend', 'types', 'api', 'generated.ts');

function main(): void {
  if (!existsSync(OPENAPI_JSON_PATH)) {
    throw new Error(
      `${OPENAPI_JSON_PATH} not found. Start the backend API once to generate it before running this script.`,
    );
  }

  execFileSync('npx', ['openapi-typescript', OPENAPI_JSON_PATH, '-o', OUTPUT_PATH], {
    stdio: 'inherit',
  });
}

main();
