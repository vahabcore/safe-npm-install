import { readFileSync, writeFileSync } from 'node:fs';

const file = 'dist/cli.js';
const content = readFileSync(file, 'utf-8');

if (!content.startsWith('#!/usr/bin/env node')) {
    writeFileSync(file, `#!/usr/bin/env node\n${content}`);
}
