import {createHash} from 'node:crypto';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(import.meta.dirname, '..');
const docsRoot = path.join(root, 'docs');
const i18nRoot = path.join(root, 'i18n');
const cachePath = path.join(root, '.translation-cache.json');
const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const force = args.has('--force');
const locales = [
  {code: 'en', name: 'English'},
];

await loadLocalEnv();

const model = process.env.OPENAI_TRANSLATION_MODEL || 'gpt-5-mini';
const sourceFiles = await listSourceFiles(docsRoot);
const sourceSet = new Set(sourceFiles);
const cache = await readCache();
const stale = [];

for (const relativePath of sourceFiles) {
  const source = await fs.readFile(path.join(docsRoot, relativePath), 'utf8');
  const sourceHash = sha256(source);

  for (const locale of locales) {
    const key = `${locale.code}/${relativePath}`;
    const targetPath = translatedPath(locale.code, relativePath);
    const targetExists = await exists(targetPath);
    if (force || !targetExists || cache.translations[key]?.sourceHash !== sourceHash) {
      stale.push({locale, relativePath, source, sourceHash, key, targetPath});
    }
  }
}

const removed = Object.keys(cache.translations).filter((key) => {
  const slash = key.indexOf('/');
  return slash > 0 && !sourceSet.has(key.slice(slash + 1));
});

if (checkOnly) {
  if (stale.length || removed.length) {
    console.error('Translations are not synchronized:');
    for (const item of stale) console.error(`- ${item.locale.code}: ${item.relativePath}`);
    for (const key of removed) console.error(`- remove orphan: ${key}`);
    process.exit(1);
  }
  console.log('Translations are synchronized with docs/.');
  process.exit(0);
}

if (!stale.length && !removed.length) {
  console.log('No Chinese document changes to translate.');
  process.exit(0);
}

if (stale.length && !process.env.OPENAI_API_KEY) {
  console.error(
    'OPENAI_API_KEY is missing. Copy .env.example to .env.local and add your API key.',
  );
  process.exit(1);
}

for (const item of stale) {
  console.log(`Translating ${item.relativePath} -> ${item.locale.code}...`);
  const translated = await translateFile(item);
  validateTranslation(item.relativePath, translated);
  await fs.mkdir(path.dirname(item.targetPath), {recursive: true});
  await fs.writeFile(item.targetPath, ensureFinalNewline(translated), 'utf8');
  cache.translations[item.key] = {
    sourceHash: item.sourceHash,
    model,
    translatedAt: new Date().toISOString(),
  };
  await writeCache(cache);
}

for (const key of removed) {
  const slash = key.indexOf('/');
  const locale = key.slice(0, slash);
  const relativePath = key.slice(slash + 1);
  const targetPath = translatedPath(locale, relativePath);
  if (await exists(targetPath)) {
    console.log(`Removing orphan translation ${key}...`);
    await fs.unlink(targetPath);
    await removeEmptyParents(path.dirname(targetPath), path.join(i18nRoot, locale));
  }
  delete cache.translations[key];
}

await writeCache(cache);
console.log(`Translation complete: ${stale.length} updated, ${removed.length} removed.`);

async function translateFile(item) {
  const instructions = [
    `Translate the supplied Docusaurus content from Simplified Chinese into ${item.locale.name}.`,
    'Return only the complete translated file, with no Markdown fence and no commentary.',
    'Preserve Markdown/MDX/JSON syntax, front matter delimiters, imports, JSX, admonition markers, code blocks, inline code, URLs, file paths, anchors, IDs, slugs, numeric values, and object keys.',
    'Translate reader-facing prose, headings, link labels, image alt text, and reader-facing values such as title, description, sidebar_label, label, and generated-index descriptions.',
    'Keep terminology natural and consistent for a polished French-learning reference site.',
  ].join(' ');

  const response = await requestWithRetry({
    model,
    store: false,
    instructions,
    input: `Source path: ${item.relativePath}\n\n${item.source}`,
  });
  const output = response.output_text || response.output
    ?.flatMap((entry) => entry.content || [])
    .filter((entry) => entry.type === 'output_text')
    .map((entry) => entry.text)
    .join('');

  if (!output?.trim()) throw new Error('OpenAI returned an empty translation.');
  return stripOuterFence(output.trim());
}

async function requestWithRetry(body) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok) {
        const message = json?.error?.message || `HTTP ${response.status}`;
        const error = new Error(message);
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
      }
      return json;
    } catch (error) {
      lastError = error;
      if (attempt === 3 || error.retryable === false) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  throw lastError;
}

async function listSourceFiles(directory, prefix = '') {
  const entries = await fs.readdir(directory, {withFileTypes: true});
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relativePath = path.posix.join(prefix, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listSourceFiles(absolutePath, relativePath));
    else if (/\.(md|mdx|json)$/i.test(entry.name)) files.push(relativePath);
  }
  return files;
}

async function loadLocalEnv() {
  const envPath = path.join(root, '.env.local');
  if (!(await exists(envPath))) return;
  const content = await fs.readFile(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1].startsWith('#') || process.env[match[1]]) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

async function readCache() {
  if (!(await exists(cachePath))) return {version: 1, translations: {}};
  const parsed = JSON.parse(await fs.readFile(cachePath, 'utf8'));
  return {version: 1, translations: parsed.translations || {}};
}

async function writeCache(cacheValue) {
  const sorted = Object.fromEntries(Object.entries(cacheValue.translations).sort());
  await fs.writeFile(
    cachePath,
    `${JSON.stringify({version: 1, translations: sorted}, null, 2)}\n`,
    'utf8',
  );
}

function translatedPath(locale, relativePath) {
  return path.join(i18nRoot, locale, 'docusaurus-plugin-content-docs', 'current', relativePath);
}

function validateTranslation(relativePath, content) {
  if (!content.trim()) throw new Error(`Empty translation for ${relativePath}`);
  if (relativePath.endsWith('.json')) JSON.parse(content);
  if (/\.mdx?$/i.test(relativePath)) {
    const fences = (content.match(/^```/gm) || []).length;
    if (fences % 2 !== 0) throw new Error(`Unbalanced code fences in ${relativePath}`);
  }
}

function stripOuterFence(content) {
  const match = content.match(/^```(?:markdown|md|mdx|json)?\s*\n([\s\S]*?)\n```$/i);
  return match ? match[1] : content;
}

function ensureFinalNewline(content) {
  return `${content.replace(/\s+$/, '')}\n`;
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function removeEmptyParents(directory, stopAt) {
  let current = directory;
  while (current.startsWith(stopAt) && current !== stopAt) {
    if ((await fs.readdir(current)).length) return;
    await fs.rmdir(current);
    current = path.dirname(current);
  }
}
