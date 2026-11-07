/* ================= KHO DỮ LIỆU DI ĐỘNG · app.js =================
   Tủ (cabinets) → Ngăn (drawers) → Hồ sơ (items) + Nhật ký (journal_entries)
   Toàn bộ dữ liệu đọc/ghi trực tiếp trên Supabase.
================================================================== */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const cfg = window.SUPABASE_CONFIG || {};
const configured = /^https:\/\//.test(cfg.url || '') && !cfg.url.includes('YOUR-PROJECT') && cfg.publishableKey && !cfg.publishableKey.includes('YOUR-');
const BUCKET = 'kho-files';
const COLORS = { cyan: '#3ee8ff', amber: '#ffb547', green: '#4dffa6', red: '#ff5d73', violet: '#a98bff' };

let sb = null;
const S = { user: null, cabinets: [], drawers: [], counts: {}, journalCount: 0, openDrawer: null };

/* ---------- Ngày giờ (theo giờ máy, tránh lệch múi giờ) ---------- */
const pad = (n) => String(n).padStart(2, '0');
const isoLocal = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => isoLocal(new Date());
const parseDay = (s) => new Date(s + 'T00:00:00');
const fmtDay = (s) => { const d = parseDay(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const fmtDT = (s) => { const d = new Date(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtTime = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const fmtSize = (b) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

/* ---------- Thông báo nhỏ ---------- */
function toast(text, err = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = text;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), err ? 6000 : 3000);
}
function fail(error, what = 'Lỗi') {
  console.error(error);
  let m = error?.message || String(error);
  if (/relation .* does not exist|Could not find the table|schema cache/i.test(m)) m = 'Chưa có bảng trên Supabase — hãy chạy setup.sql (xem HUONG-DAN.md).';
  if (/Bucket not found/i.test(m)) m = 'Chưa có kho file — hãy chạy lại setup.sql.';
  if (/Failed to fetch|NetworkError/i.test(m)) { m = 'Mất kết nối mạng.'; setNet(false); }
  toast(`${what}: ${m}`, true);
}
function setNet(ok) {
  $('#netLed').className = 'led ' + (ok ? 'on' : 'off');
  $('#netText').textContent = ok ? 'ĐÃ KẾT NỐI' : 'MẤT KẾT NỐI';
}

/* ---------- Hộp thoại phụ ---------- */
const sheet = $('#sheet');
function openSheet(html, { wide = false } = {}) {
  $('#sheetBody').innerHTML = html;
  sheet.classList.toggle('wide', wide);
  if (!sheet.open) sheet.showModal();
  $$('[data-close]', sheet).forEach((b) => b.addEventListener('click', closeSheet));
  return $('#sheetBody');
}
function closeSheet() { if (sheet.open) sheet.close(); }
sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });

function confirmBox(text, okLabel = 'Xoá') {
  return new Promise((resolve) => {
    const body = openSheet(`<p class="kicker">XÁC NHẬN</p><h3>${esc(text)}</h3>
      <div class="acts"><button class="btn ghost" data-no>Huỷ</button><button class="btn danger" data-yes>${esc(okLabel)}</button></div>`);
    let done = false;
    const finish = (v) => { if (done) return; done = true; closeSheet(); resolve(v); };
    $('[data-yes]', body).onclick = () => finish(true);
    $('[data-no]', body).onclick = () => finish(false);
    sheet.addEventListener('close', () => finish(false), { once: true });
  });
}

function promptBox({ title, label, value = '', okLabel = 'Lưu', extra = '' }) {
  return new Promise((resolve) => {
    const body = openSheet(`<p class="kicker">NHẬP</p><h3>${esc(title)}</h3>
      <form class="form" data-f>
        <label class="f">${esc(label)}<input name="v" maxlength="60" required value="${esc(value)}" /></label>
        ${extra}
        <div class="acts"><button type="button" class="btn ghost" data-close>Huỷ</button><button class="btn primary">${esc(okLabel)}</button></div>
      </form>`);
    let done = false;
    const form = $('[data-f]', body);
    setTimeout(() => form.v.select(), 30);
    form.onsubmit = (e) => { e.preventDefault(); done = true; const d = Object.fromEntries(new FormData(form)); closeSheet(); resolve(d); };
    sheet.addEventListener('close', () => { if (!done) resolve(null); }, { once: true });
  });
}
const colorPicker = (cur = 'cyan') => `<div class="f">Màu đèn tủ<div class="colors">${Object.entries(COLORS).map(([k, v]) =>
  `<label title="${k}"><input type="radio" name="color" value="${k}" ${k === cur ? 'checked' : ''}/><span style="background:${v};color:${v}"></span></label>`).join('')}</div></div>`;

/* ================= KHỞI ĐỘNG ================= */
function startClock() { const tick = () => { $('#clock').textContent = fmtTime(); }; tick(); setInterval(tick, 1000); }

async function boot() {
  startClock();
  if (!configured || !window.supabase?.createClient) { $('#nocfg').hidden = false; return; }
  sb = window.supabase.createClient(cfg.url, cfg.publishableKey, { auth: { persistSession: true, autoRefreshToken: true } });
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') askNewPassword();
    if (event === 'SIGNED_OUT') showGate();
    if (event === 'SIGNED_IN' && session && !S.user) enterRoom(session.user, true);
  });
  const { data: { session } } = await sb.auth.getSession();
  if (session) enterRoom(session.user, false); else showGate();
  window.addEventListener('online', () => setNet(true));
  window.addEventListener('offline', () => setNet(false));
}

/* ================= CỔNG ĐĂNG NHẬP ================= */
let authMode = 'login';
async function showGate() {
  S.user = null;
  closeViewer(true);
  $('#room').hidden = true;
  const gate = $('#gate');
  gate.hidden = false;
  gate.classList.remove('closing');
  const log = $('#bootLog');
  log.textContent = '';
  const lines = ['> khởi động lõi lưu trữ ........ OK', `> liên kết ${new URL(cfg.url).host.split('.')[0]} ... OK`, '> mã hoá phiên ................. OK', '> chờ xác thực người dùng_'];
  for (const l of lines) { log.textContent += l + '\n'; await sleep(140); }
}

$$('.seg-btn').forEach((b) => b.addEventListener('click', () => {
  authMode = b.dataset.mode;
  $$('.seg-btn').forEach((x) => x.classList.toggle('on', x === b));
  $$('.signup-only').forEach((x) => { x.hidden = authMode !== 'signup'; });
  $('#authBtnText').textContent = authMode === 'signup' ? 'TẠO TÀI KHOẢN' : 'MỞ KHO';
  $('#authForm').password.autocomplete = authMode === 'signup' ? 'new-password' : 'current-password';
  $('#authForm').invite_code.required = authMode === 'signup';
  $('#authMsg').textContent = '';
}));

$('#authForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const msg = $('#authMsg');
  const btn = f.querySelector('button[type=submit]');
  msg.className = 'msg'; msg.textContent = '> đang xác thực...';
  btn.disabled = true;
  try {
    const email = f.email.value.trim();
    const password = f.password.value;
    if (authMode === 'login') {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      msg.className = 'msg ok'; msg.textContent = '> truy cập được chấp nhận';
    } else {
      const invite = f.invite_code.value.trim().toUpperCase();
      if (!invite) throw new Error('Cần nhập mã mời.');
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: f.full_name.value.trim(), invite_code: invite }, emailRedirectTo: location.href.split('#')[0] } });
      if (error) throw error;
      msg.className = 'msg ok';
      msg.textContent = data.session ? '> tạo tài khoản xong' : '> đã gửi email xác nhận — mở hộp thư rồi bấm link, sau đó quay lại đăng nhập.';
    }
  } catch (err) {
    let m = err.message || String(err);
    if (/Invalid login/i.test(m)) m = 'Sai email hoặc mật khẩu.';
    if (/Email not confirmed/i.test(m)) m = 'Email chưa xác nhận — kiểm tra hộp thư.';
    if (/already registered/i.test(m)) m = 'Email này đã có tài khoản.';
    if (/Database error saving new user|INVALID_INVITE_CODE/i.test(m)) m = 'Mã mời không đúng, đã hết hạn hoặc hết lượt dùng.';
    msg.className = 'msg'; msg.textContent = '> ' + m;
  } finally { btn.disabled = false; }
});

$('#forgotBtn').addEventListener('click', async () => {
  const email = $('#authForm').email.value.trim();
  const msg = $('#authMsg');
  if (!email) { msg.textContent = '> nhập email trước rồi bấm lại.'; return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] });
  msg.className = error ? 'msg' : 'msg ok';
  msg.textContent = error ? '> ' + error.message : '> đã gửi link đặt lại mật khẩu vào email.';
});

async function askNewPassword() {
  const body = openSheet(`<p class="kicker">ĐẶT LẠI MẬT KHẨU</p><h3>Nhập mật khẩu mới</h3>
    <form class="form" data-f><label class="f">Mật khẩu mới<input name="p" type="password" minlength="6" required autocomplete="new-password"/></label>
    <div class="acts"><button class="btn primary">Lưu mật khẩu</button></div></form>`);
  $('[data-f]', body).onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await sb.auth.updateUser({ password: e.currentTarget.p.value });
    if (error) return fail(error, 'Đổi mật khẩu');
    closeSheet(); toast('Đã đổi mật khẩu');
  };
}

/* ================= PHÒNG LƯU TRỮ ================= */
async function enterRoom(user, animate) {
  if (S.user?.id === user.id) return;
  S.user = user;
  if (animate && !$('#gate').hidden) { $('#gate').classList.add('closing'); await sleep(750); }
  $('#gate').hidden = true;
  $('#room').hidden = false;
  const name = user.user_metadata?.full_name || user.email.split('@')[0];
  $('#userName').textContent = name;
  $('#userRole').textContent = user.email;
  $('#userAvatar').textContent = (name.trim().split(/\s+/).pop() || '?')[0].toUpperCase();
  setNet(navigator.onLine);
  await loadRoom();
}

$('#logoutBtn').addEventListener('click', async () => { await flushJournal(); await sb.auth.signOut(); });
$('#userChip').addEventListener('click', openAccount);

async function loadRoom() {
  $('#cabinets').innerHTML = '<div class="loading">ĐANG MỞ KHO</div>';
  try {
    const [cabs, drs, items, jr] = await Promise.all([
      sb.from('cabinets').select('*').order('sort_order').order('created_at'),
      sb.from('drawers').select('*').order('sort_order').order('created_at'),
      sb.from('items').select('drawer_id'),
      sb.from('journal_entries').select('id', { count: 'exact', head: true }),
    ]);
    for (const r of [cabs, drs, items, jr]) if (r.error) throw r.error;
    setNet(true);
    S.cabinets = cabs.data;
    S.drawers = drs.data;
    S.counts = {};
    items.data.forEach((i) => { S.counts[i.drawer_id] = (S.counts[i.drawer_id] || 0) + 1; });
    S.journalCount = jr.count || 0;
    const td = await sb.from('todos').select('id', { count: 'exact', head: true }).eq('done', false);
    S.todoOpen = td.error ? null : (td.count || 0);
    if (td.error) console.warn('Chưa có bảng todos — chạy lại setup.sql', td.error);
    if (!S.cabinets.length) await seedStarter();
    renderRoom();
  } catch (err) {
    $('#cabinets').innerHTML = `<div class="empty">Không mở được kho.<br/>${esc(err.message)}</div>`;
    fail(err, 'Tải kho');
  }
}

// Lần đầu đăng nhập: tạo sẵn 1 tủ mẫu cho dễ hình dung
async function seedStarter() {
  const { data: cab, error } = await sb.from('cabinets').insert({ name: 'Tủ chung', color: 'cyan' }).select().single();
  if (error) throw error;
  const { data: drs, error: e2 } = await sb.from('drawers').insert([
    { cabinet_id: cab.id, name: 'Ghi chú', sort_order: 1 },
    { cabinet_id: cab.id, name: 'Tài liệu', sort_order: 2 },
  ]).select();
  if (e2) throw e2;
  S.cabinets = [cab];
  S.drawers = drs;
}

function renderStats() {
  const total = Object.values(S.counts).reduce((a, b) => a + b, 0);
  $('#stats').innerHTML = [
    [S.cabinets.length, 'Tủ'], [S.drawers.length, 'Ngăn'], [total, 'Hồ sơ'], [S.journalCount, 'Nhật ký'], [S.todoOpen || 0, 'To-do'],
  ].map(([n, l]) => `<div class="stat"><b>${String(n).padStart(2, '0')}</b><span>${l}</span></div>`).join('');
}

const VENTS = '<span class="vents" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>';
const LEDS = '<span class="leds" aria-hidden="true"><i></i><i></i></span>';
function unitBtn(attrs, name, sub, has) {
  return `<button class="drawer${has ? ' has' : ''}" type="button" ${attrs}>${VENTS}
    <span class="u-label"><b>${esc(name)}</b><small>${esc(sub)}</small></span>${LEDS}</button>`;
}
function drawerBtn(d, code) {
  const n = S.counts[d.id] || 0;
  return unitBtn(`data-drawer="${d.id}" data-code="${esc(code)}"`, d.name, `${code} · ${n} HỒ SƠ`, n > 0);
}
function rackHtml({ attrs = '', color, label, name, ctl = '', body, style = '' }) {
  return `<article class="cabinet" data-color="${esc(color)}" ${attrs} ${style}>
    <div class="rack-shadow"></div>
    <div class="rack">
      <div class="rack-top"><span class="rack-name"><small>${esc(label)}</small>${esc(name)}</span><span class="rack-ctl">${ctl}<span class="led on"></span></span></div>
      <div class="rack-body">${body}</div>
      <div class="rack-foot"></div>
    </div>
  </article>`;
}

function renderRoom() {
  renderStats();
  hidePeek();
  const letter = (i) => String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '');
  const todoSub = S.todoOpen == null ? 'CHƯA CÀI BẢNG' : `${S.todoOpen} CHƯA XONG`;
  const log = rackHtml({
    color: 'violet', label: 'TỦ LOG', name: 'NHẬT KÝ',
    body: unitBtn('data-journal', 'Nhật ký', `${S.journalCount} NGÀY`, S.journalCount > 0)
        + unitBtn('data-todo', 'Việc cần làm', todoSub, S.todoOpen > 0),
  });
  const cabs = S.cabinets.map((c, i) => {
    const L = letter(i);
    const drs = S.drawers.filter((d) => d.cabinet_id === c.id);
    return rackHtml({
      attrs: `data-cab="${c.id}"`, color: c.color, label: `TỦ ${L}`, name: c.name.toUpperCase(),
      style: `style="animation-delay:${(i + 1) * 60}ms"`,
      ctl: `<button class="icon-btn" data-cab-edit="${c.id}" title="Sửa tủ" aria-label="Sửa tủ">⚙</button>`,
      body: (drs.map((d, j) => drawerBtn(d, `${L}${j + 1}`)).join('') || '<p class="rack-empty">Tủ trống</p>')
        + `<button class="add-drawer" data-add-drawer="${c.id}">+ THÊM NGĂN</button>`,
    });
  }).join('');
  $('#cabinets').innerHTML = log + cabs + `<button class="cabinet ghost-cab" type="button" data-new-cab><span><b>+</b>THÊM TỦ MỚI</span></button>`;
}

$('#cabinets').addEventListener('click', async (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  if (t.dataset.drawer) return pullDrawer(t, () => openDrawer(t.dataset.drawer));
  if ('journal' in t.dataset) return pullDrawer(t, () => openJournal());
  if ('todo' in t.dataset) return pullDrawer(t, () => openTodo());
  if (t.dataset.addDrawer) return addDrawer(t.dataset.addDrawer);
  if (t.dataset.cabEdit) return editCabinet(t.dataset.cabEdit);
  if ('newCab' in t.dataset) return addCabinet();
});
$('#newCabinetBtn').addEventListener('click', addCabinet);

/* ---------- Xem trước khi rê chuột lên khay ---------- */
const peekEl = document.getElementById('peek');
const peekCache = new Map();          // khoá -> { at, html }
let peekTimer = null, peekFor = null;
const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
function hidePeek() { clearTimeout(peekTimer); peekFor = null; if (peekEl) peekEl.classList.remove('on'); }
function placePeek(btn) {
  const r = btn.getBoundingClientRect(), w = 300, gap = 14;
  let x = r.right + gap;
  if (x + w > innerWidth - 8) x = r.left - w - gap;
  if (x < 8) x = Math.min(innerWidth - w - 8, Math.max(8, r.left));
  peekEl.style.left = x + 'px';
  const h = peekEl.offsetHeight || 160;
  peekEl.style.top = Math.max(70, Math.min(innerHeight - h - 10, r.top + r.height / 2 - h / 2)) + 'px';
}
const shortDT = (s) => { const d = new Date(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
async function peekHtml(btn) {
  if (btn.dataset.drawer) {
    const d = S.drawers.find((x) => x.id === btn.dataset.drawer);
    const { data, error } = await sb.from('items').select('title, updated_at, pinned, attachments').eq('drawer_id', d.id)
      .order('pinned', { ascending: false }).order('updated_at', { ascending: false }).limit(5);
    if (error) throw error;
    const n = S.counts[d.id] || 0;
    return `<h4>${esc(d.name)}</h4><div class="pk-sub">NGĂN ${esc(btn.dataset.code)} · ${n} HỒ SƠ</div>`
      + (data.length ? `<ul>${data.map((i) => `<li><span>${i.pinned ? '📌 ' : ''}${esc(i.title || '(không tên)')}${(i.attachments || []).length ? ' 📎' : ''}</span><small>${shortDT(i.updated_at)}</small></li>`).join('')}</ul>`
        : '<p class="pk-empty">Ngăn trống.</p>')
      + `<div class="pk-foot">${n > data.length ? `+${n - data.length} HỒ SƠ KHÁC · ` : ''}BẤM ĐỂ KÉO NGĂN</div>`;
  }
  if ('journal' in btn.dataset) {
    const { data, error } = await sb.from('journal_entries').select('entry_date, title, body').order('entry_date', { ascending: false }).limit(4);
    if (error) throw error;
    const hasToday = data.some((e) => e.entry_date === today());
    return `<h4>Nhật ký</h4><div class="pk-sub">LOG-01 · ${S.journalCount} NGÀY${hasToday ? ' · ĐÃ GHI HÔM NAY' : ' · CHƯA GHI HÔM NAY'}</div>`
      + (data.length ? `<ul>${data.map((e) => `<li><span>${esc(e.title || e.body.split('\n')[0] || '(trống)')}</span><small>${fmtDay(e.entry_date).slice(0, 5)}</small></li>`).join('')}</ul>`
        : '<p class="pk-empty">Chưa có trang nào.</p>')
      + '<div class="pk-foot">BẤM ĐỂ MỞ · TỰ LƯU KHI GÕ</div>';
  }
  if ('todo' in btn.dataset) {
    if (S.todoOpen == null) return '<h4>Việc cần làm</h4><p class="pk-empty">Chưa có bảng todos — chạy lại setup.sql.</p>';
    const { data, error } = await sb.from('todos').select('text, done, due_on').eq('done', false)
      .order('due_on', { ascending: true }).order('created_at', { ascending: true }).limit(6);
    if (error) throw error;
    const t = today();
    return `<h4>Việc cần làm</h4><div class="pk-sub">TODO · ${S.todoOpen} VIỆC CHƯA XONG</div>`
      + (data.length ? `<ul>${data.map((x) => `<li class="${x.due_on && x.due_on < t ? 'late' : ''}"><span>☐ ${esc(x.text)}</span><small>${x.due_on ? (x.due_on < t ? 'TRỄ ' : '') + fmtDay(x.due_on).slice(0, 5) : ''}</small></li>`).join('')}</ul>`
        : '<p class="pk-empty">Không còn việc nào. 🎉</p>')
      + '<div class="pk-foot">BẤM ĐỂ MỞ DANH SÁCH</div>';
  }
  return '';
}
function peekKey(btn) { return btn.dataset.drawer || ('journal' in btn.dataset ? 'journal' : 'todo'); }
async function showPeek(btn) {
  const key = peekKey(btn);
  peekFor = key;
  let c = peekCache.get(key);
  if (!c || Date.now() - c.at > 30000) {
    peekEl.innerHTML = '<div class="loading" style="padding:10px">ĐANG ĐỌC</div>';
    peekEl.classList.add('on'); placePeek(btn);
    try { c = { at: Date.now(), html: await peekHtml(btn) }; peekCache.set(key, c); } catch (_) { c = { at: 0, html: '<p class="pk-empty">Không đọc được.</p>' }; }
  }
  if (peekFor !== key) return;
  peekEl.innerHTML = c.html;
  peekEl.classList.add('on');
  placePeek(btn);
}
if (canHover && peekEl) {
  $('#cabinets').addEventListener('mouseover', (e) => {
    const btn = e.target.closest('.drawer');
    if (!btn) return;
    if (peekFor === peekKey(btn) && peekEl.classList.contains('on')) return;
    clearTimeout(peekTimer);
    peekTimer = setTimeout(() => showPeek(btn), 220);
  });
  $('#cabinets').addEventListener('mouseout', (e) => {
    const btn = e.target.closest('.drawer');
    if (btn && !btn.contains(e.relatedTarget)) hidePeek();
  });
  window.addEventListener('scroll', hidePeek, { passive: true });
}

async function pullDrawer(btn, then) {
  hidePeek();
  btn.classList.add('pull');
  await sleep(260);
  btn.classList.remove('pull');
  then();
}

/* ---------- Tủ & ngăn: thêm / sửa / xoá ---------- */
async function addCabinet() {
  const r = await promptBox({ title: 'Tủ mới', label: 'Tên tủ', value: '', okLabel: 'Tạo tủ', extra: colorPicker('cyan') });
  if (!r) return;
  const { data, error } = await sb.from('cabinets').insert({ name: r.v.trim(), color: r.color || 'cyan', sort_order: S.cabinets.length + 1 }).select().single();
  if (error) return fail(error, 'Tạo tủ');
  S.cabinets.push(data);
  renderRoom(); toast('Đã thêm tủ ' + data.name);
}

async function editCabinet(id) {
  const c = S.cabinets.find((x) => x.id === id);
  const n = S.drawers.filter((d) => d.cabinet_id === id).length;
  const body = openSheet(`<p class="kicker">CÀI ĐẶT TỦ</p><h3>${esc(c.name)}</h3>
    <form class="form" data-f>
      <label class="f">Tên tủ<input name="name" maxlength="60" required value="${esc(c.name)}"/></label>
      ${colorPicker(c.color)}
      <div class="acts" style="justify-content:space-between">
        <button type="button" class="btn danger" data-del>Xoá tủ</button>
        <span><button type="button" class="btn ghost" data-close>Huỷ</button> <button class="btn primary">Lưu</button></span>
      </div>
    </form>`);
  const form = $('[data-f]', body);
  $$('[data-close]', body).forEach((b) => (b.onclick = closeSheet));
  form.onsubmit = async (e) => {
    e.preventDefault();
    const upd = { name: form.name.value.trim(), color: form.color.value };
    const { error } = await sb.from('cabinets').update(upd).eq('id', id);
    if (error) return fail(error, 'Sửa tủ');
    Object.assign(c, upd); closeSheet(); renderRoom();
  };
  $('[data-del]', body).onclick = async () => {
    const items = S.drawers.filter((d) => d.cabinet_id === id).reduce((a, d) => a + (S.counts[d.id] || 0), 0);
    if (!(await confirmBox(`Xoá tủ "${c.name}" cùng ${n} ngăn và ${items} hồ sơ bên trong?`))) return;
    await removeFilesOf(S.drawers.filter((d) => d.cabinet_id === id).map((d) => d.id));
    const { error } = await sb.from('cabinets').delete().eq('id', id);
    if (error) return fail(error, 'Xoá tủ');
    S.cabinets = S.cabinets.filter((x) => x.id !== id);
    S.drawers = S.drawers.filter((d) => d.cabinet_id !== id);
    renderRoom(); toast('Đã xoá tủ');
  };
}

async function addDrawer(cabId) {
  const r = await promptBox({ title: 'Ngăn mới', label: 'Tên ngăn', okLabel: 'Thêm ngăn' });
  if (!r) return;
  const sort = S.drawers.filter((d) => d.cabinet_id === cabId).length + 1;
  const { data, error } = await sb.from('drawers').insert({ cabinet_id: cabId, name: r.v.trim(), sort_order: sort }).select().single();
  if (error) return fail(error, 'Thêm ngăn');
  S.drawers.push(data); renderRoom();
}

// Xoá file trong Storage của các hồ sơ thuộc những ngăn sắp bị xoá
async function removeFilesOf(drawerIds) {
  if (!drawerIds.length) return;
  const { data } = await sb.from('items').select('attachments').in('drawer_id', drawerIds);
  const paths = (data || []).flatMap((i) => (i.attachments || []).map((a) => a.path));
  if (paths.length) await sb.storage.from(BUCKET).remove(paths);
}

/* ================= NGĂN ĐANG MỞ ================= */
const viewer = $('#viewer');
function showViewer(code, title, { fill = false } = {}) {
  $('#viewerCode').textContent = code;
  $('#viewerTitle').textContent = title;
  $('#viewerActions').innerHTML = '';
  const body = $('#viewerBody');
  body.className = 'viewer-body' + (fill ? ' fill' : '');
  body.innerHTML = '<div class="loading">ĐANG KÉO NGĂN</div>';
  if (viewer.hidden) { viewer.hidden = false; history.pushState({ drawer: true }, ''); }
  return body;
}
async function closeViewer(silent = false) {
  if (viewer.hidden) return;
  await flushJournal();
  viewer.hidden = true;
  S.openDrawer = null;
  J.active = false;
  if (!silent && history.state?.drawer) history.back();
  peekCache.clear();
  if (S.user) renderRoom();
}
$('#viewerClose').addEventListener('click', () => closeViewer());
window.addEventListener('popstate', () => { if (!viewer.hidden) closeViewer(true); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.open && !viewer.hidden) closeViewer(); });

function drawerCode(d) {
  const ci = S.cabinets.findIndex((c) => c.id === d.cabinet_id);
  const j = S.drawers.filter((x) => x.cabinet_id === d.cabinet_id).indexOf(d);
  return String.fromCharCode(65 + (ci % 26)) + (j + 1);
}

async function openDrawer(id) {
  const d = S.drawers.find((x) => x.id === id);
  if (!d) return;
  const cab = S.cabinets.find((c) => c.id === d.cabinet_id);
  S.openDrawer = d;
  const body = showViewer(`TỦ ${cab.name.toUpperCase()} // NGĂN ${drawerCode(d)}`, d.name);
  $('#viewerActions').innerHTML = `<button class="btn primary sm" data-new>+ Hồ sơ mới</button><button class="btn ghost sm" data-ren>Đổi tên</button><button class="btn danger sm" data-del>Xoá ngăn</button>`;
  $('[data-new]', $('#viewerActions')).onclick = () => editItem(null, d.id);
  $('[data-ren]', $('#viewerActions')).onclick = async () => {
    const r = await promptBox({ title: 'Đổi tên ngăn', label: 'Tên ngăn', value: d.name });
    if (!r) return;
    const { error } = await sb.from('drawers').update({ name: r.v.trim() }).eq('id', d.id);
    if (error) return fail(error, 'Đổi tên');
    d.name = r.v.trim(); $('#viewerTitle').textContent = d.name;
  };
  $('[data-del]', $('#viewerActions')).onclick = async () => {
    if (!(await confirmBox(`Xoá ngăn "${d.name}" và ${S.counts[d.id] || 0} hồ sơ bên trong?`))) return;
    await removeFilesOf([d.id]);
    const { error } = await sb.from('drawers').delete().eq('id', d.id);
    if (error) return fail(error, 'Xoá ngăn');
    S.drawers = S.drawers.filter((x) => x.id !== d.id);
    delete S.counts[d.id];
    toast('Đã xoá ngăn'); closeViewer();
  };
  body.innerHTML = `<div class="toolbar">
      <input class="inp" id="fFilter" type="search" placeholder="Lọc theo tên, nội dung, nhãn…"/>
      <select class="inp" id="fSort" style="max-width:190px"><option value="new">Mới sửa trước</option><option value="old">Cũ trước</option><option value="az">Tên A → Z</option></select>
    </div><div id="fileArea"><div class="loading">ĐANG ĐỌC</div></div>`;
  const { data, error } = await sb.from('items').select('*').eq('drawer_id', d.id);
  if (error) { $('#fileArea').innerHTML = ''; return fail(error, 'Đọc ngăn'); }
  S.counts[d.id] = data.length;
  const draw = () => {
    const q = $('#fFilter').value.trim().toLowerCase();
    const sort = $('#fSort').value;
    let rows = data.filter((i) => !q || [i.title, i.body, (i.tags || []).join(' ')].join(' ').toLowerCase().includes(q));
    rows.sort((a, b) => (b.pinned - a.pinned) || (sort === 'az' ? a.title.localeCompare(b.title, 'vi')
      : sort === 'old' ? a.updated_at.localeCompare(b.updated_at) : b.updated_at.localeCompare(a.updated_at)));
    $('#fileArea').innerHTML = rows.length ? `<div class="files">${rows.map((i) => fileCard(i)).join('')}</div>`
      : `<div class="empty">${data.length ? 'Không có hồ sơ khớp bộ lọc.' : 'Ngăn trống. Bấm “+ Hồ sơ mới” để cất hồ sơ đầu tiên.'}</div>`;
    $$('.file', $('#fileArea')).forEach((el) => (el.onclick = () => editItem(data.find((x) => x.id === el.dataset.id), d.id, (saved, removed) => {
      const k = data.findIndex((x) => x.id === el.dataset.id);
      if (removed) data.splice(k, 1); else data[k] = saved;
      S.counts[d.id] = data.length; draw();
    })));
  };
  $('#fFilter').oninput = draw;
  $('#fSort').onchange = draw;
  S.onItemCreated = (saved) => { data.push(saved); S.counts[d.id] = data.length; draw(); };
  draw();
}

function fileCard(i, where = '') {
  const tab = (i.tags || [])[0] || fmtDT(i.updated_at).slice(0, 10);
  const att = (i.attachments || []).length;
  return `<button class="file" type="button" data-id="${i.id}" data-tab="${esc(tab)}">
    ${i.pinned ? '<span class="pin">📌</span>' : ''}
    ${where}
    <h3>${esc(i.title || '(không tên)')}</h3>
    <p>${esc(i.body.slice(0, 240))}</p>
    <div class="fmeta"><span>${fmtDT(i.updated_at)}</span>${att ? `<span>📎 ${att}</span>` : ''}${i.link ? '<span>🔗</span>' : ''}${(i.tags || []).slice(1, 4).map((t) => `<span class="ftag">${esc(t)}</span>`).join('')}</div>
  </button>`;
}

/* ---------- Trình sửa hồ sơ ---------- */
function editItem(item, drawerId, onChange) {
  const isNew = !item;
  const it = item ? structuredClone(item) : { title: '', body: '', tags: [], link: '', pinned: false, attachments: [] };
  let pending = [];   // file đã chọn nhưng chưa tải lên
  const removed = []; // file cũ bị gỡ
  const drawerOpts = S.cabinets.map((c) => `<optgroup label="${esc(c.name)}">${S.drawers.filter((d) => d.cabinet_id === c.id)
    .map((d) => `<option value="${d.id}" ${d.id === drawerId ? 'selected' : ''}>${esc(d.name)}</option>`).join('')}</optgroup>`).join('');
  const body = openSheet(`<p class="kicker">${isNew ? 'HỒ SƠ MỚI' : 'HỒ SƠ · tạo ' + fmtDT(it.created_at)}</p>
    <form class="form" data-f>
      <label class="f">Tiêu đề<input name="title" required maxlength="200" value="${esc(it.title)}" placeholder="VD: Đề cương ôn tập chương 3"/></label>
      <label class="f">Nội dung<textarea name="body" rows="9" placeholder="Ghi gì cũng được…">${esc(it.body)}</textarea></label>
      <div class="row2">
        <label class="f">Nhãn (cách nhau bằng dấu phẩy)<input name="tags" value="${esc((it.tags || []).join(', '))}" placeholder="quan trọng, toán"/></label>
        <label class="f">Liên kết<input name="link" type="url" value="${esc(it.link || '')}" placeholder="https://…"/></label>
      </div>
      <div class="row2">
        <label class="f">Cất ở ngăn<select name="drawer_id">${drawerOpts}</select></label>
        <label class="f check" style="align-self:end;padding-bottom:10px"><input type="checkbox" name="pinned" ${it.pinned ? 'checked' : ''}/> Ghim lên đầu ngăn</label>
      </div>
      <div class="f">File đính kèm (tối đa 20 MB / file)
        <div class="att-list" data-atts></div>
        <label class="drop" data-drop>Bấm để chọn file hoặc kéo thả vào đây<input type="file" multiple hidden data-file/></label>
      </div>
      ${it.link ? `<a class="where" href="${esc(it.link)}" target="_blank" rel="noopener">↗ Mở liên kết</a>` : ''}
      <p class="msg" data-msg></p>
      <div class="acts" style="justify-content:space-between">
        ${isNew ? '<span></span>' : '<button type="button" class="btn danger" data-del>Xoá hồ sơ</button>'}
        <span><button type="button" class="btn ghost" data-close>Đóng</button> <button class="btn primary" data-save>Lưu vào kho</button></span>
      </div>
    </form>`, { wide: true });
  const form = $('[data-f]', body);
  const msg = $('[data-msg]', body);

  const drawAtts = () => {
    const box = $('[data-atts]', body);
    box.innerHTML = it.attachments.map((a, k) => `<div class="att"><span>📄</span><span class="nm">${esc(a.name)}</span><span class="sz">${fmtSize(a.size || 0)}</span>
        <button type="button" class="btn ghost sm" data-open="${k}">Mở</button><button type="button" class="icon-btn" data-rm="${k}" title="Gỡ">✕</button></div>`).join('')
      + pending.map((f, k) => `<div class="att"><span>⏳</span><span class="nm">${esc(f.name)}</span><span class="sz">${fmtSize(f.size)} · chờ lưu</span>
        <button type="button" class="icon-btn" data-rmp="${k}" title="Bỏ">✕</button></div>`).join('');
    $$('[data-open]', box).forEach((b) => (b.onclick = () => openFile(it.attachments[+b.dataset.open])));
    $$('[data-rm]', box).forEach((b) => (b.onclick = () => { removed.push(...it.attachments.splice(+b.dataset.rm, 1)); drawAtts(); }));
    $$('[data-rmp]', box).forEach((b) => (b.onclick = () => { pending.splice(+b.dataset.rmp, 1); drawAtts(); }));
  };
  const addFiles = (files) => {
    for (const f of files) {
      if (f.size > 20 * 1048576) { toast(`"${f.name}" quá 20 MB`, true); continue; }
      pending.push(f);
    }
    drawAtts();
  };
  $('[data-file]', body).onchange = (e) => { addFiles(e.target.files); e.target.value = ''; };
  const drop = $('[data-drop]', body);
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); addFiles(e.dataTransfer.files); };
  drawAtts();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const btn = $('[data-save]', body);
    btn.disabled = true; msg.className = 'msg'; msg.textContent = '> đang ghi vào kho...';
    try {
      const row = {
        title: form.title.value.trim(),
        body: form.body.value,
        tags: form.tags.value.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 12),
        link: form.link.value.trim() || null,
        pinned: form.pinned.checked,
        drawer_id: form.drawer_id.value,
      };
      let saved;
      if (isNew) {
        const r = await sb.from('items').insert({ ...row, attachments: [] }).select().single();
        if (r.error) throw r.error;
        saved = r.data; it.id = saved.id; it.created_at = saved.created_at;
      }
      // Tải file mới lên Storage
      for (const f of pending) {
        msg.textContent = `> đang tải ${f.name}...`;
        const safe = f.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^\w.\-]+/g, '_');
        const path = `${S.user.id}/${it.id}/${Date.now()}_${safe}`;
        const up = await sb.storage.from(BUCKET).upload(path, f, { contentType: f.type || undefined });
        if (up.error) throw up.error;
        it.attachments.push({ path, name: f.name, size: f.size, type: f.type });
      }
      pending = [];
      if (removed.length) await sb.storage.from(BUCKET).remove(removed.map((a) => a.path));
      const r = await sb.from('items').update({ ...row, attachments: it.attachments }).eq('id', it.id).select().single();
      if (r.error) throw r.error;
      saved = r.data;
      setNet(true);
      closeSheet();
      toast(isNew ? 'Đã cất hồ sơ vào kho' : 'Đã lưu thay đổi');
      afterItemSaved(saved, drawerId, isNew, onChange);
    } catch (err) {
      msg.textContent = '> lỗi: ' + (err.message || err);
      fail(err, 'Lưu hồ sơ');
      drawAtts();
    } finally { btn.disabled = false; }
  };

  const del = $('[data-del]', body);
  if (del) del.onclick = async () => {
    if (!(await confirmBox(`Xoá hồ sơ "${it.title}"?`))) return;
    const paths = (item.attachments || []).map((a) => a.path);
    if (paths.length) await sb.storage.from(BUCKET).remove(paths);
    const { error } = await sb.from('items').delete().eq('id', it.id);
    if (error) return fail(error, 'Xoá');
    toast('Đã xoá hồ sơ');
    S.counts[drawerId] = Math.max(0, (S.counts[drawerId] || 1) - 1);
    onChange?.(null, true);
  };
}

function afterItemSaved(saved, oldDrawer, isNew, onChange) {
  const moved = saved.drawer_id !== oldDrawer;
  if (moved) {
    S.counts[saved.drawer_id] = (S.counts[saved.drawer_id] || 0) + 1;
    if (!isNew) S.counts[oldDrawer] = Math.max(0, (S.counts[oldDrawer] || 1) - 1);
    if (!isNew) onChange?.(null, true);
    toast('Hồ sơ đã chuyển sang ngăn khác');
  } else if (isNew) {
    if (S.openDrawer?.id === saved.drawer_id) S.onItemCreated?.(saved);
    else S.counts[saved.drawer_id] = (S.counts[saved.drawer_id] || 0) + 1;
  } else onChange?.(saved, false);
}

async function openFile(a) {
  const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(a.path, 300);
  if (error) return fail(error, 'Mở file');
  window.open(data.signedUrl, '_blank', 'noopener');
}

/* ---------- Tìm kiếm toàn kho ---------- */
$('#searchForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = $('#searchInput').value.trim();
  if (!q) return;
  const body = showViewer('TRUY VẤN TOÀN KHO', `Kết quả cho “${q}”`);
  const like = `%${q.replace(/[%_,()]/g, ' ')}%`;
  const [items, jr] = await Promise.all([
    sb.from('items').select('*').or(`title.ilike.${like},body.ilike.${like}`).order('updated_at', { ascending: false }).limit(100),
    sb.from('journal_entries').select('*').or(`title.ilike.${like},body.ilike.${like}`).order('entry_date', { ascending: false }).limit(50),
  ]);
  if (items.error) { body.innerHTML = ''; return fail(items.error, 'Tìm kiếm'); }
  const tagHits = (await sb.from('items').select('*').contains('tags', [q])).data || [];
  const all = [...items.data, ...tagHits.filter((t) => !items.data.some((i) => i.id === t.id))];
  const where = (i) => {
    const d = S.drawers.find((x) => x.id === i.drawer_id);
    const c = d && S.cabinets.find((x) => x.id === d.cabinet_id);
    return `<span class="where" style="color:#3c6b78">${esc(c?.name || '?')} › ${esc(d?.name || '?')}</span>`;
  };
  const jrRows = jr.data || [];
  body.innerHTML = (all.length ? `<p class="kicker">HỒ SƠ · ${all.length}</p><div class="files">${all.map((i) => fileCard(i, where(i))).join('')}</div>` : '')
    + (jrRows.length ? `<p class="kicker" style="margin-top:22px">NHẬT KÝ · ${jrRows.length}</p><div class="cards">${jrRows.map((j) =>
      `<button class="card" style="text-align:left;cursor:pointer;border-left-color:var(--violet)" data-jd="${j.entry_date}"><div class="meta">${fmtDay(j.entry_date)}</div><h3>${esc(j.title || '(không tiêu đề)')}</h3><div class="body">${esc(j.body.slice(0, 200))}</div></button>`).join('')}</div>` : '')
    || '<div class="empty">Không tìm thấy gì trong kho.</div>';
  $$('.file', body).forEach((el) => (el.onclick = () => {
    const i = all.find((x) => x.id === el.dataset.id);
    editItem(i, i.drawer_id, (saved, removedFlag) => {
      if (removedFlag) el.remove(); else el.outerHTML = fileCard(saved, where(saved));
    });
  }));
  $$('[data-jd]', body).forEach((el) => (el.onclick = () => openJournal(el.dataset.jd)));
});

/* ================= NHẬT KÝ (tự lưu) ================= */
const J = { entries: [], cur: null, timer: null, saving: null, active: false };
const backupKey = () => `kho-journal-backup-${S.user?.id}`;

async function openJournal(focusDate) {
  await flushJournal();
  const body = showViewer('TỦ LOG // NGĂN LOG-01', 'Nhật ký', { fill: true });
  J.active = true;
  $('#viewerActions').innerHTML = `<button class="btn primary sm" data-newday>+ Ngày mới</button><button class="btn ghost sm" data-export>Xuất .txt</button>`;
  const { data, error } = await sb.from('journal_entries').select('*').order('entry_date');
  if (error) { body.innerHTML = ''; return fail(error, 'Đọc nhật ký'); }
  J.entries = data;
  S.journalCount = data.length;
  restoreBackup();
  body.innerHTML = `<div class="journal">
    <aside class="j-list">
      <div class="j-list-head"><input class="inp" id="jFilter" type="search" placeholder="Lọc nhật ký…"/></div>
      <div class="j-items" id="jItems"></div>
    </aside>
    <section class="j-editor">
      <div class="j-bar">
        <span class="j-day" id="jDay">NGÀY --</span>
        <input type="date" id="jDate" title="Đổi ngày"/>
        <span style="flex:1"></span>
        <button class="btn danger sm" id="jDel">Xoá trang</button>
      </div>
      <input class="j-title" id="jTitle" placeholder="Tiêu đề (không bắt buộc)" maxlength="200"/>
      <div class="j-body-wrap"><div class="j-gutter" id="jGut">01</div><textarea class="j-body" id="jBody" spellcheck="false" placeholder="> bắt đầu ghi... (tự lưu vào cơ sở dữ liệu)"></textarea></div>
      <div class="j-foot"><span class="save-state"><span class="led on" id="jLed"></span><span id="jState">SẴN SÀNG</span></span><span id="jCount">0 ký tự</span></div>
    </section>
  </div>`;
  $('[data-newday]', $('#viewerActions')).onclick = newDay;
  $('[data-export]', $('#viewerActions')).onclick = exportJournal;
  $('#jFilter').oninput = drawJList;
  $('#jTitle').oninput = onJInput;
  $('#jBody').oninput = onJInput;
  $('#jDate').onchange = onJDate;
  $('#jDel').onclick = deleteDay;
  const target = focusDate || today();
  const hit = J.entries.find((x) => x.entry_date === target);
  selectEntry(hit || (focusDate || !J.entries.length ? draftFor(target) : J.entries[J.entries.length - 1]));
}

const draftFor = (date) => ({ id: null, entry_date: date, title: '', body: '' });
const dayNo = (e) => { const k = J.entries.findIndex((x) => x.entry_date === e.entry_date && x.id); return k >= 0 ? k + 1 : J.entries.filter((x) => x.entry_date < e.entry_date).length + 1; };

function drawJList() {
  const q = ($('#jFilter')?.value || '').toLowerCase();
  const list = [...J.entries].reverse().filter((e) => !q || (e.title + ' ' + e.body).toLowerCase().includes(q));
  const curIsDraft = J.cur && !J.cur.id;
  $('#jItems').innerHTML = (curIsDraft && !q ? `<button class="j-item on"><span class="d">NGÀY ${pad(dayNo(J.cur))} · ${fmtDay(J.cur.entry_date)}</span><b>(trang mới — chưa lưu)</b><small>gõ để lưu</small></button>` : '')
    + list.map((e) => `<button class="j-item ${J.cur?.id === e.id ? 'on' : ''}" data-id="${e.id}">
      <span class="d">NGÀY ${pad(J.entries.indexOf(e) + 1)} · ${fmtDay(e.entry_date)}</span>
      <b>${esc(e.title || e.body.split('\n')[0] || '(trống)')}</b>
      <small>${esc(e.title ? e.body.split('\n')[0] : '') || '&nbsp;'}</small></button>`).join('')
    || (curIsDraft ? '' : '<p class="note" style="padding:12px">Chưa có trang nào.</p>');
  $$('.j-item[data-id]', $('#jItems')).forEach((b) => (b.onclick = async () => { await flushJournal(); selectEntry(J.entries.find((x) => x.id === b.dataset.id)); }));
}

function selectEntry(e) {
  J.cur = e;
  $('#jDay').textContent = `NGÀY ${pad(dayNo(e))}`;
  $('#jDate').value = e.entry_date;
  $('#jTitle').value = e.title;
  $('#jBody').value = e.body;
  $('#jDel').hidden = !e.id;
  setJState(e.id ? `ĐÃ LƯU ${fmtDT(e.updated_at).slice(11)}` : 'TRANG MỚI — GÕ ĐỂ LƯU', 'on');
  updateGutter();
  drawJList();
  if (window.innerWidth > 860) $('#jBody').focus();
}

function setJState(text, led) {
  const s = $('#jState'); if (!s) return;
  s.textContent = text; $('#jLed').className = 'led ' + led;
}
function updateGutter() {
  const ta = $('#jBody');
  const lines = ta.value.split('\n').length;
  $('#jGut').textContent = Array.from({ length: Math.max(lines, 1) }, (_, i) => pad(i + 1)).join('\n');
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
  $('#jCount').textContent = `${ta.value.length} ký tự · ${lines} dòng`;
}

function onJInput() {
  if (!J.cur) return;
  J.cur.title = $('#jTitle').value;
  J.cur.body = $('#jBody').value;
  J.cur._dirty = true;
  updateGutter();
  setJState('ĐANG GHI…', '');
  saveBackup();
  clearTimeout(J.timer);
  J.timer = setTimeout(saveJournal, 800);
}

async function saveJournal() {
  clearTimeout(J.timer);
  const e = J.cur;
  if (!e || !e._dirty) return;
  if (J.saving) { await J.saving; return saveJournal(); }
  if (!e.id && !e.title.trim() && !e.body.trim()) return;
  e._dirty = false;
  setJState('ĐANG ĐỒNG BỘ…', '');
  J.saving = (async () => {
    const row = { entry_date: e.entry_date, title: e.title, body: e.body };
    const r = e.id
      ? await sb.from('journal_entries').update(row).eq('id', e.id).select().single()
      : await sb.from('journal_entries').insert(row).select().single();
    if (r.error) {
      e._dirty = true;
      setJState('LỖI — ĐÃ GIỮ BẢN NHÁP TRÊN MÁY, SẼ THỬ LẠI', 'off');
      if (/duplicate key/i.test(r.error.message)) toast('Ngày này đã có trang nhật ký.', true);
      else fail(r.error, 'Lưu nhật ký');
      return;
    }
    const wasNew = !e.id;
    Object.assign(e, r.data, { title: e.title, body: e.body });
    if (wasNew) {
      J.entries.push(e);
      J.entries.sort((a, b) => a.entry_date.localeCompare(b.entry_date));
      S.journalCount = J.entries.length;
    }
    clearBackup();
    setNet(true);
    if (J.cur === e) {
      setJState(e._dirty ? 'ĐANG GHI…' : `ĐÃ LƯU VÀO DATABASE · ${fmtTime()}`, 'on');
      $('#jDel').hidden = false;
      $('#jDay').textContent = `NGÀY ${pad(dayNo(e))}`;
      if (wasNew) drawJList(); else refreshJItem(e);
    }
  })();
  await J.saving;
  J.saving = null;
  if (e._dirty) J.timer = setTimeout(saveJournal, 3000);
}
function refreshJItem(e) {
  const b = $(`.j-item[data-id="${e.id}"]`);
  if (b) { $('b', b).textContent = e.title || e.body.split('\n')[0] || '(trống)'; $('small', b).textContent = e.title ? e.body.split('\n')[0] : ''; }
}
async function flushJournal() { if (J.cur?._dirty) await saveJournal(); else if (J.saving) await J.saving; }

async function onJDate(ev) {
  const d = ev.target.value;
  const e = J.cur;
  if (!d || !e || d === e.entry_date) return;
  const other = J.entries.find((x) => x.entry_date === d && x !== e);
  if (other) {
    toast('Ngày ' + fmtDay(d) + ' đã có trang — đang mở trang đó.');
    await flushJournal(); selectEntry(other); return;
  }
  e.entry_date = d;
  if (e.id) { e._dirty = true; await saveJournal(); J.entries.sort((a, b) => a.entry_date.localeCompare(b.entry_date)); }
  selectEntry(e);
}

async function newDay() {
  await flushJournal();
  let d = today();
  if (J.entries.some((x) => x.entry_date === d)) {
    const last = J.entries[J.entries.length - 1].entry_date;
    const n = parseDay(last > d ? last : d); n.setDate(n.getDate() + 1); d = isoLocal(n);
    toast('Hôm nay đã có trang — tạo trang ngày ' + fmtDay(d) + ' (đổi ngày ở ô lịch nếu cần).');
  }
  selectEntry(draftFor(d));
}

async function deleteDay() {
  const e = J.cur;
  if (!e?.id) return;
  if (!(await confirmBox(`Xoá trang nhật ký ngày ${fmtDay(e.entry_date)}?`))) return;
  clearTimeout(J.timer); e._dirty = false;
  const { error } = await sb.from('journal_entries').delete().eq('id', e.id);
  if (error) return fail(error, 'Xoá trang');
  J.entries = J.entries.filter((x) => x !== e);
  S.journalCount = J.entries.length;
  toast('Đã xoá trang');
  selectEntry(J.entries[J.entries.length - 1] || draftFor(today()));
}

function exportJournal() {
  const txt = J.entries.map((e, i) => `NGÀY ${i + 1} (${fmtDay(e.entry_date)})${e.title ? ': ' + e.title : ''}\n${e.body}\n`).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' }));
  a.download = `nhat-ky-${today()}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Bản nháp dự phòng trên máy: chỉ dùng khi mất mạng lúc đang gõ
function saveBackup() {
  try { const e = J.cur; localStorage.setItem(backupKey(), JSON.stringify({ id: e.id, entry_date: e.entry_date, title: e.title, body: e.body })); } catch (_) { /* bỏ qua */ }
}
function clearBackup() { try { localStorage.removeItem(backupKey()); } catch (_) { /* bỏ qua */ } }
function restoreBackup() {
  let b = null;
  try { b = JSON.parse(localStorage.getItem(backupKey()) || 'null'); } catch (_) { /* bỏ qua */ }
  if (!b) return;
  const hit = J.entries.find((x) => (b.id && x.id === b.id) || x.entry_date === b.entry_date);
  if (hit && hit.body === b.body && hit.title === b.title) return clearBackup();
  if (hit) Object.assign(hit, { title: b.title, body: b.body, _dirty: true });
  else J.entries.push({ ...b, id: null, _dirty: true });
  toast('Đã khôi phục bản nháp chưa kịp lưu — đang đồng bộ lại.');
  setTimeout(async () => {
    for (const e of J.entries.filter((x) => x._dirty)) { const keep = J.cur; J.cur = e; await saveJournal(); J.cur = keep; }
    J.entries = J.entries.filter((x) => x.id);
    if (J.active) drawJList();
  }, 300);
}
window.addEventListener('online', () => { if (J.cur?._dirty) saveJournal(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) flushJournal(); });
window.addEventListener('beforeunload', (e) => { if (J.cur?._dirty) { saveJournal(); e.preventDefault(); e.returnValue = ''; } });

/* ================= VIỆC CẦN LÀM (to-do) ================= */
const T = { rows: [], filter: 'open' };
async function openTodo() {
  const body = showViewer('TỦ LOG // NGĂN TODO', 'Việc cần làm');
  $('#viewerActions').innerHTML = '<button class="btn ghost sm" data-clear>Dọn việc đã xong</button>';
  const { data, error } = await sb.from('todos').select('*').order('created_at', { ascending: true });
  if (error) { body.innerHTML = '<div class="empty">Chưa có bảng việc cần làm — hãy chạy lại setup.sql trên Supabase.</div>'; return fail(error, 'Đọc việc cần làm'); }
  T.rows = data;
  body.innerHTML = `
    <form class="todo-add" id="tdForm">
      <input class="inp" name="text" maxlength="300" required placeholder="Thêm việc… (Enter để lưu)" autocomplete="off"/>
      <input class="inp" name="due" type="date" title="Hạn (không bắt buộc)"/>
      <button class="btn primary">+ Thêm</button>
    </form>
    <div class="toolbar">
      <div class="chips" id="tdFilter">
        <button type="button" class="chip" data-f="open">Chưa xong</button>
        <button type="button" class="chip" data-f="done">Đã xong</button>
        <button type="button" class="chip" data-f="all">Tất cả</button>
      </div>
      <span class="grow"></span><span class="note" id="tdCount"></span>
    </div>
    <div class="todo-list" id="tdList"></div>
    <p class="note" style="margin-top:12px;font-size:12px">Bấm đúp vào một việc để sửa nội dung.</p>`;
  const f = $('#tdForm');
  setTimeout(() => f.text.focus(), 50);
  f.onsubmit = async (e) => {
    e.preventDefault();
    const text = f.text.value.trim();
    if (!text) return;
    const { data: row, error: err } = await sb.from('todos').insert({ text, due_on: f.due.value || null }).select().single();
    if (err) return fail(err, 'Thêm việc');
    T.rows.push(row); f.text.value = ''; f.due.value = ''; f.text.focus();
    if (T.filter === 'done') T.filter = 'open';
    drawTodos();
  };
  $('#tdFilter').onclick = (e) => { const b = e.target.closest('[data-f]'); if (b) { T.filter = b.dataset.f; drawTodos(); } };
  $('[data-clear]', $('#viewerActions')).onclick = async () => {
    const done = T.rows.filter((x) => x.done);
    if (!done.length) return toast('Chưa có việc nào xong.');
    if (!(await confirmBox(`Xoá ${done.length} việc đã xong?`))) return;
    const { error: err } = await sb.from('todos').delete().in('id', done.map((x) => x.id));
    if (err) return fail(err, 'Dọn việc');
    T.rows = T.rows.filter((x) => !x.done); drawTodos(); toast('Đã dọn');
  };
  $('#tdList').onclick = async (e) => {
    const el = e.target.closest('.todo'); if (!el) return;
    const row = T.rows.find((x) => x.id === el.dataset.id);
    if (e.target.matches('input[type=checkbox]')) {
      const done = e.target.checked;
      const { error: err } = await sb.from('todos').update({ done, done_at: done ? new Date().toISOString() : null }).eq('id', row.id);
      if (err) { e.target.checked = !done; return fail(err, 'Cập nhật'); }
      row.done = done;
      setTimeout(drawTodos, done && T.filter === 'open' ? 350 : 0);
    } else if (e.target.closest('[data-del]')) {
      const { error: err } = await sb.from('todos').delete().eq('id', row.id);
      if (err) return fail(err, 'Xoá việc');
      T.rows = T.rows.filter((x) => x !== row); drawTodos();
    }
  };
  $('#tdList').ondblclick = (e) => {
    const t = e.target.closest('.t-text'); if (!t) return;
    const el = t.closest('.todo'), row = T.rows.find((x) => x.id === el.dataset.id);
    t.innerHTML = `<input class="t-edit" maxlength="300" value="${esc(row.text)}"/>`;
    const inp = $('.t-edit', t); inp.focus(); inp.select();
    let saved = false;
    const save = async (ok) => {
      if (saved) return; saved = true;
      const v = inp.value.trim();
      if (ok && v && v !== row.text) {
        const { error: err } = await sb.from('todos').update({ text: v }).eq('id', row.id);
        if (err) fail(err, 'Sửa việc'); else row.text = v;
      }
      drawTodos();
    };
    inp.onkeydown = (k) => { if (k.key === 'Enter') save(true); if (k.key === 'Escape') { k.stopPropagation(); save(false); } };
    inp.onblur = () => save(true);
  };
  drawTodos();
}
function drawTodos() {
  const list = $('#tdList'); if (!list) return;
  const t = today();
  $$('#tdFilter .chip').forEach((b) => b.classList.toggle('on', b.dataset.f === T.filter));
  const rows = T.rows.filter((x) => T.filter === 'all' || (T.filter === 'done' ? x.done : !x.done))
    .sort((a, b) => (a.done - b.done) || (a.due_on || '9999').localeCompare(b.due_on || '9999') || a.created_at.localeCompare(b.created_at));
  const open = T.rows.filter((x) => !x.done).length;
  S.todoOpen = open;
  $('#tdCount').textContent = `${open} chưa xong · ${T.rows.length - open} đã xong`;
  list.innerHTML = rows.map((x) => {
    const cls = !x.due_on || x.done ? '' : x.due_on < t ? 'late' : x.due_on === t ? 'today' : '';
    const due = x.due_on ? (cls === 'late' ? 'TRỄ · ' : cls === 'today' ? 'HÔM NAY · ' : '') + fmtDay(x.due_on) : '';
    return `<div class="todo${x.done ? ' done' : ''}" data-id="${x.id}">
      <input type="checkbox" ${x.done ? 'checked' : ''} aria-label="Xong"/>
      <span class="t-text">${esc(x.text)}</span>
      <span class="t-due ${cls}">${due}</span>
      <button class="icon-btn" data-del title="Xoá" aria-label="Xoá">✕</button></div>`;
  }).join('') || `<div class="empty">${T.filter === 'done' ? 'Chưa có việc nào xong.' : T.filter === 'open' ? 'Không còn việc nào chưa xong 🎉' : 'Chưa có việc nào.'}</div>`;
}

/* ================= TÀI KHOẢN ================= */
function openAccount() {
  const u = S.user;
  const body = openSheet(`<p class="kicker">TÀI KHOẢN</p><h3>${esc(u.email)}</h3>
    <form class="form" data-f>
      <label class="f">Tên hiển thị<input name="full_name" value="${esc(u.user_metadata?.full_name || '')}" maxlength="60"/></label>
      <label class="f">Mật khẩu mới (để trống nếu không đổi)<input name="password" type="password" minlength="6" autocomplete="new-password"/></label>
      <p class="note">Tạo lúc ${fmtDT(u.created_at)}</p>
      <div class="acts"><button type="button" class="btn ghost" data-close>Đóng</button><button class="btn primary">Lưu</button></div>
    </form>`);
  $('[data-f]', body).onsubmit = async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const upd = { data: { full_name: f.full_name.value.trim() } };
    if (f.password.value) upd.password = f.password.value;
    const { data, error } = await sb.auth.updateUser(upd);
    if (error) return fail(error, 'Cập nhật');
    S.user = data.user;
    const name = data.user.user_metadata?.full_name || data.user.email.split('@')[0];
    $('#userName').textContent = name;
    $('#userAvatar').textContent = (name.trim().split(/\s+/).pop() || '?')[0].toUpperCase();
    closeSheet(); toast('Đã cập nhật tài khoản');
  };
}

boot();
