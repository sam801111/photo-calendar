// Pure parsing and calendar-link helpers, shared by browser and Node verification.
export function normalize(text) {
  return String(text).normalize('NFKC').replace(/\r/g, '').replace(/[–—－～〜]/g, '~')
    .replace(/([\u3400-\u9fff])[ \t]+(?=[\u3400-\u9fff])/g, '$1');
}
const pad = n => String(n).padStart(2, '0');
export function dateString(year, month, day) {
  const d = new Date(year, month - 1, day, 12);
  if (year < 1900 || year > 2199 || d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return '';
  return `${year}-${pad(month)}-${pad(day)}`;
}
export function addDays(iso, count) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + count, 12);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function parseActivity(source) {
  const text = normalize(source);
  const warnings = [];
  const candidates = [];
  const addCandidate = (iso, raw) => {
    if (!iso) { warnings.push(`「${raw}」不是有效日期，請手動修正。`); return; }
    if (!candidates.some(c => c.date === iso)) candidates.push({ date: iso, raw });
  };
  const fullDate = /(?:(民國)\s*)?(\d{3,4})\s*(?:年|[/.\-])\s*(\d{1,2})\s*(?:月|[/.\-])\s*(\d{1,2})\s*日?/g;
  const covered = [];
  for (const m of text.matchAll(fullDate)) {
    const year = Number(m[2]);
    // Three-digit years are interpreted only when 民國 is explicitly present.
    if (!m[1] && m[2].length === 3) {
      warnings.push(`「${m[0]}」年份不明；若是民國紀年，請加上「民國」或手動輸入西元年份。`);
    } else {
      addCandidate(dateString(m[1] ? year + 1911 : year, Number(m[3]), Number(m[4])), m[0]);
    }
    covered.push([m.index, m.index + m[0].length]);
  }
  const shortDate = /(?<!\d)(\d{1,2})\s*(?:月|\/)\s*(\d{1,2})\s*日?(?!\d)/g;
  for (const m of text.matchAll(shortDate)) {
    if (!covered.some(([a, b]) => m.index >= a && m.index < b)) warnings.push(`「${m[0]}」缺少年份，請手動填入完整日期。`);
  }
  if (candidates.length > 1) warnings.push('找到多個日期；可能包含報名截止日，請選擇真正的活動日期，並手動設定結束日期。');
  if (!candidates.length) warnings.push('沒有可確認的完整日期，請手動填寫日期。');
  const times = [];
  // Covers 14:00, 上午9點30分, 下午2:00, 2:00 PM and 9點.
  const timePattern = /(?:(上午|早上|下午|晚上|中午|AM|PM)\s*)?(\d{1,2})\s*(?::\s*(\d{2})|點(?:\s*(半|\d{1,2})\s*分?)?)(?:\s*(AM|PM))?/gi;
  let previousPeriod = '';
  for (const m of text.matchAll(timePattern)) {
    const explicit = (m[1] || m[5] || '').toUpperCase();
    const between = times.length ? text.slice(times.at(-1).end, m.index) : '';
    const inherited = !explicit && /^\s*(?:~|-|至|到)\s*$/.test(between) ? previousPeriod : '';
    const period = explicit || inherited;
    let hour = Number(m[2]);
    const minute = m[4] === '半' ? 30 : Number(m[3] || m[4] || 0);
    if (minute > 59 || hour > 23 || (period && (hour > 12 || hour < 1))) {
      warnings.push(`「${m[0]}」不是有效時間，請手動修正。`);
      continue;
    }
    if (['下午', '晚上', 'PM'].includes(period) && hour < 12) hour += 12;
    if (['上午', '早上', 'AM'].includes(period) && hour === 12) hour = 0;
    if (period === '中午') {
      if (hour === 12) hour = 12;
      else warnings.push('中午的時刻可能有歧義，請核對時間。');
    }
    times.push({ value: `${pad(hour)}:${pad(minute)}`, end: m.index + m[0].length });
    previousPeriod = period;
  }
  if (!times.length) warnings.push('沒有辨識到時間。請填入開始與結束時間，或選擇全天活動。');
  if (times.length === 1) warnings.push('只辨識到一個時間，結束時間請自行填寫。');
  if (times.length > 2) warnings.push('找到多個時間，預填前兩個；請核對是否為活動起訖時間。');
  if (times.length >= 2 && times[1].value <= times[0].value) warnings.push('結束時間不晚於開始時間；如活動跨午夜，請把結束日期改成下一天。');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const title = (lines.find(l => !/^(日期|時間|地點|地址|報名|活動日期|活動時間)\s*[:：]/.test(l)) || '').replace(/^(活動名稱|活動|主題)\s*[:：]\s*/, '').slice(0, 160);
  const location = (text.match(/(?:地點|地址|場地)\s*[:：]\s*([^\n]+)/)?.[1] || '').trim().slice(0, 300);
  warnings.push('活動名稱取自文字第一個候選行；請核對年份、日期、時間與地點。');
  return { title, location, candidates, startTime: times[0]?.value || '', endTime: times[1]?.value || '', warnings: [...new Set(warnings)] };
}
function parseDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!m || !dateString(+m[1], +m[2], +m[3])) throw new Error('請填入有效的開始與結束日期。');
  return m.slice(1).map(Number);
}
function parseTime(value) {
  const m = /^(\d{2}):(\d{2})$/.exec(value || '');
  if (!m || +m[1] > 23 || +m[2] > 59) throw new Error('請填入有效的開始與結束時間。');
  return m.slice(1).map(Number);
}
function localDate(date, time) {
  const [y, m, d] = parseDate(date);
  const [h, min] = parseTime(time);
  const result = new Date(y, m - 1, d, h, min);
  if (result.getHours() !== h || result.getMinutes() !== min) throw new Error('這個時間遇到夏令時間切換，請選其他時間。');
  return result;
}
export function calendarURL(event) {
  if (!event.title?.trim()) throw new Error('請填寫活動名稱。');
  parseDate(event.startDate);
  parseDate(event.endDate);
  let dates;
  if (event.allDay) {
    if (event.endDate < event.startDate) throw new Error('全天活動的結束日期不能早於開始日期。');
    dates = `${event.startDate.replaceAll('-', '')}/${addDays(event.endDate, 1).replaceAll('-', '')}`;
  } else {
    const start = localDate(event.startDate, event.startTime);
    const end = localDate(event.endDate, event.endTime);
    if (end <= start) throw new Error('結束必須晚於開始；跨午夜活動請調整結束日期。');
    const utc = d => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    dates = `${utc(start)}/${utc(end)}`;
  }
  const url = new URL('https://calendar.google.com/calendar/r/eventedit');
  url.search = new URLSearchParams({ action: 'TEMPLATE', text: event.title.trim(), dates, location: event.location || '', details: event.notes || '' });
  return url.href;
}
