import { createHash } from 'node:crypto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from 'esbuild';

// Transpile only in memory; never emit a function bundle or build artifacts.
const { code } = await transform(await readFile('netlify/functions/study.mts', 'utf8'), { loader: 'ts', format: 'cjs' });
function handler(result) {
  let payload;
  const table = { year: 'year', session: 'session', track: 'track' };
  const db = { select: () => ({ from: t => {
    assert.equal(t, table, 'chat must never load private notebook notes');
    return { orderBy: async () => [{ id: 'social-2014-1', year: 2014, session: 1, track: 'social', pageStart: 80, pageEnd: 83, questions: 'សំណួរ', answers: 'ចម្លើយ' }] };
  } }) };
  const modules = {
    'node:fs/promises': { readFile },
    '@google/genai': { GoogleGenAI: class { models = { generateContent: async p => { payload = p; return { text: JSON.stringify(result) }; } }; } },
    'drizzle-orm': Object.fromEntries(['eq', 'desc', 'asc', 'and', 'lt'].map(k => [k, x => x])),
    '../../db/index.js': { database: () => db },
    '../../db/schema.js': { publishedPapers: table, knowledge: {} },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => {
    assert.ok(id in modules, `Unexpected dependency ${id}`);
    return modules[id];
  }, module, module.exports);
  return { run: module.exports.default, payload: () => payload };
}
function request(action = 'chat', origin = 'https://example.test') {
  return new Request('https://example.test/api/study', { method: 'POST', headers: { origin }, body: JSON.stringify({ action, query: 'តើកម្ពុជាទទួលឯករាជ្យនៅពេលណា?', notebook: '12345678-1234-1234-1234-123456789abc' }) });
}
test('chat sends original PDF and published transcripts, then appends source pages', async () => {
  const h = handler({ supported: true, answer: 'ចម្លើយតាមឯកសារ', pages: [10, 10] });
  const response = await h.run(request());
  assert.equal(response.status, 200);
  assert.match((await response.json()).answer, /ទំព័រ 10$/);
  const payload = h.payload();
  const pdf = Buffer.from(payload.contents[0].parts[0].inlineData.data, 'base64');
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  assert.equal(pdf.length, 3352176);
  assert.equal(createHash('sha256').update(pdf).digest('hex'), 'f151fbc681d5f8c4cd3d8697830e3b379c80ae765e47a477d7dd5790336b2352', 'model must receive the verified Google Drive PDF');
  assert.match(payload.contents[0].parts[1].text, /social-2014-1/);
  assert.match(payload.config.systemInstruction, /Never substitute general knowledge/);
});
test('unsupported answers, missing citations, and out-of-range pages fail closed', async () => {
  for (const result of [
    { supported: false, answer: 'invented', pages: [10] },
    { supported: true, answer: 'invented', pages: [] },
    { supported: true, answer: 'invented', pages: [352] },
    { supported: true, answer: 'invented', pages: ['10'] },
    {},
  ]) {
    const response = await handler(result).run(request());
    const { answer } = await response.json();
    assert.match(answer, /រកមិនឃើញ/);
    assert.doesNotMatch(answer, /invented/);
  }
});
test('practice uses shared curriculum without requiring notebook notes', async () => {
  const h = handler({ supported: false, answer: '', pages: [] });
  assert.equal((await h.run(request('practice'))).status, 200);
  assert.match(h.payload().contents[0].parts[2].text, /practice paper/);
});
test('cross-origin requests never reach the model', async () => {
  const h = handler({});
  assert.equal((await h.run(request('chat', 'https://other.test'))).status, 403);
  assert.equal(h.payload(), undefined);
});
