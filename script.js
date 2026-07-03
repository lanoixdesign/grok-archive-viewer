const fs = require('fs');
const vm = require('vm');
const path = require('path');

const filePath = path.resolve(__dirname, 'script.js');
const src = fs.readFileSync(filePath, 'utf8');

// Extract the function text by scanning braces
const fnStart = src.indexOf('function extractMediaFromBackend');
if (fnStart === -1) {
  console.error('extractMediaFromBackend not found');
  process.exit(2);
}
const braceOpen = src.indexOf('{', fnStart);
let i = braceOpen + 1;
let depth = 1;
while (i < src.length && depth > 0) {
  const ch = src[i];
  if (ch === '{') depth++;
  else if (ch === '}') depth--;
  i++;
}
const fnText = src.slice(fnStart, i);

const sandbox = { console };
const context = vm.createContext(sandbox);
try {
  vm.runInContext('const module = {}; ' + '\n' + fnText + '\n' + 'module.exports = extractMediaFromBackend;', context);
} catch (e) {
  console.error('Error compiling function:', e);
  process.exit(3);
}

const extractor = context.module ? context.module.exports : null;
if (!extractor) {
  console.error('Failed to load extractor');
  process.exit(4);
}

const samples = [
  {
    name: 'media_posts array',
    data: { media_posts: [ { id: 'p1', prompt: 'Hello', media_type: 'image', date: '2023-01-01' } ] }
  },
  {
    name: 'conversations with asset_ids',
    data: { conversations: [ { conversation: { title: 'Conv' }, responses: [ { asset_ids: ['a1','a2'], message: 'MSG', create_time: 1600000000000 } ] } ] }
  },
  {
    name: 'root array',
    data: [ { id: 'r1', prompt: 'Root', url: 'http://example.com/img.jpg' } ]
  }
];

let failed = false;
for (const s of samples) {
  try {
    const out = extractor(s.data);
    console.log('---', s.name, '->', Array.isArray(out) ? out.length + ' items' : typeof out);
    if (Array.isArray(out) && out.length > 0) console.log('  first:', out[0]);
  } catch (e) {
    console.error('Test failed for', s.name, e);
    failed = true;
  }
}
process.exit(failed ? 5 : 0);
