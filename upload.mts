import parsePDF from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const fail = (error: string, status = 400) => Response.json({ error }, { status });

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (req.headers.get('origin') !== new URL(req.url).origin) return new Response('Forbidden', { status: 403 });
  if (Number(req.headers.get('content-length') || 0) > MAX_FILE_SIZE + 10000) return fail('ឯកសារត្រូវមានទំហំមិនលើស ៣ MB។', 413);
  try {
    // Bound the actual body even when Content-Length is absent or incorrect.
    const reader = req.body?.getReader();
    if (!reader) return fail('សូមជ្រើសរើសឯកសារ។');
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_FILE_SIZE + 10000) {
        await reader.cancel();
        return fail('ឯកសារត្រូវមានទំហំមិនលើស ៣ MB។', 413);
      }
      chunks.push(value);
    }
    const data = await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': req.headers.get('content-type') || '' } }).formData();
    const notebook = data.get('notebook');
    if (typeof notebook !== 'string' || !/^[a-f0-9-]{36}$/.test(notebook)) return fail('សូមផ្ទុកទំព័រឡើងវិញ។');
    const file = data.get('file');
    if (!(file instanceof File) || !file.size) return fail('សូមជ្រើសរើសឯកសារដែលមានខ្លឹមសារ។');
    if (file.size > MAX_FILE_SIZE) return fail('ឯកសារត្រូវមានទំហំមិនលើស ៣ MB។', 413);
    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name.split('.').pop()?.toLowerCase();
    let text: string;
    if (extension === 'pdf' && buffer.subarray(0, 5).toString() === '%PDF-') {
      text = (await parsePDF(buffer)).text;
    } else if (extension === 'docx' && buffer.subarray(0, 2).toString() === 'PK') {
      text = (await mammoth.extractRawText({ buffer })).value;
    } else if (extension === 'txt') {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      if (text.includes('\0')) return fail('សូមប្រើឯកសារអត្ថបទ TXT ជា UTF-8។');
    } else return fail('គាំទ្រតែឯកសារ PDF, DOCX និង TXT ប៉ុណ្ណោះ។');
    text = text.replace(/\0/g, '').trim();
    if (!text) return fail('មិនរកឃើញអត្ថបទក្នុងឯកសារ។ សម្រាប់ PDF ស្កេនជារូបភាព សូមបម្លែងជាអត្ថបទជាមុន ឬចម្លងអត្ថបទដោយផ្ទាល់។');
    return Response.json({ content: text }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return fail('មិនអាចអានឯកសារនេះបានទេ។ សូមពិនិត្យថាឯកសារមិនខូច មិនជាប់ពាក្យសម្ងាត់ និងប្រើ UTF-8 សម្រាប់ TXT។');
  }
};

export const config = { path: '/api/upload' };
