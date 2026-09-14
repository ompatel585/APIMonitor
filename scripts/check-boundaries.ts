import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const BACKEND_SRC = join(__dirname, '..', 'Backend', 'src');

type Rule = {
  fromPrefix: string;
  forbiddenImportPatterns: RegExp[];
  message: string;
};

const RULES: Rule[] = [
  {
    fromPrefix: 'infrastructure/',
    forbiddenImportPatterns: [/['"].*\/modules\//, /['"]@modules\//, /['"].*\/workers\//, /['"]@workers\//],
    message: 'infrastructure/ must never import from modules/ or workers/',
  },
  {
    fromPrefix: 'common/',
    forbiddenImportPatterns: [/['"].*\/modules\//, /['"]@modules\//, /['"].*\/workers\//, /['"]@workers\//],
    message: 'common/ must never import from modules/ or workers/',
  },
];

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, files);
    } else if (full.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

function main(): void {
  const violations: string[] = [];
  const files = walk(BACKEND_SRC);

  for (const file of files) {
    const relPath = relative(BACKEND_SRC, file).replace(/\\/g, '/');
    const rule = RULES.find((r) => relPath.startsWith(r.fromPrefix));
    if (!rule) continue;

    const content = readFileSync(file, 'utf-8');
    for (const pattern of rule.forbiddenImportPatterns) {
      if (pattern.test(content)) {
        violations.push(`${relPath}: ${rule.message}`);
        break;
      }
    }
  }

  if (violations.length > 0) {
    console.error('Boundary violations found:');
    for (const v of violations) {
      console.error(`  - ${v}`);
    }
    process.exit(1);
  }

  console.log('No boundary violations found.');
}

main();
