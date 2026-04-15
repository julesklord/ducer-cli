const fs = require('fs');
let content = fs.readFileSync('packages/core/src/services/sandboxManager.ts', 'utf8');
content = content.replace('Array<T>', 'T[]');
fs.writeFileSync('packages/core/src/services/sandboxManager.ts', content);
