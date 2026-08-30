/* ===== Theme ===== */
(function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
})();

function spinThemeIcon(button) {
  const icon = button?.querySelector('.theme-toggle-icon');
  if (!icon) return;
  const turns = Number(icon.dataset.turns || '0') + 1;
  icon.dataset.turns = String(turns);
  icon.style.transform = `rotate(${turns * 360}deg)`;
}

function toggleTheme(event) {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  spinThemeIcon(event?.currentTarget);
}

document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
document.getElementById('themeToggleAdmin')?.addEventListener('click', toggleTheme);

/* ===== Public UI: tabs / rules ===== */
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');
tabs.forEach((tab) => tab.addEventListener('click', () => {
  tabs.forEach((item) => item.classList.remove('active'));
  panels.forEach((panel) => panel.classList.remove('active'));
  tab.classList.add('active');
  document.getElementById(tab.dataset.panel).classList.add('active');
}));

const filters = document.querySelectorAll('.filter');
const search = document.getElementById('ruleSearch');
let selectedFilter = 'all';

function getScoreRows() {
  return document.querySelectorAll('#scoreTable .score-row');
}

function renderScoreRules() {
  const rules = window.QUY_DINH_THI_DUA || [];
  const table = document.getElementById('scoreTable');
  if (!table || !rules.length) return;
  table.innerHTML = rules.map((rule) => {
    const type = rule.kind === 'plus' ? 'cong' : 'tru';
    const tag = rule.kind === 'plus' ? 'plus' : 'minus';
    const label = rule.kind === 'plus' ? 'Cộng' : 'Trừ';
    const sign = rule.kind === 'plus' ? '+' : '−';
    return `<div class="score-row" data-type="${type}" data-label="${String(rule.label).toLocaleLowerCase('vi')}"><span class="tag ${tag}">${label}</span><p>${rule.label}</p><b>${sign}${rule.points}</b></div>`;
  }).join('');
  filterRules();
}

function filterRules() {
  const keyword = (search?.value || '').trim().toLocaleLowerCase('vi');
  getScoreRows().forEach((row) => {
    const matchesType = selectedFilter === 'all' || row.dataset.type === selectedFilter;
    const haystack = row.dataset.label || row.textContent.toLocaleLowerCase('vi');
    const matchesText = !keyword || haystack.includes(keyword);
    row.hidden = !(matchesType && matchesText);
  });
}

filters.forEach((filter) => filter.addEventListener('click', () => {
  filters.forEach((item) => item.classList.remove('active'));
  filter.classList.add('active');
  selectedFilter = filter.dataset.filter || 'all';
  filterRules();
}));
search?.addEventListener('input', filterRules);
renderScoreRules();

/* Mở thang điểm khi bấm “Tra cứu thang điểm” */
function openScoreRulesIfNeeded() {
  const box = document.getElementById('quy-dinh-diem');
  if (!box) return;
  if (location.hash === '#quy-dinh-diem') {
    box.open = true;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
window.addEventListener('hashchange', openScoreRulesIfNeeded);
document.querySelectorAll('a[href="#quy-dinh-diem"]').forEach((a) => {
  a.addEventListener('click', () => {
    const box = document.getElementById('quy-dinh-diem');
    if (box) box.open = true;
  });
});
openScoreRulesIfNeeded();


const modal = document.getElementById('modal');
const content = document.getElementById('modalContent');
const close = document.querySelector('.close-modal');
function openModal(html) { content.innerHTML = html; modal.showModal(); }
close.addEventListener('click', () => modal.close());
modal.addEventListener('click', (event) => { if (event.target === modal) modal.close(); });

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDateVi(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function mondayOf(date = new Date()) {
  const value = new Date(date); const day = value.getDay() || 7;
  value.setDate(value.getDate() - day + 1); return value.toISOString().slice(0, 10);
}

function weekRangeLabel(mondayStr) {
  const start = new Date(mondayStr + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 5);
  const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${fmt(start)} – ${fmt(end)}.${end.getFullYear()}`;
}

function weekNumberFromMonday(mondayStr) {
  const start = new Date(mondayStr + 'T00:00:00');
  const yearStart = new Date(start.getFullYear(), 0, 1);
  return Math.ceil((((start - yearStart) / 86400000) + yearStart.getDay() + 1) / 7);
}

document.getElementById('membersButton').addEventListener('click', () => {
  const danhSachHocSinh = window.DANH_SACH_HOC_SINH || [];
  const students = danhSachHocSinh.map((student) => `<li><b>${student.stt}. ${escapeHtml(student.hoTen)}</b>${student.vaiTro ? ` <span>· ${escapeHtml(student.vaiTro)}</span>` : ''}</li>`).join('');
  openModal(`<div class="modal-content"><p class="modal-kicker">DANH SÁCH LỚP</p><h2>${danhSachHocSinh.length} thành viên</h2><p>Danh sách chỉ sử dụng họ tên và vai trò trong lớp. Thông tin định danh, liên hệ và điểm riêng tư không được đưa vào đây.</p><ol class="student-list">${students || '<li>Chưa có dữ liệu.</li>'}</ol></div>`);
});

async function getCurrentUser() {
  if (!window.supabase) return null;
  const { data: { user } } = await window.supabase.auth.getUser();
  return user;
}

async function getProfileRole(userId) {
  const { data } = await window.supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
  return data?.role || 'student';
}

function isStaffRole(role) {
  return ['class_officer', 'teacher', 'admin'].includes(role);
}

/* ---------- Week card & ranking ---------- */
async function refreshWeekCard() {
  const monday = mondayOf();
  const label = document.getElementById('weekLabel');
  const range = document.getElementById('weekRange');
  const scoreEl = document.getElementById('weekScore');
  const track = document.getElementById('weekTrack');
  const status = document.getElementById('weekStatus');
  const note = document.getElementById('weekNote');
  if (!label) return;

  label.textContent = `THI ĐUA TUẦN ${String(weekNumberFromMonday(monday)).padStart(2, '0')}`;
  range.textContent = weekRangeLabel(monday);

  if (!window.supabase) {
    scoreEl.textContent = '—';
    track.style.width = '0%';
    status.textContent = 'Chưa kết nối';
    note.textContent = 'Chưa kết nối dữ liệu.';
    return;
  }

  // Ưu tiên điểm tập thể đã chốt (khách cũng xem được)
  const { data: official } = await window.supabase.from('weekly_class_scores')
    .select('score, note, locked')
    .eq('week_start', monday)
    .maybeSingle();

  if (official && official.locked) {
    const s = Number(official.score);
    scoreEl.textContent = s.toFixed(1);
    track.style.width = `${Math.min(100, Math.max(0, s))}%`;
    status.textContent = 'Đã chốt';
    status.className = 'up';
    note.textContent = official.note || 'Điểm tập thể chính thức do admin chốt.';
    return;
  }

  // Chưa chốt: ước lượng từ bản ghi (mở cho khách nếu policy cho phép)
  const { data, error } = await window.supabase.from('competition_records')
    .select('kind, points')
    .eq('week_start', monday);

  if (error || !data?.length) {
    scoreEl.textContent = '—';
    track.style.width = '0%';
    status.textContent = 'Chưa chốt';
    note.textContent = 'Điểm tập thể sẽ hiển thị sau khi admin chốt tuần.';
    return;
  }

  let plus = 0;
  let minus = 0;
  data.forEach((item) => {
    if (item.kind === 'plus') plus += item.points;
    else minus += item.points;
  });
  const activityNet = plus - minus;
  const display = Math.max(0, Math.min(100, 100 + activityNet * 0.5)).toFixed(1);
  scoreEl.textContent = display;
  track.style.width = `${display}%`;
  status.textContent = 'Ước lượng';
  status.className = activityNet >= 0 ? 'up' : 'down';
  note.textContent = `Ước lượng từ hoạt động tuần (cộng ${plus} / trừ ${minus}). Chưa chốt chính thức.`;
}

/** Điểm gốc mỗi học sinh mỗi tuần (trước khi cộng/trừ). */
const STUDENT_BASE_SCORE = 100;

function formatScoreDelta(net) {
  if (net > 0) return `+${net}`;
  if (net < 0) return `−${Math.abs(net)}`;
  return '±0';
}

/** Cache xếp hạng tuần cho modal “Xem tất cả”. */
let weekRankCache = { week: '', ranked: [], records: [] };

async function buildWeekRanking() {
  const week = mondayOf();
  const [dirRes, recRes] = await Promise.all([
    window.supabase.from('student_directory').select('id, full_name').eq('active', true).order('full_name'),
    window.supabase.from('competition_records')
      .select('student_id, kind, points, reason, student_directory(full_name)')
      .eq('week_start', week)
  ]);
  if (recRes.error) throw recRes.error;

  const records = recRes.data || [];
  const dir = dirRes.data || [];
  const map = new Map();

  dir.forEach((s) => {
    map.set(s.id, { id: s.id, name: s.full_name, plus: 0, minus: 0, net: 0, minuses: [], pluses: [] });
  });
  records.forEach((item) => {
    const name = item.student_directory?.full_name || 'Học sinh';
    const cur = map.get(item.student_id) || { id: item.student_id, name, plus: 0, minus: 0, net: 0, minuses: [], pluses: [] };
    if (item.kind === 'plus') {
      cur.plus += item.points;
      cur.pluses.push({ points: item.points, reason: item.reason || 'Điểm cộng' });
    } else {
      cur.minus += item.points;
      cur.minuses.push({ points: item.points, reason: item.reason || 'Vi phạm' });
    }
    cur.net = cur.plus - cur.minus;
    cur.name = name;
    map.set(item.student_id, cur);
  });

  const ranked = [...map.values()]
    .map((item) => ({ ...item, total: STUDENT_BASE_SCORE + item.net }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'vi'));

  weekRankCache = { week, ranked, records };
  return weekRankCache;
}

async function refreshWeeklyRanking() {
  const list = document.getElementById('rankingList');
  if (!list) return;
  if (!window.supabase) {
    list.innerHTML = '<p class="privacy-note">Chưa kết nối dữ liệu.</p>';
    return;
  }
  list.innerHTML = '<p class="privacy-note">Đang tải bảng xếp hạng…</p>';
  try {
    const { ranked } = await buildWeekRanking();
    const top = ranked.slice(0, 5);
    if (!top.length) {
      list.innerHTML = `<p class="privacy-note">Chưa có học sinh trong danh sách. Mỗi em bắt đầu tuần từ <b>${STUDENT_BASE_SCORE}</b> điểm.</p>`;
      return;
    }
    const hasActivity = ranked.some((r) => r.plus || r.minus);
    if (!hasActivity) {
      list.innerHTML = ranked.slice(0, 5).map((item, index) =>
        `<div><span class="rank ${['gold', 'silver', 'bronze'][index] || ''}">${index + 1}</span><b>${escapeHtml(item.name)}</b><em>${item.total} <small>(gốc ${STUDENT_BASE_SCORE})</small></em></div>`
      ).join('') + `<p class="privacy-note">Chưa có cộng/trừ tuần này — mọi người đang ở ${STUDENT_BASE_SCORE} điểm. Bấm <b>Xem tất cả</b> để tìm tên.</p>`;
      return;
    }
    list.innerHTML = top.map((item, index) => {
      const delta = formatScoreDelta(item.net);
      const flag = item.minus > 0 ? ' <small class="neg-flag">có trừ</small>' : '';
      return `<div><span class="rank ${['gold', 'silver', 'bronze'][index] || ''}">${index + 1}</span><b>${escapeHtml(item.name)}</b><em>${item.total} <small>(${delta})</small>${flag}</em></div>`;
    }).join('');
  } catch (err) {
    list.innerHTML = `<p class="privacy-note">Không tải được xếp hạng. ${escapeHtml(err.message || String(err))} (Cần migration guest-read.)</p>`;
  }
}

async function openFullRankingModal() {
  if (!window.supabase) {
    openModal(`<div class="modal-content"><p class="modal-kicker">THI ĐUA</p><h2>Chưa kết nối dữ liệu</h2></div>`);
    return;
  }
  openModal(`<div class="modal-content rank-modal"><p class="modal-kicker">THI ĐUA TUẦN</p><h2>Xếp hạng &amp; vi phạm</h2><p class="loading-inline">Đang tải…</p></div>`);
  try {
    const { week, ranked } = weekRankCache.week === mondayOf() && weekRankCache.ranked.length
      ? weekRankCache
      : await buildWeekRanking();
    const weekLabel = weekRangeLabel(week);
    const rows = ranked.map((item, index) => {
      const delta = formatScoreDelta(item.net);
      const minusList = item.minuses?.length
        ? `<ul class="mini-minus">${item.minuses.map((m) => `<li>−${m.points}: ${escapeHtml(m.reason)}</li>`).join('')}</ul>`
        : '<span class="muted-link">Không có điểm trừ</span>';
      return `<tr>
        <td><b>${index + 1}</b></td>
        <td>${escapeHtml(item.name)}</td>
        <td class="positive">+${item.plus}</td>
        <td class="negative">−${item.minus}</td>
        <td><b>${item.total}</b> <small>(${delta})</small></td>
        <td>${minusList}</td>
      </tr>`;
    }).join('');
    document.getElementById('modalContent').innerHTML = `
      <div class="rank-modal">
        <p class="modal-kicker">THI ĐUA · GỐC ${STUDENT_BASE_SCORE}</p>
        <h2>Xếp hạng tuần ${weekLabel}</h2>
        <p>Tổng = ${STUDENT_BASE_SCORE} + cộng − trừ. Khi admin nhập điểm, thứ hạng cập nhật ngay (không cần đăng nhập để xem).</p>
        <div class="journal-table-wrap rank-table-wrap">
          <table class="journal-table">
            <thead><tr><th>#</th><th>Họ tên</th><th>Cộng</th><th>Trừ</th><th>Tổng</th><th>Chi tiết trừ (vi phạm)</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6">Chưa có dữ liệu.</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  } catch (err) {
    document.getElementById('modalContent').innerHTML = `<div class="modal-content"><p class="modal-kicker">THI ĐUA</p><h2>Lỗi tải</h2><p>${escapeHtml(err.message || String(err))}</p></div>`;
  }
}

/* ---------- Score lookup by name ---------- */
function normalizeSearchText(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
}

function populateLookupNames() {
  const datalist = document.getElementById('scoreLookupNames');
  if (!datalist) return;
  const list = window.DANH_SACH_HOC_SINH || [];
  datalist.innerHTML = list.map((s) => `<option value="${escapeHtml(s.hoTen)}"></option>`).join('');
}
populateLookupNames();
window.addEventListener('student-directory-loaded', populateLookupNames);

function renderLookupDetail(item) {
  const delta = formatScoreDelta(item.net);
  const plusList = item.pluses?.length
    ? `<ul>${item.pluses.map((p) => `<li><span>${escapeHtml(p.reason)}</span><b class="positive">+${p.points}</b></li>`).join('')}</ul>`
    : '<p class="privacy-note">Không có điểm cộng tuần này.</p>';
  const minusList = item.minuses?.length
    ? `<ul>${item.minuses.map((m) => `<li><span>${escapeHtml(m.reason)}</span><b class="negative">−${m.points}</b></li>`).join('')}</ul>`
    : '<p class="privacy-note">Không có điểm trừ tuần này.</p>';
  return `
    <p class="lookup-name">${escapeHtml(item.name)}</p>
    <div class="lookup-total"><strong>${item.total}</strong><span>điểm tuần này &nbsp;·&nbsp; gốc ${STUDENT_BASE_SCORE}, ${delta}</span></div>
    <div class="lookup-groups">
      <div class="lookup-group"><h4>Điểm cộng (+${item.plus})</h4>${plusList}</div>
      <div class="lookup-group"><h4>Điểm trừ (−${item.minus})</h4>${minusList}</div>
    </div>`;
}

async function handleScoreLookup(rawQuery) {
  const result = document.getElementById('scoreLookupResult');
  if (!result) return;
  const query = (rawQuery || '').trim();
  if (!query) {
    result.innerHTML = '<p class="privacy-note">Nhập họ tên để xem điểm tuần này (gốc 100 + cộng − trừ) và chi tiết từng mục cộng/trừ.</p>';
    return;
  }
  if (!window.supabase) {
    result.innerHTML = '<p class="privacy-note">Chưa kết nối dữ liệu.</p>';
    return;
  }
  result.innerHTML = '<p class="loading-inline">Đang tra cứu…</p>';
  try {
    const { ranked } = weekRankCache.week === mondayOf() && weekRankCache.ranked.length
      ? weekRankCache
      : await buildWeekRanking();
    const norm = normalizeSearchText(query);
    const matches = ranked.filter((item) => normalizeSearchText(item.name).includes(norm));
    if (!matches.length) {
      result.innerHTML = `<p class="privacy-note">Không tìm thấy học sinh tên “${escapeHtml(query)}”. Kiểm tra lại chính tả hoặc chọn tên gợi ý.</p>`;
      return;
    }
    if (matches.length > 1) {
      const options = matches.slice(0, 8).map((m) => `<button type="button" class="link-button lookup-suggestion" data-name="${escapeHtml(m.name)}">${escapeHtml(m.name)}</button>`).join('');
      result.innerHTML = `<p class="privacy-note">Tìm thấy ${matches.length} tên khớp — chọn đúng học sinh:</p><div class="lookup-suggestions">${options}</div>`;
      result.querySelectorAll('.lookup-suggestion').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.getElementById('scoreLookupInput').value = btn.dataset.name;
          handleScoreLookup(btn.dataset.name);
        });
      });
      return;
    }
    result.innerHTML = renderLookupDetail(matches[0]);
  } catch (err) {
    result.innerHTML = `<p class="privacy-note">Không tra cứu được. ${escapeHtml(err.message || String(err))}</p>`;
  }
}

document.getElementById('scoreLookupForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  handleScoreLookup(document.getElementById('scoreLookupInput').value);
});

/* ---------- Announcements (public) ---------- */
function kindLabel(kind) {
  const map = {
    announcement: 'Thông báo',
    study: 'Học tập',
    blog: 'Blog',
    facebook: 'Facebook',
    tiktok: 'TikTok'
  };
  return map[kind] || kind || 'Thông báo';
}

function renderAnnouncementCard(post, featured = false) {
  const date = formatDateVi(post.published_at);
  const body = escapeHtml(post.body || '').slice(0, featured ? 280 : 140);
  const link = post.external_url
    ? `<a href="${escapeHtml(post.external_url)}" target="_blank" rel="noopener">Xem chi tiết <b>→</b></a>`
    : '';
  if (featured) {
    return `<p>${date}</p><h3>${escapeHtml(post.title)}</h3><span>${body || 'Thông báo của lớp.'}</span>${link || '<span class="muted-link">Thông báo nội bộ</span>'}`;
  }
  return `<article class="announcement-item" role="listitem">
    <div class="announcement-meta"><time>${date}</time>${post.kind && post.kind !== 'announcement' ? `<span class="kind-tag">${escapeHtml(kindLabel(post.kind))}</span>` : ''}</div>
    <h3>${escapeHtml(post.title)}</h3>
    <p>${body}${body.length >= 140 ? '…' : ''}</p>
    ${link}
  </article>`;
}

function todayLocalISO() {
  const n = new Date();
  const local = new Date(n.getTime() - n.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function daysFromToday(isoDate) {
  if (!isoDate) return null;
  const t = todayLocalISO();
  const a = new Date(isoDate + 'T12:00:00');
  const b = new Date(t + 'T12:00:00');
  return Math.round((a - b) / 86400000);
}

function studyUrgency(post) {
  const d = daysFromToday(post.relevant_on);
  if (d === null) return { key: 'none', label: 'Dặn dò', className: '' };
  if (d < 0) return { key: 'past', label: 'Đã qua', className: 'is-past' };
  if (d === 0) return { key: 'today', label: 'Hôm nay', className: 'is-today' };
  if (d === 1) return { key: 'tomorrow', label: 'Ngày mai', className: 'is-soon' };
  if (d <= 3) return { key: 'soon', label: `Còn ${d} ngày`, className: 'is-soon' };
  return { key: 'later', label: formatDateVi(post.relevant_on), className: '' };
}

function renderStudyCard(post) {
  const urgency = studyUrgency(post);
  const body = escapeHtml(post.body || '');
  const link = post.external_url
    ? `<a href="${escapeHtml(post.external_url)}" target="_blank" rel="noopener">Chi tiết / tài liệu <b>→</b></a>`
    : '';
  const when = post.relevant_on
    ? `<span class="study-when">Ngày cần nhớ: <b>${formatDateVi(post.relevant_on)}</b></span>`
    : `<span class="study-when">Đăng ${formatDateVi(post.published_at)}</span>`;
  return `<article class="study-item ${urgency.className}" role="listitem">
    <div class="study-item-badge">${urgency.label}</div>
    <div class="study-item-body">
      <div class="announcement-meta">${when}</div>
      <h3>${escapeHtml(post.title)}</h3>
      <p>${body || 'Thông báo học tập của lớp.'}</p>
      ${link}
    </div>
  </article>`;
}

async function refreshWebsiteStudyPosts() {
  const list = document.getElementById('studyList');
  const countEl = document.getElementById('studyCount');
  const quick = document.getElementById('quickStudyCount');
  if (!list) return;

  if (!window.supabase) {
    list.innerHTML = '<p class="empty-state">Chưa kết nối dữ liệu.</p>';
    return;
  }

  list.innerHTML = '<p class="loading-inline">Đang tải thông báo học tập…</p>';

  const { data, error } = await window.supabase.from('content_posts')
    .select('id, kind, title, body, external_url, published_at, relevant_on')
    .eq('is_published', true)
    .eq('kind', 'study')
    .order('published_at', { ascending: false })
    .limit(30);

  if (error) {
    list.innerHTML = `<p class="empty-state">Không tải được. ${escapeHtml(error.message)}${error.message?.includes('relevant_on') ? ' — Chạy migration study-date trên Supabase.' : ''}</p>`;
    if (countEl) countEl.textContent = 'Lỗi tải';
    return;
  }

  if (!data?.length) {
    list.innerHTML = `<p class="empty-state">Chưa có dặn dò học tập. GVCN: <b>Khu quản trị → Nội dung → Thông báo học tập</b>, điền <b>Ngày cần nhớ</b> (ngày KT / hạn nộp) để mục tự nổi đúng ngày.</p>`;
    if (countEl) countEl.textContent = 'Chưa có mục nào';
    if (quick) quick.textContent = 'Chưa có dặn dò';
    return;
  }

  // Ưu tiên: hôm nay → ngày mai → sắp tới → không ngày → đã qua
  const orderKey = { today: 0, tomorrow: 1, soon: 2, later: 3, none: 4, past: 5 };
  const sorted = [...data].sort((a, b) => {
    const ua = studyUrgency(a);
    const ub = studyUrgency(b);
    const da = orderKey[ua.key] ?? 9;
    const db = orderKey[ub.key] ?? 9;
    if (da !== db) return da - db;
    const ra = a.relevant_on || '9999';
    const rb = b.relevant_on || '9999';
    return ra.localeCompare(rb);
  });

  list.innerHTML = sorted.map(renderStudyCard).join('');
  const hot = sorted.filter((p) => {
    const k = studyUrgency(p).key;
    return k === 'today' || k === 'tomorrow' || k === 'soon';
  }).length;
  if (countEl) {
    countEl.textContent = hot
      ? `${sorted.length} mục · ${hot} cần chú ý hôm nay / sắp tới`
      : `${sorted.length} dặn dò · kiểm tra · bài tập`;
  }
  if (quick) quick.textContent = hot ? `${hot} cần nhớ gần đây` : `${sorted.length} dặn dò`;
}

async function refreshWebsiteAnnouncements() {
  const featured = document.getElementById('featuredAnnouncement');
  const list = document.getElementById('announcementList');
  const countEl = document.getElementById('announcementCount');
  const quick = document.getElementById('quickAnnCount');
  if (!featured || !list) return;

  if (!window.supabase) {
    featured.innerHTML = '<p class="empty-state">Chưa kết nối dữ liệu.</p>';
    list.innerHTML = '<p class="empty-state">Chưa có thông báo.</p>';
    if (countEl) countEl.textContent = 'Chưa kết nối';
    if (quick) quick.textContent = 'Chưa kết nối';
    return;
  }

  featured.innerHTML = '<p class="loading-inline">Đang tải thông báo…</p>';
  list.innerHTML = '<p class="empty-state">Đang tải danh sách…</p>';

  const { data, error } = await window.supabase.from('content_posts')
    .select('id, kind, title, body, external_url, published_at')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(30);

  if (error) {
    featured.innerHTML = `<p class="empty-state">Không tải được thông báo. ${escapeHtml(error.message)}</p>`;
    list.innerHTML = '<p class="empty-state">Thử tải lại trang.</p>';
    if (countEl) countEl.textContent = 'Lỗi tải';
    if (quick) quick.textContent = 'Lỗi tải';
    return;
  }

  // Tách thông báo lớp thường — không gộp “học tập” vào đây
  const general = (data || []).filter((p) => p.kind !== 'study');
  if (!general.length) {
    featured.innerHTML = '<p class="empty-state">Chưa có thông báo lớp. (Dặn dò học tập nằm ở mục <a href="#hoc-tap">Thông báo học tập</a>.)</p>';
    list.innerHTML = '<p class="empty-state">Khi có thông báo chung của lớp, danh sách hiện tại đây.</p>';
    if (countEl) countEl.textContent = '0 thông báo lớp';
    if (quick) quick.textContent = 'Chưa có cập nhật';
    return;
  }

  const announcements = general.filter((p) => p.kind === 'announcement' || !p.kind);
  const primary = announcements[0] || general[0];
  const rest = (announcements.length ? announcements : general).slice(1);

  featured.innerHTML = renderAnnouncementCard(primary, true);
  list.innerHTML = rest.length
    ? rest.map((post) => renderAnnouncementCard(post, false)).join('')
    : '<p class="empty-state">Chưa có thông báo cũ hơn.</p>';

  if (countEl) countEl.textContent = `${general.length} thông báo lớp`;
  if (quick) quick.textContent = general.length === 1 ? '1 cập nhật' : `${general.length} cập nhật`;
}

/* ---------- Auth ---------- */
function showLogin() {
  openModal(`<div class="modal-content"><p class="modal-kicker">KHU QUẢN TRỊ</p><h2>Đăng nhập nội bộ</h2><p>Dùng tài khoản do GVCN hoặc quản trị viên cấp.</p><form id="loginForm"><label>Email<input type="email" name="email" required autocomplete="email" /></label><label>Mật khẩu<input type="password" name="password" required autocomplete="current-password" /></label><button class="button button-primary" type="submit">Đăng nhập <span>→</span></button><p id="loginStatus" role="status"></p></form></div>`);
  document.getElementById('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = document.getElementById('loginStatus');
    status.textContent = 'Đang xác thực…';
    const { error } = await window.supabase.auth.signInWithPassword({ email: form.get('email'), password: form.get('password') });
    status.textContent = error ? 'Không thể đăng nhập. Vui lòng kiểm tra lại tài khoản.' : 'Đăng nhập thành công. Đang tải lại trang…';
    if (!error) window.setTimeout(() => window.location.reload(), 700);
  });
}

/* ========== ADMIN APP (Phase 1) ========== */
let adminUser = null;
let adminRole = null;
let cachedStudents = [];

function showPublicSite() {
  document.getElementById('adminApp').hidden = true;
  document.querySelector('main').hidden = false;
  document.getElementById('siteFooter').hidden = false;
  document.querySelector('.site-header').style.display = '';
}

function showAdminShell() {
  document.querySelector('main').hidden = true;
  document.getElementById('siteFooter').hidden = true;
  document.querySelector('.site-header').style.display = 'none';
  document.getElementById('adminApp').hidden = false;
  window.scrollTo(0, 0);
}

async function enterAdmin(user) {
  adminUser = user;
  adminRole = await getProfileRole(user.id);
  if (!isStaffRole(adminRole)) {
    openModal(`<div class="modal-content"><p class="modal-kicker">KHU QUẢN TRỊ</p><h2>Tài khoản học sinh</h2><p>Tài khoản này chỉ xem trang công khai (nội quy, thông báo, lịch, thành viên). Việc nhập điểm và quản lý lớp dùng <b>tài khoản admin</b>.</p></div>`);
    return;
  }
  document.getElementById('adminTitle').textContent = 'Quản lý lớp · Admin';
  showAdminShell();
  await loadStudentsCache();
  await refreshAdminAlerts();
  switchAdminTab('scores');
}

async function refreshAdminAlerts() {
  const shell = document.querySelector('.admin-shell');
  if (!shell) return;
  let bar = document.getElementById('adminAlertBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'adminAlertBar';
    bar.className = 'admin-alert-bar';
    const nav = shell.querySelector('.admin-nav');
    shell.insertBefore(bar, nav);
  }
  const monday = mondayOf();
  const weekNo = String(weekNumberFromMonday(monday)).padStart(2, '0');
  const { data: official } = await window.supabase.from('weekly_class_scores')
    .select('score, locked')
    .eq('week_start', monday)
    .maybeSingle();
  if (official?.locked) {
    bar.hidden = true;
    bar.innerHTML = '';
    return;
  }
  bar.hidden = false;
  bar.innerHTML = `
    <span><b>Tuần ${weekNo}</b> chưa chốt điểm tập thể (${weekRangeLabel(monday)}).</span>
    <button type="button" class="link-button" id="alertGoWeekly">Chốt tuần ngay →</button>`;
  document.getElementById('alertGoWeekly')?.addEventListener('click', () => switchAdminTab('weekly'));
}

async function loadStudentsCache() {
  const { data } = await window.supabase.from('student_directory')
    .select('id, full_name')
    .eq('active', true)
    .order('full_name');
  cachedStudents = data || [];
}

function switchAdminTab(name) {
  document.querySelectorAll('.admin-nav-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.adminTab === name);
  });
  document.querySelectorAll('.admin-pane').forEach((pane) => {
    const match = pane.dataset.pane === name;
    pane.hidden = !match;
    pane.classList.toggle('active', match);
  });
  if (name === 'scores') renderScoresPane();
  if (name === 'journal') renderJournalPane();
  if (name === 'weekly') renderWeeklyPane();
  if (name === 'report') renderReportPane();
  if (name === 'events') renderEventsPane();
  if (name === 'content') renderContentPane();
}

document.querySelectorAll('.admin-nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => switchAdminTab(btn.dataset.adminTab));
});

document.getElementById('exitAdmin')?.addEventListener('click', () => {
  showPublicSite();
  bootData();
});

document.getElementById('adminLogout')?.addEventListener('click', () => logoutAccount());

async function logoutAccount() {
  if (!window.supabase) return;
  if (!window.confirm('Đăng xuất khỏi tài khoản hiện tại?')) return;
  await window.supabase.auth.signOut();
  window.location.reload();
}

async function refreshAuthHeader() {
  const wrap = document.getElementById('headerAuth');
  if (!wrap) return;

  const adminBtnHtml = `<button class="admin-button" id="adminButton" type="button">Khu quản trị <span>→</span></button>`;

  if (!window.supabase) {
    wrap.innerHTML = adminBtnHtml;
    bindAdminButton();
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    wrap.innerHTML = adminBtnHtml;
    bindAdminButton();
    return;
  }

  const role = await getProfileRole(user.id);
  const isAdmin = isStaffRole(role);
  const label = isAdmin ? 'Admin' : 'Học sinh';
  const email = user.email || 'đã đăng nhập';
  const shortMail = email.length > 22 ? `${email.slice(0, 18)}…` : email;

  wrap.innerHTML = `
    <div class="auth-chip" title="${escapeHtml(email)}">
      <span class="auth-chip-role">${label}</span>
      <span class="auth-chip-mail">${escapeHtml(shortMail)}</span>
    </div>
    <button class="admin-button" id="adminButton" type="button">${isAdmin ? 'Khu quản trị' : 'Tài khoản'} <span>→</span></button>
    <button class="logout-button" id="headerLogout" type="button" title="Đăng xuất">Đăng xuất</button>`;

  bindAdminButton();
  document.getElementById('headerLogout')?.addEventListener('click', () => logoutAccount());
}

function bindAdminButton() {
  const btn = document.getElementById('adminButton');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    if (!window.supabase) {
      openModal(`<div class="modal-content"><p class="modal-kicker">KHU QUẢN TRỊ</p><h2>Chưa kết nối Supabase</h2><p>Kiểm tra lại Project URL và Publishable/anon key trong tệp cấu hình.</p></div>`);
      return;
    }
    const user = await getCurrentUser();
    if (!user) { showLogin(); return; }
    enterAdmin(user);
  });
}

/* --- Pane: Nhập điểm (1 người + hàng loạt) --- */
function renderScoresPane() {
  const pane = document.getElementById('pane-scores');
  const options = cachedStudents.map((s) => `<option value="${s.id}">${escapeHtml(s.full_name)}</option>`).join('');
  const rules = window.QUY_DINH_THI_DUA || [];
  const ruleOptions = rules.map((item) => `<option value="${item.code}" data-kind="${item.kind}" data-points="${item.points}">${item.kind === 'plus' ? 'Cộng' : 'Trừ'} · ${escapeHtml(item.label)} (${item.points}đ)</option>`).join('');
  const checks = cachedStudents.map((s) => `
    <label class="student-check">
      <input type="checkbox" name="bulkStudents" value="${s.id}" />
      <span>${escapeHtml(s.full_name)}</span>
    </label>`).join('');

  pane.innerHTML = `
    <div class="admin-grid-2">
      <div class="admin-card">
        <p class="card-kicker">MỘT HỌC SINH</p>
        <h2>Nhập điểm đơn</h2>
        <form id="scoreForm" class="admin-form">
          <label>Tìm học sinh<input type="search" id="singleStudentSearch" placeholder="Gõ tên…" autocomplete="off" /></label>
          <label>Học sinh<select name="studentId" id="singleStudentSelect" required>${options}</select></label>
          <label>Nội dung<select name="ruleCode" id="ruleCode" required>${ruleOptions}</select></label>
          <div class="two-columns">
            <label>Loại điểm<select name="kind" id="scoreKind"><option value="plus">Cộng điểm</option><option value="minus">Trừ điểm</option></select></label>
            <label>Số điểm<input name="points" id="scorePoints" type="number" min="1" max="30" value="3" required /></label>
          </div>
          <div class="two-columns">
            <label>Tuần bắt đầu<input name="weekStart" type="date" value="${mondayOf()}" required /></label>
            <label>Ghi chú<input name="note" maxlength="250" placeholder="Tiết, ngày…" /></label>
          </div>
          <button class="button button-primary" type="submit">Lưu điểm <span>→</span></button>
          <p class="admin-status" id="scoreStatus" role="status"></p>
        </form>
      </div>
      <div class="admin-card">
        <p class="card-kicker">NHIỀU HỌC SINH</p>
        <h2>Nhập nhanh hàng loạt</h2>
        <p class="pane-desc">Chọn nhiều em cùng một nội dung (ví dụ cả tổ trực nhật chậm).</p>
        <form id="bulkScoreForm" class="admin-form">
          <label>Nội dung<select name="ruleCode" id="bulkRuleCode" required>${ruleOptions}</select></label>
          <div class="two-columns">
            <label>Loại điểm<select name="kind" id="bulkScoreKind"><option value="plus">Cộng</option><option value="minus">Trừ</option></select></label>
            <label>Số điểm<input name="points" id="bulkScorePoints" type="number" min="1" max="30" value="1" required /></label>
          </div>
          <div class="two-columns">
            <label>Tuần<input name="weekStart" type="date" value="${mondayOf()}" required /></label>
            <label>Ghi chú<input name="note" maxlength="250" placeholder="Tuỳ chọn" /></label>
          </div>
          <label>Tìm trong danh sách<input type="search" id="bulkStudentSearch" placeholder="Gõ tên để lọc…" autocomplete="off" /></label>
          <div class="bulk-toolbar">
            <button type="button" class="link-button" id="bulkSelectAll">Chọn tất cả (đang hiện)</button>
            <button type="button" class="link-button" id="bulkClearAll">Bỏ chọn</button>
            <span class="bulk-count" id="bulkCount">0 đã chọn</span>
          </div>
          <div class="student-check-grid" id="bulkStudentGrid">${checks || '<p class="empty-state">Chưa có danh sách học sinh.</p>'}</div>
          <button class="button button-primary" type="submit">Lưu cho các em đã chọn</button>
          <p class="admin-status" id="bulkScoreStatus" role="status"></p>
        </form>
      </div>
    </div>`;

  function bindRuleAuto(ruleId, kindId, pointsId) {
    const rule = document.getElementById(ruleId);
    rule.addEventListener('change', () => {
      const chosen = rule.options[rule.selectedIndex];
      document.getElementById(kindId).value = chosen.dataset.kind;
      document.getElementById(pointsId).value = chosen.dataset.points;
    });
    rule.dispatchEvent(new Event('change'));
    return rule;
  }

  const rule = bindRuleAuto('ruleCode', 'scoreKind', 'scorePoints');
  const bulkRule = bindRuleAuto('bulkRuleCode', 'bulkScoreKind', 'bulkScorePoints');

  const singleSelect = document.getElementById('singleStudentSelect');
  document.getElementById('singleStudentSearch')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLocaleLowerCase('vi');
    [...singleSelect.options].forEach((opt) => {
      opt.hidden = q && !opt.textContent.toLocaleLowerCase('vi').includes(q);
    });
    const firstVisible = [...singleSelect.options].find((o) => !o.hidden);
    if (firstVisible && singleSelect.selectedOptions[0]?.hidden) singleSelect.value = firstVisible.value;
  });

  function updateBulkCount() {
    const n = document.querySelectorAll('#bulkStudentGrid input:checked').length;
    const el = document.getElementById('bulkCount');
    if (el) el.textContent = `${n} đã chọn`;
  }
  document.getElementById('bulkStudentGrid')?.addEventListener('change', updateBulkCount);
  document.getElementById('bulkStudentSearch')?.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLocaleLowerCase('vi');
    document.querySelectorAll('#bulkStudentGrid .student-check').forEach((label) => {
      const name = label.textContent.toLocaleLowerCase('vi');
      label.hidden = q && !name.includes(q);
    });
  });
  document.getElementById('bulkSelectAll')?.addEventListener('click', () => {
    document.querySelectorAll('#bulkStudentGrid .student-check:not([hidden]) input[type=checkbox]').forEach((c) => { c.checked = true; });
    updateBulkCount();
  });
  document.getElementById('bulkClearAll')?.addEventListener('click', () => {
    document.querySelectorAll('#bulkStudentGrid input[type=checkbox]').forEach((c) => { c.checked = false; });
    updateBulkCount();
  });

  document.getElementById('scoreForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const status = document.getElementById('scoreStatus');
    const selected = rule.options[rule.selectedIndex];
    const reason = selected.textContent.replace(/^Cộng · |^Trừ · /, '');
    status.textContent = 'Đang lưu…';
    const { error } = await window.supabase.from('competition_records').insert({
      student_id: values.get('studentId'),
      week_start: values.get('weekStart'),
      kind: values.get('kind'),
      points: Number(values.get('points')),
      rule_code: values.get('ruleCode'),
      reason: values.get('note') ? `${reason} — ${values.get('note')}` : reason,
      created_by: adminUser.id
    });
    status.textContent = error ? `Không lưu được: ${error.message}` : 'Đã lưu điểm thành công. Xếp hạng trang chủ đã cập nhật.';
    if (!error) {
      event.currentTarget.reset();
      event.currentTarget.elements.weekStart.value = mondayOf();
      rule.dispatchEvent(new Event('change'));
      weekRankCache = { week: '', ranked: [], records: [] };
      refreshWeeklyRanking();
      refreshWeekCard();
    }
  });

  document.getElementById('bulkScoreForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const status = document.getElementById('bulkScoreStatus');
    const ids = [...form.querySelectorAll('input[name=bulkStudents]:checked')].map((c) => c.value);
    if (!ids.length) {
      status.textContent = 'Hãy chọn ít nhất một học sinh.';
      return;
    }
    const selected = bulkRule.options[bulkRule.selectedIndex];
    const reasonBase = selected.textContent.replace(/^Cộng · |^Trừ · /, '');
    const reason = values.get('note') ? `${reasonBase} — ${values.get('note')}` : reasonBase;
    const rows = ids.map((studentId) => ({
      student_id: studentId,
      week_start: values.get('weekStart'),
      kind: values.get('kind'),
      points: Number(values.get('points')),
      rule_code: values.get('ruleCode'),
      reason,
      created_by: adminUser.id
    }));
    status.textContent = `Đang lưu ${rows.length} bản ghi…`;
    const { error } = await window.supabase.from('competition_records').insert(rows);
    status.textContent = error
      ? `Không lưu được: ${error.message}`
      : `Đã lưu ${rows.length} bản ghi thành công. Xếp hạng trang chủ đã cập nhật.`;
    if (!error) {
      form.querySelectorAll('input[name=bulkStudents]').forEach((c) => { c.checked = false; });
      updateBulkCount();
      weekRankCache = { week: '', ranked: [], records: [] };
      refreshWeeklyRanking();
      refreshWeekCard();
    }
  });
}

/* --- Pane: Nhật ký (filter + sửa/xóa) --- */
async function renderJournalPane() {
  const pane = document.getElementById('pane-journal');
  const studentOpts = `<option value="">Tất cả học sinh</option>` +
    cachedStudents.map((s) => `<option value="${s.id}">${escapeHtml(s.full_name)}</option>`).join('');

  pane.innerHTML = `
    <div class="admin-card">
      <p class="card-kicker">NHẬT KÝ THI ĐUA</p>
      <h2>Lọc & chỉnh sửa điểm</h2>
      <div class="journal-filters">
        <label>Tuần<input type="date" id="journalWeek" value="${mondayOf()}" /></label>
        <label>Học sinh<select id="journalStudent">${studentOpts}</select></label>
        <label>Loại<select id="journalKind"><option value="">Tất cả</option><option value="plus">Cộng</option><option value="minus">Trừ</option></select></label>
        <button type="button" class="button button-secondary" id="journalReload">Lọc</button>
      </div>
      <p class="admin-status" id="journalStatus">Đang tải…</p>
      <div class="journal-table-wrap">
        <table class="journal-table" id="journalTable">
          <thead><tr><th>Học sinh</th><th>Tuần</th><th>Nội dung</th><th>Điểm</th><th></th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>`;

  document.getElementById('journalReload').addEventListener('click', loadJournalRows);
  document.getElementById('journalWeek').addEventListener('change', loadJournalRows);
  document.getElementById('journalStudent').addEventListener('change', loadJournalRows);
  document.getElementById('journalKind').addEventListener('change', loadJournalRows);
  await loadJournalRows();
}

async function loadJournalRows() {
  const status = document.getElementById('journalStatus');
  const tbody = document.querySelector('#journalTable tbody');
  if (!status || !tbody) return;
  status.textContent = 'Đang tải…';
  tbody.innerHTML = '';

  let query = window.supabase.from('competition_records')
    .select('id, kind, points, reason, week_start, rule_code, student_id, student_directory(full_name)')
    .order('created_at', { ascending: false })
    .limit(150);

  const week = document.getElementById('journalWeek')?.value;
  const studentId = document.getElementById('journalStudent')?.value;
  const kind = document.getElementById('journalKind')?.value;
  if (week) query = query.eq('week_start', week);
  if (studentId) query = query.eq('student_id', studentId);
  if (kind) query = query.eq('kind', kind);

  const { data, error } = await query;
  if (error) {
    status.textContent = `Lỗi: ${error.message}`;
    return;
  }
  if (!data?.length) {
    status.textContent = 'Không có bản ghi phù hợp.';
    return;
  }
  status.textContent = `${data.length} bản ghi`;
  tbody.innerHTML = data.map((row) => `
    <tr data-id="${row.id}">
      <td><b>${escapeHtml(row.student_directory?.full_name || '—')}</b></td>
      <td>${row.week_start}</td>
      <td class="reason-cell">${escapeHtml(row.reason)}</td>
      <td class="${row.kind === 'plus' ? 'positive' : 'negative'}">${row.kind === 'plus' ? '+' : '−'}${row.points}</td>
      <td class="row-actions">
        <button type="button" class="link-button edit-score" data-id="${row.id}">Sửa</button>
        <button type="button" class="link-button danger-link delete-score" data-id="${row.id}">Xóa</button>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('.delete-score').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Xóa bản ghi điểm này?')) return;
      const id = btn.dataset.id;
      const { error: delError } = await window.supabase.from('competition_records').delete().eq('id', id);
      if (delError) {
        status.textContent = `Không xóa được: ${delError.message}`;
        return;
      }
      loadJournalRows();
    });
  });

  tbody.querySelectorAll('.edit-score').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = data.find((r) => r.id === btn.dataset.id);
      if (row) openEditScoreModal(row);
    });
  });
}

function openEditScoreModal(row) {
  openModal(`<div class="admin-panel">
    <p class="modal-kicker">SỬA ĐIỂM</p>
    <h2>${escapeHtml(row.student_directory?.full_name || 'Học sinh')}</h2>
    <form id="editScoreForm" class="admin-form">
      <label>Loại điểm<select name="kind"><option value="plus" ${row.kind === 'plus' ? 'selected' : ''}>Cộng</option><option value="minus" ${row.kind === 'minus' ? 'selected' : ''}>Trừ</option></select></label>
      <label>Số điểm<input name="points" type="number" min="1" max="30" value="${row.points}" required /></label>
      <label>Tuần<input name="weekStart" type="date" value="${row.week_start}" required /></label>
      <label>Lý do / ghi chú<textarea name="reason" maxlength="400" required>${escapeHtml(row.reason)}</textarea></label>
      <button class="button button-primary" type="submit">Lưu thay đổi</button>
      <p class="admin-status" id="editScoreStatus" role="status"></p>
    </form>
  </div>`);

  document.getElementById('editScoreForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const status = document.getElementById('editScoreStatus');
    status.textContent = 'Đang lưu…';
    const { error } = await window.supabase.from('competition_records').update({
      kind: values.get('kind'),
      points: Number(values.get('points')),
      week_start: values.get('weekStart'),
      reason: values.get('reason')
    }).eq('id', row.id);
    status.textContent = error ? `Lỗi: ${error.message}` : 'Đã cập nhật.';
    if (!error) {
      modal.close();
      loadJournalRows();
    }
  });
}

/* --- Pane: Chốt tuần --- */
async function renderWeeklyPane() {
  const pane = document.getElementById('pane-weekly');
  const monday = mondayOf();

  pane.innerHTML = `
    <div class="admin-card">
      <p class="card-kicker">ĐIỂM TẬP THỂ</p>
      <h2>Chốt điểm tuần</h2>
      <p class="pane-desc">Điểm đã chốt sẽ hiển thị trên trang chủ cho cả lớp. Có thể cập nhật lại nếu cần.</p>
      <form id="weeklyForm" class="admin-form">
        <div class="two-columns">
          <label>Tuần (thứ Hai)<input name="weekStart" type="date" value="${monday}" required /></label>
          <label>Điểm tập thể (0–100)<input name="score" type="number" min="0" max="100" step="0.1" value="96.5" required /></label>
        </div>
        <label>Ghi chú (tuỳ chọn)<input name="note" maxlength="200" placeholder="Ví dụ: tuần đầu năm, nề nếp ổn định" /></label>
        <div class="admin-actions-row">
          <button class="button button-primary" type="submit">Chốt / cập nhật tuần</button>
          <button class="button button-secondary" type="button" id="suggestWeekly">Gợi ý từ bản ghi cá nhân</button>
        </div>
        <p class="admin-status" id="weeklyStatus" role="status"></p>
      </form>
      <hr class="admin-divider" />
      <p class="card-kicker">CÁC TUẦN ĐÃ CHỐT</p>
      <ul class="record-list" id="weeklyHistory"><li>Đang tải…</li></ul>
    </div>`;

  document.getElementById('weeklyForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const status = document.getElementById('weeklyStatus');
    status.textContent = 'Đang lưu…';
    const payload = {
      week_start: values.get('weekStart'),
      score: Number(values.get('score')),
      note: values.get('note') || '',
      locked: true,
      created_by: adminUser.id,
      updated_at: new Date().toISOString()
    };
    const { error } = await window.supabase.from('weekly_class_scores')
      .upsert(payload, { onConflict: 'week_start' });
    status.textContent = error
      ? `Không chốt được: ${error.message}. Hãy chạy migration phase1 trên Supabase.`
      : 'Đã chốt điểm tuần. Trang chủ sẽ cập nhật số này.';
    if (!error) {
      loadWeeklyHistory();
      refreshWeekCard();
      refreshAdminAlerts();
    }
  });

  document.getElementById('suggestWeekly').addEventListener('click', async () => {
    const week = document.querySelector('#weeklyForm [name=weekStart]').value || mondayOf();
    const status = document.getElementById('weeklyStatus');
    const { data, error } = await window.supabase.from('competition_records')
      .select('kind, points')
      .eq('week_start', week);
    if (error || !data?.length) {
      status.textContent = 'Chưa có bản ghi cá nhân tuần này để gợi ý.';
      return;
    }
    let plus = 0;
    let minus = 0;
    data.forEach((i) => { if (i.kind === 'plus') plus += i.points; else minus += i.points; });
    const suggested = Math.max(0, Math.min(100, 100 + (plus - minus) * 0.5)).toFixed(1);
    document.querySelector('#weeklyForm [name=score]').value = suggested;
    status.textContent = `Gợi ý ${suggested} từ ${data.length} bản ghi (cộng ${plus} / trừ ${minus}). Bạn có thể chỉnh trước khi chốt.`;
  });

  await loadWeeklyHistory();
}

async function loadWeeklyHistory() {
  const list = document.getElementById('weeklyHistory');
  if (!list) return;
  const { data, error } = await window.supabase.from('weekly_class_scores')
    .select('week_start, score, note, updated_at')
    .order('week_start', { ascending: false })
    .limit(20);
  if (error) {
    list.innerHTML = `<li>Chưa có bảng điểm tuần hoặc lỗi: ${escapeHtml(error.message)}</li>`;
    return;
  }
  if (!data?.length) {
    list.innerHTML = '<li>Chưa chốt tuần nào.</li>';
    return;
  }
  list.innerHTML = data.map((w) => `<li><span><b>Tuần ${w.week_start}</b><small>${escapeHtml(w.note) || 'Không ghi chú'} · ${formatDateVi(w.updated_at)}</small></span><b class="positive">${Number(w.score).toFixed(1)}</b></li>`).join('');
}

/* --- Pane: Báo cáo tuần (Phase 3) --- */
let reportCache = { week: '', rows: [], official: null, byStudent: [] };

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadCsv(filename, headers, rows) {
  const lines = [headers.map(csvEscape).join(',')];
  rows.forEach((row) => lines.push(row.map(csvEscape).join(',')));
  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function renderReportPane() {
  const pane = document.getElementById('pane-report');
  pane.innerHTML = `
    <div class="admin-card">
      <p class="card-kicker">BÁO CÁO TUẦN</p>
      <h2>Xuất CSV &amp; in</h2>
      <p class="pane-desc">Chọn tuần (ngày thứ Hai), xem tóm tắt rồi xuất file hoặc in để lưu sổ / gửi phụ huynh.</p>
      <div class="journal-filters report-filters">
        <label>Tuần (thứ Hai)<input type="date" id="reportWeek" value="${mondayOf()}" /></label>
        <button type="button" class="button button-secondary" id="reportLoad">Tải báo cáo</button>
        <button type="button" class="button button-primary" id="reportCsv" disabled>Tải CSV</button>
        <button type="button" class="button button-secondary" id="reportPrint" disabled>In báo cáo</button>
      </div>
      <p class="admin-status" id="reportStatus">Chọn tuần rồi bấm Tải báo cáo.</p>
      <div id="reportPreview" class="report-preview"></div>
    </div>`;

  document.getElementById('reportLoad').addEventListener('click', loadReportData);
  document.getElementById('reportCsv').addEventListener('click', exportReportCsv);
  document.getElementById('reportPrint').addEventListener('click', printReport);
  await loadReportData();
}

async function loadReportData() {
  const week = document.getElementById('reportWeek')?.value || mondayOf();
  const status = document.getElementById('reportStatus');
  const preview = document.getElementById('reportPreview');
  const csvBtn = document.getElementById('reportCsv');
  const printBtn = document.getElementById('reportPrint');
  if (!status || !preview) return;

  status.textContent = 'Đang tải…';
  preview.innerHTML = '';
  csvBtn.disabled = true;
  printBtn.disabled = true;

  const [recordsRes, officialRes] = await Promise.all([
    window.supabase.from('competition_records')
      .select('kind, points, reason, week_start, student_id, student_directory(full_name)')
      .eq('week_start', week)
      .order('created_at', { ascending: true }),
    window.supabase.from('weekly_class_scores')
      .select('score, note, locked')
      .eq('week_start', week)
      .maybeSingle()
  ]);

  if (recordsRes.error) {
    status.textContent = `Lỗi tải điểm: ${recordsRes.error.message}`;
    return;
  }

  const rows = recordsRes.data || [];
  const official = officialRes.data || null;
  const map = new Map();
  rows.forEach((item) => {
    const name = item.student_directory?.full_name || 'Học sinh';
    const cur = map.get(item.student_id) || { name, plus: 0, minus: 0, net: 0, count: 0 };
    if (item.kind === 'plus') cur.plus += item.points;
    else cur.minus += item.points;
    cur.net = cur.plus - cur.minus;
    cur.count += 1;
    map.set(item.student_id, cur);
  });
  const byStudent = [...map.values()].sort((a, b) => b.net - a.net || a.name.localeCompare(b.name, 'vi'));

  reportCache = { week, rows, official, byStudent };

  const weekLabel = weekRangeLabel(week);
  const weekNo = String(weekNumberFromMonday(week)).padStart(2, '0');
  const classScore = official?.locked
    ? `${Number(official.score).toFixed(1)} (đã chốt)`
    : 'Chưa chốt';

  if (!rows.length && !official) {
    status.textContent = 'Tuần này chưa có bản ghi điểm và chưa chốt tập thể.';
    preview.innerHTML = `<div class="report-summary"><p>Tuần ${weekNo} · ${weekLabel}</p><p class="empty-state">Không có dữ liệu để xuất.</p></div>`;
    return;
  }

  status.textContent = `${rows.length} bản ghi · ${byStudent.length} học sinh có điểm · Điểm tập thể: ${classScore}`;
  csvBtn.disabled = false;
  printBtn.disabled = false;

  const studentRows = byStudent.map((s, i) => {
    const total = STUDENT_BASE_SCORE + s.net;
    return `
    <tr>
      <td>${i + 1}</td>
      <td>${escapeHtml(s.name)}</td>
      <td class="positive">+${s.plus}</td>
      <td class="negative">−${s.minus}</td>
      <td class="${s.net >= 0 ? 'positive' : 'negative'}">${s.net >= 0 ? '+' : ''}${s.net}</td>
      <td><b>${total}</b></td>
      <td>${s.count}</td>
    </tr>`;
  }).join('');

  const detailRows = rows.map((r) => `
    <tr>
      <td>${escapeHtml(r.student_directory?.full_name || '—')}</td>
      <td class="${r.kind === 'plus' ? 'positive' : 'negative'}">${r.kind === 'plus' ? '+' : '−'}${r.points}</td>
      <td>${escapeHtml(r.reason)}</td>
    </tr>`).join('');

  preview.innerHTML = `
    <div class="report-summary" id="reportPrintArea">
      <div class="report-head">
        <div>
          <p class="card-kicker">LỚP 10 TIN · THPT CHUYÊN LÊ QUÝ ĐÔN</p>
          <h3>Báo cáo thi đua tuần ${weekNo}</h3>
          <p>${weekLabel}</p>
        </div>
        <div class="report-class-score">
          <span>Điểm tập thể</span>
          <strong>${official?.locked ? Number(official.score).toFixed(1) : '—'}</strong>
          <small>${official?.locked ? (escapeHtml(official.note) || 'Đã chốt') : 'Chưa chốt'}</small>
        </div>
      </div>
      <h4>Tổng hợp theo học sinh (gốc ${STUDENT_BASE_SCORE})</h4>
      <div class="journal-table-wrap">
        <table class="journal-table">
          <thead><tr><th>#</th><th>Họ tên</th><th>Cộng</th><th>Trừ</th><th>Ròng</th><th>Tổng</th><th>Số lần</th></tr></thead>
          <tbody>${studentRows || `<tr><td colspan="7">Không có bản ghi cá nhân.</td></tr>`}</tbody>
        </table>
      </div>
      <h4>Chi tiết bản ghi</h4>
      <div class="journal-table-wrap">
        <table class="journal-table">
          <thead><tr><th>Học sinh</th><th>Điểm</th><th>Nội dung</th></tr></thead>
          <tbody>${detailRows || '<tr><td colspan="3">Không có chi tiết.</td></tr>'}</tbody>
        </table>
      </div>
      <p class="report-footer-note">Xuất lúc ${new Date().toLocaleString('vi-VN')} · Chỉ dùng nội bộ lớp</p>
    </div>`;
}

function exportReportCsv() {
  const { week, rows, official, byStudent } = reportCache;
  if (!week) return;
  const weekNo = String(weekNumberFromMonday(week)).padStart(2, '0');

  // File 1 style: one CSV with summary + detail sections via type column
  const headers = ['Loại dòng', 'Tuần', 'Họ tên', 'Cộng', 'Trừ', 'Ròng', 'Tổng (gốc 100)', 'Số lần', 'Điểm', 'Nội dung', 'Điểm tập thể', 'Ghi chú tập thể'];
  const out = [];
  out.push([
    'TẬP THỂ', week, '', '', '', '', '', '',
    official?.locked ? Number(official.score).toFixed(1) : '',
    '',
    official?.locked ? Number(official.score).toFixed(1) : 'Chưa chốt',
    official?.note || ''
  ]);
  byStudent.forEach((s) => {
    out.push(['TỔNG HỢP', week, s.name, s.plus, s.minus, s.net, STUDENT_BASE_SCORE + s.net, s.count, '', '', '', '']);
  });
  rows.forEach((r) => {
    out.push([
      'CHI TIẾT',
      week,
      r.student_directory?.full_name || '',
      r.kind === 'plus' ? r.points : '',
      r.kind === 'minus' ? r.points : '',
      '',
      '',
      '',
      r.kind === 'plus' ? `+${r.points}` : `-${r.points}`,
      r.reason,
      '',
      ''
    ]);
  });
  downloadCsv(`bao-cao-tuan-${weekNo}-${week}.csv`, headers, out);
  const status = document.getElementById('reportStatus');
  if (status) status.textContent = `Đã tải CSV tuần ${weekNo} (${out.length} dòng).`;
}

function printReport() {
  const area = document.getElementById('reportPrintArea');
  if (!area) return;
  const { week } = reportCache;
  const weekNo = week ? String(weekNumberFromMonday(week)).padStart(2, '0') : '';
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!win) {
    const status = document.getElementById('reportStatus');
    if (status) status.textContent = 'Trình duyệt chặn cửa sổ in. Hãy cho phép popup rồi thử lại.';
    return;
  }
  win.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8" />
    <title>Báo cáo tuần ${weekNo}</title>
    <style>
      body{font-family:system-ui,-apple-system,sans-serif;color:#17251f;margin:24px;font-size:13px;line-height:1.45}
      h3{font-size:22px;margin:4px 0 6px}
      h4{margin:22px 0 8px;font-size:14px}
      .report-head{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #164c39;padding-bottom:14px;margin-bottom:16px}
      .card-kicker{font-size:10px;letter-spacing:.12em;font-weight:800;color:#66736d;margin:0}
      .report-class-score{text-align:right}
      .report-class-score span{display:block;font-size:11px;color:#66736d}
      .report-class-score strong{font-size:32px;line-height:1.1}
      .report-class-score small{display:block;color:#66736d}
      table{width:100%;border-collapse:collapse;margin-bottom:8px}
      th,td{border:1px solid #d9d5c9;padding:7px 9px;text-align:left;vertical-align:top}
      th{background:#f5f0e5;font-size:11px}
      .positive{color:#287357} .negative{color:#a34638}
      .report-footer-note{margin-top:20px;font-size:11px;color:#66736d}
      @media print{body{margin:12mm}}
    </style></head><body>${area.innerHTML}
    <script>window.onload=function(){window.print();}</script>
    </body></html>`);
  win.document.close();
}

/* --- Pane: Lịch sự kiện --- */
function renderEventsPane() {
  const pane = document.getElementById('pane-events');
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  pane.innerHTML = `
    <div class="admin-grid-2">
      <div class="admin-card">
        <p class="card-kicker">LỊCH LỚP</p>
        <h2>Thêm sự kiện</h2>
        <form id="eventForm" class="admin-form">
          <label>Tiêu đề<input name="title" maxlength="160" required placeholder="Họp lớp đầu năm" /></label>
          <label>Thời điểm<input name="eventAt" type="datetime-local" value="${local}" required /></label>
          <label>Mô tả ngắn<input name="description" maxlength="240" placeholder="Tiết sinh hoạt, phòng…" /></label>
          <button class="button button-primary" type="submit">Lưu sự kiện</button>
          <p class="admin-status" id="eventStatus" role="status"></p>
        </form>
      </div>
      <div class="admin-card">
        <p class="card-kicker">SẮP TỚI & ĐÃ LƯU</p>
        <h2>Danh sách lịch</h2>
        <p class="admin-status" id="eventListStatus">Đang tải…</p>
        <ul class="record-list" id="eventManageList"></ul>
      </div>
    </div>`;

  document.getElementById('eventForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const status = document.getElementById('eventStatus');
    status.textContent = 'Đang lưu…';
    const iso = new Date(values.get('eventAt')).toISOString();
    const { error } = await window.supabase.from('events').insert({
      title: values.get('title'),
      event_at: iso,
      description: values.get('description') || '',
      created_by: adminUser.id
    });
    status.textContent = error ? `Không lưu được: ${error.message}` : 'Đã thêm sự kiện.';
    if (!error) {
      event.currentTarget.reset();
      event.currentTarget.elements.eventAt.value = local;
      loadEventManageList();
      refreshWebsiteEvents();
    }
  });
  loadEventManageList();
}

async function loadEventManageList() {
  const list = document.getElementById('eventManageList');
  const status = document.getElementById('eventListStatus');
  if (!list || !status) return;
  status.textContent = 'Đang tải…';
  const { data, error } = await window.supabase.from('events')
    .select('id, title, event_at, description')
    .order('event_at', { ascending: true })
    .limit(40);
  if (error) {
    status.textContent = `Lỗi: ${error.message}`;
    return;
  }
  if (!data?.length) {
    status.textContent = 'Chưa có sự kiện.';
    list.innerHTML = '';
    return;
  }
  status.textContent = `${data.length} sự kiện`;
  list.innerHTML = data.map((ev) => {
    const d = new Date(ev.event_at);
    const label = d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `<li>
      <span><b>${escapeHtml(ev.title)}</b><small>${label}${ev.description ? ' · ' + escapeHtml(ev.description) : ''}</small></span>
      <span class="row-actions">
        <button type="button" class="link-button edit-event" data-id="${ev.id}">Sửa</button>
        <button type="button" class="link-button danger-link delete-event" data-id="${ev.id}">Xóa</button>
      </span>
    </li>`;
  }).join('');
  list.querySelectorAll('.delete-event').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Xóa sự kiện này?')) return;
      const { error: delError } = await window.supabase.from('events').delete().eq('id', btn.dataset.id);
      if (delError) {
        status.textContent = `Không xóa được: ${delError.message}`;
        return;
      }
      loadEventManageList();
      refreshWebsiteEvents();
    });
  });
  list.querySelectorAll('.edit-event').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ev = data.find((item) => item.id === btn.dataset.id);
      if (ev) openEditEventModal(ev);
    });
  });
}

function toLocalInputValue(iso) {
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function openEditEventModal(ev) {
  openModal(`<div class="admin-panel">
    <p class="modal-kicker">SỬA LỊCH</p>
    <h2>Cập nhật sự kiện</h2>
    <form id="editEventForm" class="admin-form">
      <label>Tiêu đề<input name="title" maxlength="160" required value="${escapeHtml(ev.title)}" /></label>
      <label>Thời điểm<input name="eventAt" type="datetime-local" required value="${toLocalInputValue(ev.event_at)}" /></label>
      <label>Mô tả ngắn<input name="description" maxlength="240" value="${escapeHtml(ev.description || '')}" /></label>
      <button class="button button-primary" type="submit">Lưu thay đổi</button>
      <p class="admin-status" id="editEventStatus" role="status"></p>
    </form>
  </div>`);
  document.getElementById('editEventForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const status = document.getElementById('editEventStatus');
    status.textContent = 'Đang lưu…';
    const { error } = await window.supabase.from('events').update({
      title: values.get('title'),
      event_at: new Date(values.get('eventAt')).toISOString(),
      description: values.get('description') || ''
    }).eq('id', ev.id);
    status.textContent = error ? `Lỗi: ${error.message}` : 'Đã cập nhật.';
    if (!error) {
      modal.close();
      loadEventManageList();
      refreshWebsiteEvents();
    }
  });
}

async function refreshWebsiteEvents() {
  const stack = document.getElementById('eventsStack');
  if (!stack) return;
  if (!window.supabase) {
    stack.innerHTML = '<p class="empty-state">Chưa kết nối dữ liệu.</p>';
    return;
  }
  const from = new Date();
  from.setDate(from.getDate() - 1);
  const { data, error } = await window.supabase.from('events')
    .select('title, event_at, description')
    .gte('event_at', from.toISOString())
    .order('event_at', { ascending: true })
    .limit(6);
  if (error) {
    stack.innerHTML = `<p class="empty-state">Không tải lịch. ${escapeHtml(error.message)}</p>`;
    return;
  }
  if (!data?.length) {
    stack.innerHTML = '<p class="empty-state">Chưa có lịch sắp tới. Admin thêm ở Khu quản trị → Lịch.</p>';
    return;
  }
  const months = ['THG 01', 'THG 02', 'THG 03', 'THG 04', 'THG 05', 'THG 06', 'THG 07', 'THG 08', 'THG 09', 'THG 10', 'THG 11', 'THG 12'];
  stack.innerHTML = data.map((ev) => {
    const d = new Date(ev.event_at);
    const day = String(d.getDate()).padStart(2, '0');
    const mon = months[d.getMonth()];
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `<article class="event-card">
      <p class="date-box"><b>${day}</b><span>${mon}</span></p>
      <div><p class="event-type">${time}</p><h3>${escapeHtml(ev.title)}</h3><span>${escapeHtml(ev.description) || 'Sự kiện lớp'}</span></div>
    </article>`;
  }).join('');
}

/* --- Pane: Nội dung --- */
function renderContentPane() {
  const pane = document.getElementById('pane-content');
  pane.innerHTML = `
    <div class="admin-card content-admin">
      <p class="card-kicker">TRUYỀN THÔNG</p>
      <h2>Quản lý nội dung</h2>
      <div class="admin-tabs">
        <button type="button" class="admin-tab active" data-tab="create">Đăng mới</button>
        <button type="button" class="admin-tab" data-tab="list">Danh sách & sửa</button>
      </div>
      <div id="contentCreatePane">
        <form id="contentForm" class="admin-form">
          <label>Loại nội dung<select name="kind">
            <option value="study">Thông báo học tập (dặn dò)</option>
            <option value="announcement">Thông báo lớp</option>
            <option value="blog">Blog lớp</option>
            <option value="facebook">Facebook</option>
            <option value="tiktok">TikTok</option>
          </select></label>
          <p class="pane-desc">Chọn <b>Thông báo học tập</b> + <b>Ngày cần nhớ</b> (ngày KT / hạn nộp). Đúng ngày đó mục sẽ tự nổi “Hôm nay”.</p>
          <label>Tiêu đề<input name="title" maxlength="180" required placeholder="VD: Thứ 5 · Kiểm tra 15 phút Sử" /></label>
          <label>Nội dung/tóm tắt<textarea name="body" maxlength="3000" placeholder="Ôn chương … / Bài 1–2–3 trang 15"></textarea></label>
          <label id="relevantOnWrap">Ngày cần nhớ (ngày KT / hạn nộp)<input name="relevantOn" type="date" /></label>
          <div class="two-columns">
            <label>Liên kết<input name="externalUrl" type="url" placeholder="https://..." /></label>
            <label>Ảnh bìa (URL)<input name="coverUrl" type="url" placeholder="https://..." /></label>
          </div>
          <label class="checkbox-row"><input name="published" type="checkbox" checked /> Xuất bản ngay</label>
          <button class="button button-primary" type="submit">Lưu nội dung <span>→</span></button>
          <p class="admin-status" id="contentStatus" role="status"></p>
        </form>
      </div>
      <div id="contentListPane" hidden>
        <p class="admin-status" id="contentListStatus">Đang tải…</p>
        <ul class="content-manage-list" id="contentManageList"></ul>
      </div>
    </div>`;

  const createPane = document.getElementById('contentCreatePane');
  const listPane = document.getElementById('contentListPane');
  document.querySelectorAll('#pane-content .admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#pane-content .admin-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const isList = tab.dataset.tab === 'list';
      createPane.hidden = isList;
      listPane.hidden = !isList;
      if (isList) loadContentList();
    });
  });

  const kindSelect = document.querySelector('#contentForm [name=kind]');
  const relevantWrap = document.getElementById('relevantOnWrap');
  function syncRelevantField() {
    if (!relevantWrap) return;
    relevantWrap.hidden = kindSelect?.value !== 'study';
  }
  kindSelect?.addEventListener('change', syncRelevantField);
  syncRelevantField();

  document.getElementById('contentForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const status = document.getElementById('contentStatus');
    const published = values.get('published') === 'on';
    const kind = values.get('kind');
    status.textContent = 'Đang lưu…';
    const payload = {
      kind,
      title: values.get('title'),
      body: values.get('body') || '',
      external_url: values.get('externalUrl') || null,
      cover_url: values.get('coverUrl') || null,
      is_published: published,
      published_at: published ? new Date().toISOString() : null,
      created_by: adminUser.id,
      relevant_on: kind === 'study' && values.get('relevantOn') ? values.get('relevantOn') : null
    };
    const { error } = await window.supabase.from('content_posts').insert(payload);
    status.textContent = error
      ? `Không thể lưu: ${error.message}${String(error.message).includes('relevant_on') ? ' — Chạy migration study-date.' : ''}`
      : (published ? 'Đã xuất bản trên website.' : 'Đã lưu nháp.');
    if (!error) {
      event.currentTarget.reset();
      if (kindSelect) kindSelect.value = 'study';
      syncRelevantField();
      await refreshWebsiteAnnouncements();
      await refreshWebsiteStudyPosts();
    }
  });
}

async function loadContentList() {
  const listEl = document.getElementById('contentManageList');
  const status = document.getElementById('contentListStatus');
  if (!listEl || !status) return;
  status.textContent = 'Đang tải…';
  listEl.innerHTML = '';
  const { data, error } = await window.supabase.from('content_posts')
    .select('id, kind, title, body, external_url, cover_url, is_published, published_at, created_at, relevant_on')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    status.textContent = `Không tải được: ${error.message}`;
    return;
  }
  if (!data?.length) {
    status.textContent = 'Chưa có nội dung nào.';
    return;
  }
  status.textContent = `${data.length} bài (tối đa 50 gần nhất)`;
  listEl.innerHTML = data.map((post) => {
    const state = post.is_published ? 'Đã xuất bản' : 'Nháp';
    const date = formatDateVi(post.published_at || post.created_at);
    return `<li data-id="${post.id}">
      <span><b>${escapeHtml(post.title)}</b><small>${escapeHtml(post.kind)} · ${state} · ${date}</small></span>
      <span class="row-actions">
        <button type="button" class="link-button edit-content" data-id="${post.id}">Sửa</button>
        <button type="button" class="link-button danger-link delete-content" data-id="${post.id}">Xóa</button>
      </span>
    </li>`;
  }).join('');

  listEl.querySelectorAll('.delete-content').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('Xóa vĩnh viễn bài này?')) return;
      btn.disabled = true;
      const { error: delError } = await window.supabase.from('content_posts').delete().eq('id', btn.dataset.id);
      if (delError) {
        btn.disabled = false;
        status.textContent = `Không xóa được: ${delError.message}`;
        return;
      }
      await refreshWebsiteAnnouncements();
      await refreshWebsiteStudyPosts();
      loadContentList();
    });
  });
  listEl.querySelectorAll('.edit-content').forEach((btn) => {
    btn.addEventListener('click', () => {
      const post = data.find((item) => item.id === btn.dataset.id);
      if (post) openEditContentModal(post);
    });
  });
}

function openEditContentModal(post) {
  openModal(`<div class="admin-panel">
    <p class="modal-kicker">SỬA NỘI DUNG</p>
    <h2>Cập nhật bài</h2>
    <form id="editContentForm" class="admin-form">
      <label>Loại nội dung<select name="kind">
        <option value="study" ${post.kind === 'study' ? 'selected' : ''}>Thông báo học tập (dặn dò)</option>
        <option value="announcement" ${post.kind === 'announcement' ? 'selected' : ''}>Thông báo lớp</option>
        <option value="blog" ${post.kind === 'blog' ? 'selected' : ''}>Blog lớp</option>
        <option value="facebook" ${post.kind === 'facebook' ? 'selected' : ''}>Facebook</option>
        <option value="tiktok" ${post.kind === 'tiktok' ? 'selected' : ''}>TikTok</option>
      </select></label>
      <label>Tiêu đề<input name="title" maxlength="180" required value="${escapeHtml(post.title)}" /></label>
      <label>Nội dung/tóm tắt<textarea name="body" maxlength="3000">${escapeHtml(post.body || '')}</textarea></label>
      <label>Ngày cần nhớ (học tập)<input name="relevantOn" type="date" value="${post.relevant_on || ''}" /></label>
      <div class="two-columns">
        <label>Liên kết<input name="externalUrl" type="url" value="${escapeHtml(post.external_url || '')}" placeholder="https://..." /></label>
        <label>Ảnh bìa (URL)<input name="coverUrl" type="url" value="${escapeHtml(post.cover_url || '')}" placeholder="https://..." /></label>
      </div>
      <label class="checkbox-row"><input name="published" type="checkbox" ${post.is_published ? 'checked' : ''} /> Xuất bản (bỏ tick = về nháp)</label>
      <button class="button button-primary" type="submit">Lưu thay đổi</button>
      <p class="admin-status" id="editContentStatus" role="status"></p>
    </form>
  </div>`);
  document.getElementById('editContentForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const status = document.getElementById('editContentStatus');
    const published = values.get('published') === 'on';
    const kind = values.get('kind');
    status.textContent = 'Đang lưu…';
    const payload = {
      kind,
      title: values.get('title'),
      body: values.get('body') || '',
      external_url: values.get('externalUrl') || null,
      cover_url: values.get('coverUrl') || null,
      is_published: published,
      published_at: published ? (post.published_at || new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
      relevant_on: kind === 'study' && values.get('relevantOn') ? values.get('relevantOn') : null
    };
    const { error } = await window.supabase.from('content_posts').update(payload).eq('id', post.id);
    status.textContent = error ? `Lỗi: ${error.message}` : (published ? 'Đã lưu & xuất bản.' : 'Đã lưu về nháp.');
    if (!error) {
      modal.close();
      await refreshWebsiteAnnouncements();
      await refreshWebsiteStudyPosts();
      loadContentList();
    }
  });
}

/* ---------- Entry points ---------- */
bindAdminButton();

document.getElementById('showAllScores').addEventListener('click', () => openFullRankingModal());

const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.main-nav');
menuButton.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', open);
});
nav.querySelectorAll('a').forEach((item) => item.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton.setAttribute('aria-expanded', false);
}));

function bootData() {
  refreshAuthHeader();
  refreshWeekCard();
  refreshWeeklyRanking();
  refreshWebsiteStudyPosts();
  refreshWebsiteAnnouncements();
  refreshWebsiteEvents();
}
window.addEventListener('supabase-ready', bootData);
if (window.supabase) bootData();
else {
  refreshWeekCard();
  refreshWebsiteStudyPosts();
  refreshWebsiteAnnouncements();
  refreshWebsiteEvents();
}
