const $ = (id) => document.getElementById(id);
const dialog = $('admin-modal');
let notebook;
try {
  notebook = localStorage.getItem('history-notebook');
  if (!notebook || !/^[a-f0-9-]{36}$/.test(notebook)) {
    notebook = crypto.randomUUID();
    localStorage.setItem('history-notebook', notebook);
  }
} catch { notebook = crypto.randomUUID(); }
let busy = false;
function scrollChat() { $('chat-container').scrollTop = $('chat-container').scrollHeight; }
function message(text, role, extra = '') {
  const row = document.createElement('article');
  row.className = `message ${role} ${extra}`;
  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = role === 'user' ? 'សិស្ស' : 'ទដ';
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  row.append(avatar, bubble);
  $('messages').append(row);
  scrollChat();
  return row;
}
async function api(data) {
  const response = await fetch('/api/study', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...data, notebook }), signal: AbortSignal.timeout(60000),
  });
  if (response.status === 401) throw new Error('ការចូលប្រើគេហទំព័របានផុតកំណត់។ សូមចម្លងអត្ថបទទុក រួចផ្ទុកទំព័រឡើងវិញ និងចូល Netlify ម្ដងទៀត។');
  if (response.status === 403) throw new Error('សំណើត្រូវបានបដិសេធ។ សូមចម្លងអត្ថបទទុក ហើយបើកគេហទំព័រដោយផ្ទាល់ រួចសាកល្បងម្ដងទៀត។');
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(response.status === 413
    ? 'ទិន្នន័យធំពេកសម្រាប់ការផ្ញើមួយលើក។ សូមបែងចែកអត្ថបទជាផ្នែកតូចៗ រួចរក្សាទុកម្ដងទៀត។'
    : result?.error || 'រក្សាទុកមិនបានទេ។ សូមព្យាយាមម្ដងទៀត។');
  if (!result) throw new Error('ម៉ាស៊ីនមេមិនបានបញ្ជាក់ការរក្សាទុកទេ។ អត្ថបទរបស់អ្នកនៅតែមាន។ សូមព្យាយាមម្ដងទៀត។');
  return result;
}
for (const id of ['close-admin', 'cancel-admin']) $(id).addEventListener('click', () => dialog.close());
let readingFile = false;
$('read-file').addEventListener('click', async () => {
  if (readingFile) return;
  const file = $('reference-file').files[0];
  const status = $('upload-status');
  if (!file) { status.textContent = 'សូមជ្រើសរើសឯកសារជាមុន។'; return; }
  if (!/\.(pdf|docx|txt)$/i.test(file.name)) { status.textContent = 'គាំទ្រតែ PDF, DOCX និង TXT ប៉ុណ្ណោះ។'; return; }
  if (!file.size || file.size > 3 * 1024 * 1024) { status.textContent = 'ឯកសារត្រូវមានខ្លឹមសារ និងទំហំមិនលើស ៣ MB។'; return; }
  if ($('admin-text').value.trim()) { status.textContent = 'សូមរក្សាទុក ឬលុបអត្ថបទដែលមានស្រាប់ជាមុន រួចផ្ញើឯកសារថ្មី។'; return; }
  readingFile = true;
  $('read-file').disabled = $('save').disabled = $('reference-file').disabled = $('admin-text').disabled = true;
  $('save-status').textContent = '';
  status.textContent = 'កំពុងផ្ញើ និងអានឯកសារ...';
  try {
    const data = new FormData();
    data.append('file', file);
    data.append('notebook', notebook);
    const response = await fetch('/api/upload', { method: 'POST', body: data, signal: AbortSignal.timeout(60000) });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error || 'ផ្ញើឯកសារមិនបានទេ។ សូមព្យាយាមម្ដងទៀត។');
    $('admin-text').value = result.content;
    status.textContent = 'បានអានឯកសារ។ សូមពិនិត្យអត្ថបទខាងក្រោម រួចចុចរក្សាទុកជាកំណត់ត្រាផ្ទាល់ខ្លួន។';
  } catch (error) {
    status.textContent = error.name === 'TimeoutError' ? 'ការផ្ញើចំណាយពេលយូរពេក។ សូមព្យាយាមម្ដងទៀត។' : error.message;
  } finally {
    readingFile = false;
    $('read-file').disabled = $('save').disabled = $('reference-file').disabled = $('admin-text').disabled = false;
  }
});
$('knowledge-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (readingFile || $('save').disabled) return;
  const content = $('admin-text').value.trim();
  if (!content) return;
  const category = $('reference-category').value;
  const title = $('exam-title').value.trim();
  const year = $('exam-year').value.trim().replace(/[០-៩]/g, digit => String('០១២៣៤៥៦៧៨៩'.indexOf(digit)));
  $('save').disabled = true;
  $('reference-category').disabled = $('exam-title').disabled = $('exam-year').disabled = true;
  $('read-file').disabled = true;
  $('admin-text').readOnly = true;
  $('save-status').textContent = 'កំពុងរក្សាទុក...';
  try {
    const result = await api({ action: 'save', content, category, title, year });
    if (result.saved !== true) throw new Error('មិនទាន់ទទួលបានការបញ្ជាក់ការរក្សាទុក។ សូមព្យាយាមម្ដងទៀត។');
    $('admin-text').value = '';
    $('reference-file').value = '';
    if (category === 'exam') {
      $('exam-title').value = $('exam-year').value = '';
    }
    $('upload-status').textContent = '';
    $('save-status').textContent = category === 'exam'
      ? 'បានបន្ថែមខ្លឹមសារក្នុងបណ្ដុំវិញ្ញាសា។ បិទផ្ទាំងនេះ ដើម្បីអានវិញ្ញាសាដែលបានរក្សាទុក។'
      : 'បានរក្សាទុកជាកំណត់ត្រាផ្ទាល់ខ្លួន។ ប្រភពចម្លើយ AI នៅតែជាកម្រងខ្លឹមសារដែលបានផ្ដល់។';
  } catch (error) { $('save-status').textContent = error.name === 'TimeoutError'
    ? 'ការរក្សាទុកចំណាយពេលយូរពេក។ សូមពិនិត្យអ៊ីនធឺណិត ហើយព្យាយាមម្ដងទៀត។'
    : error.message; }
  finally {
    $('save').disabled = false;
    $('reference-category').disabled = false;
    $('read-file').disabled = false;
    $('admin-text').readOnly = false;
    categoryChanged();
  }
});
async function sendQuestion() {
  if (busy) return;
  const query = $('user-input').value.trim();
  if (!query) return;
  busy = true;
  $('send').disabled = true;
  document.querySelectorAll('[data-query]').forEach(b => b.disabled = true);
  message(query, 'user');
  $('user-input').value = '';
  const pending = message('កំពុងរៀបចំចម្លើយ...', 'assistant', 'pending');
  try {
    const data = await api({ action: 'chat', query });
    pending.remove();
    message(data.answer, 'assistant');
  } catch {
    pending.remove();
    message('មិនអាចទទួលចម្លើយបានទេ។ សូមពិនិត្យអ៊ីនធឺណិត ហើយបញ្ជូនសំណួរម្ដងទៀត។', 'assistant', 'error');
    if (!$('user-input').value) $('user-input').value = query;
  } finally {
    busy = false;
    $('send').disabled = false;
    document.querySelectorAll('[data-query]').forEach(b => b.disabled = false);
    $('user-input').focus();
  }
}
$('chat-form').addEventListener('submit', e => { e.preventDefault(); sendQuestion(); });
document.querySelectorAll('[data-query]').forEach(button => button.addEventListener('click', () => {
  if (busy) return;
  $('user-input').value = button.dataset.query;
  sendQuestion();
}));

function showView(name) {
  document.querySelectorAll('.view').forEach(view => { view.hidden = view.id !== `view-${name}`; });
  document.querySelectorAll('[data-view]').forEach(button => {
    if (button.dataset.view === name) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (name === 'archive') loadLibrary();
  const heading = $(`${name}-heading`);
  if (heading) heading.focus();
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
function categoryChanged() {
  const exam = $('reference-category').value === 'exam';
  $('exam-fields').hidden = !exam;
  $('exam-title').required = $('exam-year').required = exam;
  $('exam-title').disabled = $('exam-year').disabled = !exam;
  $('modal-title').textContent = exam ? 'បន្ថែមខ្លឹមសារវិញ្ញាសា' : 'បន្ថែមឯកសារយោង';
  $('content-label').textContent = exam ? 'ខ្លឹមសារវិញ្ញាសា (វាយអត្ថបទ ឬបញ្ចូលពីឯកសារ)' : 'ពិនិត្យ និងកែអត្ថបទមុនរក្សាទុក';
  $('save').textContent = exam ? 'រក្សាទុកក្នុងបណ្ដុំវិញ្ញាសា' : 'រក្សាទុកទិន្នន័យ';
}
$('reference-category').addEventListener('change', categoryChanged);
categoryChanged();
$('practice-form').addEventListener('submit', async event => {
  event.preventDefault();
  if ($('generate-practice').disabled) return;
  $('generate-practice').disabled = true;
  $('practice-status').textContent = 'កំពុងរៀបចំសំណួរ និងចម្លើយតាមឯកសារយោង...';
  try {
    const data = await api({ action: 'practice', query: $('practice-topic').value.trim() });
    $('practice-result').textContent = data.answer;
    $('practice-result').hidden = false;
    $('practice-status').textContent = 'បានបង្កើតសំណួរហាត់។ សូមសាកល្បងឆ្លើយជាមុន រួចផ្ទៀងផ្ទាត់នឹងចម្លើយណែនាំ។';
  } catch (error) { $('practice-status').textContent = error.message; }
  finally { $('generate-practice').disabled = false; }
});

// Read-only source library, separate from private notebook uploads.
function khmerNumber(value) {
  return String(value).replace(/[0-9]/g, digit => '០១២៣៤៥៦៧៨៩'[Number(digit)]);
}
let libraryPapers = [];
let libraryBusy = false;
let libraryLoaded = false;
let libraryFailed = false;
for (let year = 2014; year <= 2026; year++) {
  const option = document.createElement('option');
  option.value = String(year);
  option.textContent = khmerNumber(year);
  $('library-year').append(option);
}
function renderLibrary() {
  for (const article of document.querySelectorAll('.featured-transcript')) {
    article.hidden = !(
      ['all', article.dataset.year].includes($('library-year').value) &&
      ['all', article.dataset.track].includes($('library-track').value)
    );
  }
  if (!libraryLoaded) {
    $('library-list').replaceChildren();
    $('library-status').textContent = libraryFailed
      ? 'មិនអាចផ្ទុកបញ្ជីវិញ្ញាសាបន្ថែមបាន។ ខ្លឹមសារដែលបានបញ្ចូលនៅលើទំព័រនេះនៅតែអាចអានបាន ដោយជ្រើសឆ្នាំ និងផ្នែកសិក្សាដែលត្រូវគ្នា។ សូមចុចផ្ទុកឡើងវិញ ដើម្បីសាកល្បងបញ្ជីម្ដងទៀត។'
      : 'កំពុងផ្ទុកបណ្ដុំសំណួរ និងចម្លើយ...';
    return;
  }
  const selectedYear = $('library-year').value;
  const selectedTrack = $('library-track').value;
  $('library-list').replaceChildren();
  let count = 0;
  for (let year = 2014; year <= 2026; year++) {
    if (selectedYear !== 'all' && Number(selectedYear) !== year) continue;
    const papers = libraryPapers.filter(paper => Number(paper.year) === year && (selectedTrack === 'all' || paper.track === selectedTrack));
    const section = document.createElement('section');
    section.className = `library-year year-tone-${year - 2014}`;
    const heading = document.createElement('h3');
    heading.textContent = `ឆ្នាំ ${khmerNumber(year)}`;
    section.append(heading);
    const grid = document.createElement('div');
    grid.className = 'source-grid';
    for (const paper of papers) {
      count++;
      const card = document.createElement('article');
      card.className = 'source-card';
      const track = document.createElement('span');
      track.className = `track-badge track-${paper.track}`;
      track.textContent = paper.track === 'social' ? 'វិទ្យាសាស្ត្រសង្គម' : 'វិទ្យាសាស្ត្រពិត';
      const title = document.createElement('h4');
      title.textContent = `ប្រវត្តិវិទ្យា ${khmerNumber(year)}${year === 2014 ? ` · លើកទី${khmerNumber(paper.session)}` : ''}`;
      const pages = document.createElement('p');
      pages.textContent = `សំណួរ និងចម្លើយ · ទំព័រ ${khmerNumber(paper.pageStart)}–${khmerNumber(paper.pageEnd)}`;
      const button = document.createElement('button');
      button.type = 'button';
      const hasText = Boolean(paper.questions && paper.answers);
      button.textContent = hasText ? 'អានសំណួរ និងចម្លើយជាអត្ថបទ' : 'អានសំណួរ និងចម្លើយ ↗';
      button.setAttribute('aria-label', `${button.textContent} · ${title.textContent} · ${track.textContent}`);
      button.addEventListener('click', () => {
        $('source-title').textContent = `${title.textContent} · ${track.textContent}`;
        $('source-pages').textContent = `ទំព័រ ${khmerNumber(paper.pageStart)}–${khmerNumber(paper.pageEnd)} ក្នុងឯកសារយោងដើម។ សំណួរ និងចម្លើយរក្សាតាម PDF ដោយមិនកែសម្រួល។`;
        $('source-open').href = paper.pdfPath;
        $('source-download').href = paper.pdfPath;
        $('source-text').hidden = !hasText;
        $('source-frame').hidden = hasText;
        $('source-dialog').classList.toggle('has-transcript', hasText);
        $('source-questions').textContent = hasText ? paper.questions : '';
        $('source-answers').textContent = hasText ? paper.answers : '';
        $('source-pages').textContent = hasText
          ? `អត្ថបទដែលបានផ្ដល់បន្ថែមសម្រាប់វិញ្ញាសានេះ។ PDF ដើម៖ ទំព័រ ${khmerNumber(paper.pageStart)}–${khmerNumber(paper.pageEnd)}។`
          : $('source-pages').textContent;
        if (hasText) $('source-frame').removeAttribute('src');
        else $('source-frame').src = `${paper.pdfPath}#view=FitH`;
        $('source-frame').title = `${title.textContent} · ${track.textContent} · សំណួរ និងចម្លើយ`;
        $('source-dialog').showModal();
        $('close-source').focus();
      });
      card.append(track, title, pages, button);
      grid.append(card);
    }
    if (!papers.length) {
      const empty = document.createElement('p');
      empty.className = 'source-empty';
      empty.textContent = year === 2020 ? 'មិនមានវិញ្ញាសាឆ្នាំ២០២០ ក្នុងឯកសារយោងដែលបានផ្ដល់ទេ។' : 'មិនមានវិញ្ញាសាសម្រាប់ជម្រើសនេះក្នុងឯកសារយោងទេ។';
      grid.append(empty);
    }
    section.append(grid);
    $('library-list').append(section);
  }
  $('library-status').textContent = `បង្ហាញវិញ្ញាសា ${khmerNumber(count)} · សំណួរ និងចម្លើយពី PDF ដើម`;
}
async function loadLibrary() {
  if (libraryBusy) return;
  libraryBusy = true;
  libraryFailed = false;
  $('refresh-library').disabled = true;
  $('library-status').textContent = 'កំពុងផ្ទុកបណ្ដុំសំណួរ និងចម្លើយ...';
  try {
    const result = await api({ action: 'library' });
    if (!Array.isArray(result.papers)) throw new Error('Invalid library response');
    libraryPapers = result.papers;
    libraryLoaded = true;
    renderLibrary();
  } catch {
    libraryFailed = true;
    $('library-status').textContent = 'មិនអាចផ្ទុកបញ្ជីវិញ្ញាសាបន្ថែមបាន។ មេរៀនឆ្នាំ២០១៤ ផ្នែកសង្គម លើកទី១ និងលើកទី២ អាចអានផ្ទាល់ខាងក្រោម ដោយជ្រើសឆ្នាំ២០១៤ និងផ្នែកសង្គម។ សូមចុចផ្ទុកឡើងវិញ ដើម្បីសាកល្បងបញ្ជីម្ដងទៀត។';
  } finally {
    libraryBusy = false;
    $('refresh-library').disabled = false;
  }
}
$('library-year').addEventListener('change', renderLibrary);
$('library-track').addEventListener('change', renderLibrary);
$('refresh-library').addEventListener('click', loadLibrary);
$('close-source').addEventListener('click', () => $('source-dialog').close());
$('source-dialog').addEventListener('close', () => $('source-frame').removeAttribute('src'));
