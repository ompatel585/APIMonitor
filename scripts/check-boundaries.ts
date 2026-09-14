import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const BACKEND_SRC = join(__dirname, '..', 'Backend', 'src');

type Rule = {
  fromPrefix: string;
  forbiddenSpecifiers: RegExp[];
  message: string;
};

// Matches only the module specifier of an actual import/require statement,
// e.g. `from '@modules/x'` or `require("../../modules/x")` — never an
// unrelated string literal (like a TypeORM entity glob) that merely contains
// the substring "modules/" or "workers/".
const IMPORT_STATEMENT = /(?:from\s+|require\()\s*['"]([^'"]+)['"]/g;

const RULES: Rule[] = [
  {
    fromPrefix: 'infrastructure/',
    forbiddenSpecifiers: [/^@modules\//, /\/modules\//, /^@workers\//, /\/workers\//],
    message: 'infrastructure/ must never import from modules/ or workers/',
  },
  {
    fromPrefix: 'common/',
    forbiddenSpecifiers: [/^@modules\//, /\/modules\//, /^@workers\//, /\/workers\//],
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
    const specifiers = [...content.matchAll(IMPORT_STATEMENT)].map((match) => match[1]);

    const hasViolation = specifiers.some((specifier) =>
      rule.forbiddenSpecifiers.some((pattern) => pattern.test(specifier ?? '')),
    );

    if (hasViolation) {
      violations.push(`${relPath}: ${rule.message}`);
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
