import { parseActivity, calendarURL } from './calendar.js';
const $ = id => document.getElementById(id);
const fields = ['title', 'location', 'startDate', 'startTime', 'endDate', 'endTime', 'notes'];
const draftKey = 'photo-calendar-draft-v1';
let imageBlob = null, imageURL = null, working = false, worker = null, job = 0, timer = null;
let dateCandidates = [];
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '手機本地時區';
function readEvent() {
  return { ...Object.fromEntries(fields.map(id => [id, $(id).value])), allDay: $('allDay').checked };
}
function setWarnings(messages) {
  $('warnings').replaceChildren();
  const list = document.createElement('ul');
  for (const message of messages) { const li = document.createElement('li'); li.textContent = message; list.append(li); }
  $('warnings').append(list);
}
function update({ persist = true, invalidate = false } = {}) {
  if (invalidate) $('confirmed').checked = false;
  const allDay = $('allDay').checked;
  document.querySelectorAll('.time-field').forEach(el => { el.hidden = allDay; });
  $('startTime').required = !allDay;
  $('endTime').required = !allDay;
  $('timeHint').textContent = allDay ? '結束日期請填活動最後一天。' : `使用此裝置時區：${tz}。若活動位於其他時區，請先換算後填寫。`;
  $('previewTitle').textContent = $('title').value.trim() || '你的下一個行程';
  const e = readEvent();
  $('previewDate').textContent = e.startDate ? `${e.startDate}${allDay ? ' 全天' : ' ' + (e.startTime || '時間待填')} → ${e.endDate || '日期待填'}${allDay ? '' : ' ' + (e.endTime || '時間待填')}${e.location ? '\n' + e.location : ''}` : '等待你填入日期與時間';
  let valid = true;
  try { calendarURL(e); } catch { valid = false; }
  $('calendarButton').disabled = !valid || !$('confirmed').checked || working;
  if (persist) {
    try { localStorage.setItem(draftKey, JSON.stringify({ ...e, sourceText: $('sourceText').value.slice(0, 10000) })); }
    catch { /* Private mode or a full storage area must not block event creation. */ }
  }
}
function applyText() {
  if (!$('sourceText').value.trim()) { setWarnings(['請先辨識照片或貼上活動文字。']); return; }
  const parsed = parseActivity($('sourceText').value);
  $('title').value = parsed.title;
  $('location').value = parsed.location;
  $('notes').value = $('sourceText').value.slice(0, 3000);
  $('startDate').value = parsed.candidates[0]?.date || '';
  $('endDate').value = parsed.candidates[0]?.date || '';
  $('startTime').value = parsed.startTime;
  $('endTime').value = parsed.endTime;
  $('allDay').checked = false;
  dateCandidates = parsed.candidates;
  $('candidate').replaceChildren(...dateCandidates.map((c, i) => { const option = document.createElement('option'); option.value = i; option.textContent = `${c.date}（${c.raw}）`; return option; }));
  $('candidateWrap').hidden = dateCandidates.length < 2;
  setWarnings(parsed.warnings);
  $('formError').textContent = '';
  update({ invalidate: true });
}
function loadOCR() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';
    script.referrerPolicy = 'no-referrer';
    script.onload = () => window.Tesseract ? resolve(window.Tesseract) : reject(new Error('辨識工具無法啟動。'));
    script.onerror = () => { script.remove(); reject(new Error('無法下載辨識工具。請檢查網路，或直接貼上文字。')); };
    document.head.append(script);
  });
}
function setBusy(value, cancellable = false) {
  working = value;
  ['cameraInput', 'photoInput', 'sourceText', 'parseButton', 'demoButton', 'resetButton'].forEach(id => { $(id).disabled = value; });
  document.querySelectorAll('.capture-actions label').forEach(el => { el.style.opacity = value ? '.45' : ''; });
  $('scanButton').disabled = value || !imageBlob;
  $('cancelScan').hidden = !value || !cancellable;
  $('progress').hidden = !value;
  update({ persist: false });
}
async function preparePhoto(file) {
  if (!file || working) return;
  if (file.size > 30 * 1024 * 1024) { $('scanStatus').textContent = '照片超過 30 MB，請選較小的照片或截圖。'; return; }
  if (file.type && !file.type.startsWith('image/')) { $('scanStatus').textContent = '請選擇照片檔案。'; return; }
  setBusy(true);
  try {
    // Browser decoding preserves phone image orientation; scale down large originals.
    const originalURL = URL.createObjectURL(file);
    const img = new Image();
    try { await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error('照片格式無法開啟，請改用 JPG、PNG 或照片截圖。')); img.src = originalURL; }); }
    finally { URL.revokeObjectURL(originalURL); }
    const scale = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .94));
    if (!blob) throw new Error('照片處理失敗，請重新選擇。');
    if (imageURL) URL.revokeObjectURL(imageURL);
    imageBlob = blob; imageURL = URL.createObjectURL(blob);
    $('preview').src = imageURL; $('preview').hidden = false; $('emptyPhoto').hidden = true;
    $('sourceText').value = '';
    fields.forEach(id => { $(id).value = ''; });
    $('allDay').checked = false;
    $('candidateWrap').hidden = true;
    setWarnings(['這是新照片。請辨識後核對所有活動欄位。']);
    update({ invalidate: true });
    $('scanStatus').textContent = '照片已準備好。按「辨識照片文字」開始，或直接手動填寫。';
  } catch (error) { $('scanStatus').textContent = error.message; }
  finally { setBusy(false); }
}
async function stopScan(message = '已取消辨識。你可以重試，或直接貼上文字。') {
  job++;
  clearTimeout(timer);
  const old = worker; worker = null;
  if (old) { try { await old.terminate(); } catch { /* Worker may have already stopped. */ } }
  $('scanStatus').textContent = message;
  setBusy(false);
}
async function scan() {
  if (!imageBlob || working) return;
  const run = ++job;
  let current = null;
  setBusy(true, true);
  $('progress').value = 0;
  $('scanStatus').textContent = '準備繁體中文與英文辨識工具…第一次下載可能較久。';
  timer = setTimeout(() => { if (run === job) void stopScan('辨識超過兩分鐘，已停止。請換一張清晰照片、檢查網路，或直接貼上文字。'); }, 120000);
  try {
    const library = await loadOCR();
    if (run !== job) return;
    current = await library.createWorker(['chi_tra', 'eng'], 1, {
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      logger: m => {
        if (run !== job) return;
        $('progress').value = Number.isFinite(m.progress) ? m.progress : 0;
        $('scanStatus').textContent = m.status === 'recognizing text' ? `正在辨識照片文字 ${Math.round((m.progress || 0) * 100)}%` : '正在載入辨識工具與語言資料…';
      }
    });
    if (run !== job) return;
    worker = current;
    const { data } = await current.recognize(imageBlob);
    if (run !== job) return;
    $('sourceText').value = data.text.trim().slice(0, 10000);
    if (!$('sourceText').value) { setWarnings(['沒有辨識到文字，請重拍或自行填寫。']); $('scanStatus').textContent = '未找到可辨識的文字。'; }
    else { applyText(); $('scanStatus').textContent = '文字辨識完成。請核對活動名稱、日期、時間與地點。'; }
  } catch (error) {
    if (run === job) $('scanStatus').textContent = `辨識未完成：${error.message || '請檢查網路後重試。'} 你可以直接貼上文字或手動填寫。`;
  } finally {
    if (current) { try { await current.terminate(); } catch { /* Already terminated after cancel. */ } }
    if (run === job) { clearTimeout(timer); worker = null; setBusy(false); }
  }
}
for (const id of fields) $(id).addEventListener('input', () => { $('formError').textContent = ''; update({ invalidate: true }); });
$('sourceText').addEventListener('input', () => update({ invalidate: true }));
$('allDay').addEventListener('change', () => update({ invalidate: true }));
$('confirmed').addEventListener('change', () => update());
$('candidate').addEventListener('change', () => { const c = dateCandidates[Number($('candidate').value)]; if (c) { $('startDate').value = c.date; $('endDate').value = c.date; update({ invalidate: true }); } });
for (const id of ['cameraInput', 'photoInput']) $(id).addEventListener('change', e => { void preparePhoto(e.target.files[0]); e.target.value = ''; });
$('scanButton').addEventListener('click', scan);
$('cancelScan').addEventListener('click', () => void stopScan());
$('parseButton').addEventListener('click', applyText);
$('demoButton').addEventListener('click', () => {
  $('sourceText').value = '週末攝影分享會\n2026年11月15日 下午2:00–4:00\n地點：台北市中山區・光影工作室\n帶著你最喜歡的一張照片，一起分享故事。';
  applyText();
  $('scanStatus').textContent = '這是試用範例，尚未新增任何活動。';
});
$('eventForm').addEventListener('submit', e => {
  e.preventDefault();
  if (!$('confirmed').checked || working) return;
  try {
    const url = calendarURL(readEvent());
    // Navigate synchronously in the user gesture so iPhone popup blocking is avoided.
    $('confirmed').checked = false;
    update();
    window.location.assign(url);
  } catch (error) { $('formError').textContent = error.message; }
});
$('resetButton').addEventListener('click', () => {
  if (!window.confirm('要清除目前照片與活動草稿嗎？')) return;
  if (imageURL) URL.revokeObjectURL(imageURL);
  imageURL = null; imageBlob = null; dateCandidates = [];
  $('preview').removeAttribute('src'); $('preview').hidden = true; $('emptyPhoto').hidden = false;
  $('sourceText').value = ''; fields.forEach(id => { $(id).value = ''; });
  $('allDay').checked = false; $('candidateWrap').hidden = true;
  $('formError').textContent = ''; $('scanStatus').textContent = '選擇下一張活動照片，或直接貼上文字。';
  setWarnings(['日期與時間尚未填寫。請先辨識照片，或自行輸入。']);
  update({ invalidate: true }); setBusy(false);
  try { localStorage.removeItem(draftKey); } catch {}
});
$('installHelp').addEventListener('click', () => $('installDialog').showModal());
for (const id of ['closeDialog', 'installDone']) $(id).addEventListener('click', () => $('installDialog').close());
try {
  const draft = JSON.parse(localStorage.getItem(draftKey) || 'null');
  if (draft && typeof draft === 'object') {
    fields.forEach(id => { if (typeof draft[id] === 'string') $(id).value = draft[id]; });
    $('allDay').checked = draft.allDay === true;
    $('sourceText').value = typeof draft.sourceText === 'string' ? draft.sourceText : '';
    setWarnings(['已恢復上次的文字草稿；照片沒有保存。請重新核對後再開啟行事曆。']);
  }
} catch { /* Corrupt or unavailable storage starts a fresh draft. */ }
update({ persist: false, invalidate: true });
if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('./sw.js').catch(() => {});
