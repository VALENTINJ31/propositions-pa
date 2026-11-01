/* Propositions PA – application 100 % locale (aucun serveur). Données stockées dans le navigateur (localStorage). */
'use strict';

/* ---------- Utilitaires ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const round2 = n => Math.round((+n + Number.EPSILON) * 100) / 100;
function num(n, dec = 2) {
  n = +n || 0;
  const s = Math.abs(n).toFixed(dec);
  let [i, d] = s.split('.');
  i = i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return (n < 0 && +s !== 0 ? '-' : '') + i + (d ? ',' + d : '');
}
const money = n => num(n) + ' €';
function pct(n) { n = +n || 0; return (Math.round(n * 100) / 100).toString().replace('.', ',') + ' %'; }
function parseNum(v) {
  if (typeof v === 'number') return v;
  const s = String(v == null ? '' : v).replace(/[\s  €%]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
function fmtDate(iso) { if (!iso) return ''; const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${y}`; }
function addDays(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + (+n || 0)); return d.toISOString().slice(0, 10); }
const validUntil = o => addDays(o.date || todayISO(), o.validityDays || 0);
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const CATS = { batterie: 'Batterie', freinage: 'Freinage', adblue: 'AdBlue', pneus: 'Pneus', huiles: 'Huiles & liquides', autre: 'Autre' };
const CAT_ICON = { batterie: '🔋', freinage: '🛞', adblue: '💧', pneus: '⭕', huiles: '🛢️', autre: '🔧' };
function normCat(c) {
  const n = norm(c);
  if (n.startsWith('bat')) return 'batterie';
  if (n.startsWith('frein') || n.includes('plaquet') || n.includes('disque')) return 'freinage';
  if (n.includes('adblue') || n.includes('ad blue')) return 'adblue';
  if (n.startsWith('pneu')) return 'pneus';
  if (/huile|lubri|liquide|lave|refroid/.test(n)) return 'huiles';
  return 'autre';
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200); }
function download(name, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
const safeName = s => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

/* ---------- Stockage ---------- */
const KEYS = ['settings', 'products', 'clients', 'offers', 'templates'];
const DEFAULT_SETTINGS = {
  company: { name: 'Pamiers Automobiles', address: '', zip: '09100', city: 'Pamiers', phone: '', email: '', web: '', siret: '', vatNumber: '' },
  seller: { name: '', title: 'Agent de maîtrise – Vente pièces détachées', phone: '', email: '' },
  legal: 'Prix exprimés en euros hors taxes, hors éco-participation éventuelle. Offre valable dans la limite des stocks disponibles et pendant la durée indiquée. Nos ventes sont soumises à nos conditions générales de vente.',
  vat: 20, logo: '', prefix: 'PA', nextNum: 1, defaultValidity: 30,
  defaultFranco: 'Franco de port', defaultDelivery: 'Sous 24/48 h', defaultMessage: '',
  lastBackup: ''
};
const db = {};
function load() {
  for (const k of KEYS) {
    try { db[k] = JSON.parse(localStorage.getItem('pa.' + k)); } catch (e) { db[k] = null; }
  }
  if (!localStorage.getItem('pa.init')) {
    const D = window.DEMO_DATA;
    db.products = D.products; db.clients = D.clients; db.templates = D.templates; db.offers = D.offers;
    localStorage.setItem('pa.init', '1');
    KEYS.forEach(save);
  }
  db.settings = Object.assign({}, DEFAULT_SETTINGS, db.settings || {});
  db.settings.company = Object.assign({}, DEFAULT_SETTINGS.company, db.settings.company || {});
  db.settings.seller = Object.assign({}, DEFAULT_SETTINGS.seller, db.settings.seller || {});
  for (const k of ['products', 'clients', 'offers', 'templates']) if (!Array.isArray(db[k])) db[k] = [];
}
function save(k) {
  try { localStorage.setItem('pa.' + k, JSON.stringify(db[k])); }
  catch (e) { alert("Impossible d'enregistrer : mémoire du navigateur pleine. Essayez un logo plus léger ou supprimez d'anciennes offres."); }
}
const S = () => db.settings;
const byId = (k, id) => db[k].find(x => x.id === id);

/* ---------- Calculs ---------- */
function calc(o, s) {
  s = s || S();
  const lines = (o.lines || []).map(l => {
    const qty = +l.qty || 0, price = +l.price || 0, disc = +l.discount || 0;
    const net = round2(price * (1 - disc / 100));
    return Object.assign({}, l, { qty, price, net, total: round2(net * qty), publicTotal: round2((+l.publicPrice || 0) * qty) });
  });
  const subtotal = round2(lines.reduce((a, l) => a + l.total, 0));
  const globalDiscount = round2(subtotal * (+o.globalDiscount || 0) / 100);
  const totalHT = round2(subtotal - globalDiscount);
  const vat = round2(totalHT * (+s.vat || 0) / 100);
  // L'économie se calcule uniquement sur les lignes qui ont un prix public
  const withPub = lines.filter(l => +l.publicPrice > 0);
  const publicTotal = round2(withPub.reduce((a, l) => a + l.publicTotal, 0));
  const pubNet = round2(withPub.reduce((a, l) => a + l.total, 0) * (1 - (+o.globalDiscount || 0) / 100));
  const saving = round2(publicTotal - pubNet);
  return { lines, subtotal, globalDiscount, totalHT, vat, totalTTC: round2(totalHT + vat), publicTotal, saving,
    savingPct: publicTotal ? saving / publicTotal * 100 : 0 };
}
function nextNumber() {
  const s = S(), y = new Date().getFullYear();
  const n = `${s.prefix || 'PA'}-${y}-${String(s.nextNum || 1).padStart(4, '0')}`;
  s.nextNum = (s.nextNum || 1) + 1; save('settings');
  return n;
}
function lineFromProduct(p, qty) {
  return { productId: p.id, ref: p.ref, name: p.name, brand: p.brand, unit: p.unit, publicPrice: +p.publicPrice || 0, price: +p.price || 0, qty: qty || 1, discount: 0 };
}
function refreshPrices(lines) {
  return lines.map(l => { const p = l.productId && byId('products', l.productId); return p ? Object.assign({}, l, lineFromProduct(p, l.qty), { discount: l.discount }) : Object.assign({}, l); });
}

/* ---------- Navigation ---------- */
const NAV = [['offres', '📄', 'Offres'], ['clients', '👥', 'Clients'], ['catalogue', '📦', 'Catalogue'], ['modeles', '⭐', 'Modèles'], ['reglages', '⚙️', 'Réglages']];
function renderNav(cur) {
  const map = { offre: 'offres', client: 'clients', modele: 'modeles' };
  cur = map[cur] || cur;
  $('#topnav').innerHTML = NAV.map(([k, , t]) => `<a href="#/${k}" class="${k === cur ? 'on' : ''}">${t}</a>`).join('');
  $('#bottomnav').innerHTML = NAV.map(([k, i, t]) => `<a href="#/${k}" class="${k === cur ? 'on' : ''}"><span>${i}</span>${t}</a>`).join('');
}
function go(h) { if (location.hash === h) route(); else location.hash = h; }
function route() {
  const [view = 'offres', id] = location.hash.replace(/^#\/?/, '').split('/');
  renderNav(view);
  const app = $('#app');
  const views = { offres: viewOffers, offre: viewOffer, clients: viewClients, client: viewClient, catalogue: viewCatalog, modeles: viewTemplates, modele: viewTemplate, reglages: viewSettings };
  (views[view] || viewOffers)(app, id && decodeURIComponent(id));
  window.scrollTo(0, 0);
}

/* ---------- Dialogue générique ---------- */
function openDialog({ title, body, actions = [], onOpen, wide }) {
  const dlg = $('#dlg'), f = $('#dlgForm');
  f.innerHTML = `<div class="dh"><h2>${esc(title)}</h2><button class="btn ghost sm" value="cancel" formnovalidate aria-label="Fermer">✕</button></div>
    <div class="db">${body}</div>
    ${actions.length ? `<div class="df">${actions.map((a, i) => `<button class="btn ${a.cls || ''}" value="a${i}" ${a.novalidate ? 'formnovalidate' : ''}>${esc(a.label)}</button>`).join('')}</div>` : ''}`;
  f.onsubmit = e => {
    const v = e.submitter && e.submitter.value;
    if (v && v.startsWith('a')) {
      const a = actions[+v.slice(1)];
      if (a.onClick && a.onClick(f) === false) { e.preventDefault(); return; }
    }
  };
  if (!dlg.open) dlg.showModal();
  if (onOpen) onOpen(f);
  return f;
}
const closeDialog = () => $('#dlg').open && $('#dlg').close();
function fieldsHTML(fields, obj) {
  return fields.map(f => {
    const v = obj[f.k] == null ? '' : obj[f.k];
    const attrs = `name="${f.k}" id="f_${f.k}" ${f.req ? 'required' : ''} ${f.ph ? `placeholder="${esc(f.ph)}"` : ''} ${f.list ? `list="dl_${f.k}"` : ''}`;
    let input;
    if (f.type === 'select') input = `<select ${attrs}>${f.options.map(([a, b]) => `<option value="${esc(a)}" ${a === v ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>`;
    else if (f.type === 'textarea') input = `<textarea ${attrs}>${esc(v)}</textarea>`;
    else input = `<input ${attrs} type="${f.type || 'text'}" ${f.type === 'number' ? 'step="any" inputmode="decimal"' : ''} value="${esc(f.type === 'number' && v !== '' ? String(v) : v)}">`;
    const dl = f.list ? `<datalist id="dl_${f.k}">${f.list.map(x => `<option value="${esc(x)}">`).join('')}</datalist>` : '';
    return `<div class="field ${f.full ? 'full' : ''}"><label for="f_${f.k}">${esc(f.label)}</label>${input}${dl}</div>`;
  }).join('');
}
function readFields(form, fields) {
  const o = {};
  fields.forEach(f => { const el = form.elements[f.k]; o[f.k] = f.type === 'number' ? parseNum(el.value) : el.value.trim(); });
  return o;
}

/* ---------- Vue : liste des offres ---------- */
function viewOffers(app) {
  // Nettoie les brouillons vides
  const before = db.offers.length;
  db.offers = db.offers.filter(o => o.clientId || (o.lines && o.lines.length) || (o.message && o.message.trim()));
  if (db.offers.length !== before) save('offers');
  const st = viewOffers.state || (viewOffers.state = { q: '', client: '', status: '' });
  const backupOld = !S().lastBackup || (Date.now() - new Date(S().lastBackup)) > 30 * 864e5;
  app.innerHTML = `
    ${backupOld && db.offers.length ? `<div class="notice">💾 Pensez à faire une <a href="#/reglages">sauvegarde</a> de vos données${S().lastBackup ? ' (dernière : ' + fmtDate(S().lastBackup) + ')' : ''}.</div>` : ''}
    <div class="row between"><h1>Propositions</h1><button class="btn primary" id="new">＋ Nouvelle offre</button></div>
    ${db.templates.length ? `<div class="card"><h2>Partir d'un modèle</h2><div class="chips">${db.templates.map(t => `<button class="chip" data-tpl="${t.id}">⭐ ${esc(t.name)}</button>`).join('')}</div></div>` : ''}
    <div class="card">
      <div class="grid2">
        <input id="q" type="search" placeholder="Rechercher (n°, client, produit…)" value="${esc(st.q)}">
        <div class="row" style="flex-wrap:nowrap">
          <select id="fc"><option value="">Tous les clients</option>${sortedClients().map(c => `<option value="${c.id}" ${c.id === st.client ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
          <select id="fs" style="max-width:9rem"><option value="">Tous statuts</option><option value="brouillon" ${st.status === 'brouillon' ? 'selected' : ''}>Brouillons</option><option value="envoyée" ${st.status === 'envoyée' ? 'selected' : ''}>Envoyées</option></select>
        </div>
      </div>
      <ul class="list" id="list"></ul>
    </div>`;
  const draw = () => {
    const q = norm(st.q);
    const list = db.offers.filter(o => {
      if (st.client && o.clientId !== st.client) return false;
      if (st.status && (o.status || 'brouillon') !== st.status) return false;
      if (!q) return true;
      const c = byId('clients', o.clientId);
      return norm([o.number, c && c.name, c && c.city, ...(o.lines || []).map(l => l.ref + ' ' + l.name)].join(' ')).includes(q);
    }).sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
    $('#list').innerHTML = list.length ? list.map(offerItemHTML).join('') : `<li class="empty">Aucune proposition. Créez-en une avec « Nouvelle offre ».</li>`;
  };
  draw();
  $('#q').oninput = e => { st.q = e.target.value; draw(); };
  $('#fc').onchange = e => { st.client = e.target.value; draw(); };
  $('#fs').onchange = e => { st.status = e.target.value; draw(); };
  $('#list').onclick = e => { const li = e.target.closest('[data-offer]'); if (li) go('#/offre/' + li.dataset.offer); };
  $('#new').onclick = () => newOffer();
  $$('[data-tpl]').forEach(b => b.onclick = () => newOffer({ template: byId('templates', b.dataset.tpl) }));
}
function offerItemHTML(o) {
  const c = byId('clients', o.clientId), t = calc(o);
  return `<li class="item" data-offer="${o.id}">
    <div class="grow"><div class="t">${esc(c ? c.name : 'Client non choisi')} ${o.demo ? '<span class="badge demo">exemple</span>' : ''}</div>
      <div class="muted small">${esc(o.number)} · ${fmtDate(o.date)} · ${(o.lines || []).length} ligne(s)</div></div>
    <div class="right"><div class="num"><b>${money(t.totalHT)}</b> <span class="muted small">HT</span></div>
      <span class="badge ${o.status === 'envoyée' ? 'ok' : ''}">${o.status === 'envoyée' ? 'Envoyée' : 'Brouillon'}</span></div></li>`;
}
const sortedClients = () => db.clients.slice().sort((a, b) => a.name.localeCompare(b.name, 'fr'));

function newOffer({ template, clientId, from } = {}) {
  const s = S();
  const o = {
    id: uid(), number: nextNumber(), clientId: clientId || '', date: todayISO(), validityDays: s.defaultValidity,
    franco: s.defaultFranco, delivery: s.defaultDelivery, message: s.defaultMessage, globalDiscount: 0,
    status: 'brouillon', lines: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  const src = template || from;
  if (src) {
    o.lines = from && !template ? from.lines.map(l => Object.assign({}, l)) : refreshPrices(src.lines || []);
    ['franco', 'delivery', 'message', 'globalDiscount', 'validityDays'].forEach(k => { if (src[k] != null && src[k] !== '') o[k] = src[k]; });
    if (from) o.clientId = clientId || from.clientId;
  }
  if (o.clientId && !src) { const c = byId('clients', o.clientId); if (c) o.globalDiscount = +c.discount || 0; }
  db.offers.push(o); save('offers');
  go('#/offre/' + o.id);
}

/* ---------- Vue : éditeur d'offre / de modèle ---------- */
function viewOffer(app, id) { const o = byId('offers', id); if (!o) return go('#/offres'); editor(app, o, 'offers'); }
function viewTemplate(app, id) { const o = byId('templates', id); if (!o) return go('#/modeles'); editor(app, o, 'templates'); }

function editor(app, o, coll) {
  const isOffer = coll === 'offers';
  const persist = () => { o.updatedAt = new Date().toISOString(); save(coll); };
  const client = () => byId('clients', o.clientId);
  app.innerHTML = `
    <div class="row between"><a href="#/${isOffer ? 'offres' : 'modeles'}" class="btn ghost sm">← Retour</a>
      ${isOffer ? `<span class="muted small">${esc(o.number)} ${o.demo ? '<span class="badge demo">exemple</span>' : ''}</span>` : ''}</div>
    <h1>${isOffer ? 'Proposition' : 'Modèle d\'offre'}</h1>
    ${isOffer ? `
    <div class="card">
      <h2>Client</h2>
      <div class="row" style="flex-wrap:nowrap">
        <select id="client" class="grow"><option value="">— Choisir un client —</option>${sortedClients().map(c => `<option value="${c.id}" ${c.id === o.clientId ? 'selected' : ''}>${esc(c.name)}${c.city ? ' – ' + esc(c.city) : ''}</option>`).join('')}</select>
        <button class="btn" id="addClient" title="Nouveau client">＋</button>
      </div>
      <div id="clientInfo" class="muted small" style="margin-top:.4rem"></div>
    </div>` : `
    <div class="card"><div class="field"><label for="tname">Nom du modèle</label><input id="tname" value="${esc(o.name)}" placeholder="ex. Pack freinage"></div></div>`}
    <div class="card">
      <div class="row between"><h2>Lignes</h2><span class="muted small" id="nLines"></span></div>
      <div id="lines"></div>
      <div class="btns stack"><button class="btn primary" id="addProd">＋ Ajouter des produits</button><button class="btn" id="addFree">＋ Ligne libre</button></div>
    </div>
    <div class="card">
      <h2>Remise &amp; totaux</h2>
      <div class="row" style="flex-wrap:nowrap;align-items:end">
        <div class="field grow"><label for="gd">Remise globale (%)</label><input id="gd" type="number" inputmode="decimal" step="any" min="0" max="100" value="${+o.globalDiscount || 0}"></div>
        <div class="field"><label>&nbsp;</label><button class="btn sm" id="applyAll" title="Appliquer un même % de remise à toutes les lignes">% sur chaque ligne</button></div>
      </div>
      <div id="totals"></div>
    </div>
    <div class="card">
      <h2>Conditions</h2>
      <div class="grid2">
        ${isOffer ? `<div class="field"><label for="date">Date</label><input id="date" type="date" value="${esc(o.date)}"></div>` : ''}
        <div class="field"><label for="valid">Validité (jours)</label><input id="valid" type="number" inputmode="numeric" min="0" value="${+o.validityDays || 0}"><div class="muted small" id="validTxt"></div></div>
        <div class="field"><label for="franco">Port</label><input id="franco" list="dlFranco" value="${esc(o.franco)}" placeholder="Franco de port"><datalist id="dlFranco"><option value="Franco de port"><option value="Franco de port dès 150 € HT"><option value="Port en sus"><option value="Enlèvement au comptoir"></datalist></div>
        <div class="field"><label for="delivery">Délai de livraison</label><input id="delivery" list="dlDel" value="${esc(o.delivery)}" placeholder="Sous 24/48 h"><datalist id="dlDel"><option value="Sous 24/48 h"><option value="Sous 24 h"><option value="Livraison J+1 pour commande avant 12 h"><option value="Livraison lors de ma prochaine tournée"><option value="Selon disponibilité"></datalist></div>
      </div>
      <div class="field"><label for="msg">Message libre</label><textarea id="msg" placeholder="ex. Suite à ma visite, voici l'offre promise…">${esc(o.message)}</textarea></div>
    </div>
    ${isOffer ? `
    <div class="card">
      <div class="row between"><h2>Envoyer</h2>
        <label class="row small" style="gap:.4rem;margin:0;color:var(--ink)"><input type="checkbox" id="sent" ${o.status === 'envoyée' ? 'checked' : ''}> Marquée envoyée</label></div>
      <div class="btns stack">
        <button class="btn accent" id="pdf">📄 PDF</button>
        <button class="btn accent ${navigator.canShare ? '' : 'hidden'}" id="sharePdf">📤 Partager le PDF</button>
        <button class="btn" id="mail">✉️ Envoyer par email</button>
        <button class="btn" id="text">💬 Texte SMS / WhatsApp</button>
      </div>
      <p class="muted small" style="margin:.6rem 0 0">Astuce : sur téléphone, « Partager le PDF » permet de joindre le PDF directement dans Gmail, WhatsApp, etc.</p>
    </div>
    <div class="btns" style="margin-bottom:1rem">
      <button class="btn" id="dup">⧉ Dupliquer</button>
      <button class="btn" id="asTpl">⭐ Enregistrer comme modèle</button>
      <button class="btn danger" id="del">Supprimer</button>
    </div>` : `
    <div class="btns" style="margin-bottom:1rem">
      <button class="btn primary" id="useTpl">Créer une offre avec ce modèle</button>
      <button class="btn danger" id="del">Supprimer le modèle</button>
    </div>`}`;

  /* -- Client -- */
  const drawClient = () => {
    if (!isOffer) return;
    const c = client();
    $('#clientInfo').innerHTML = c ? [c.contact, c.city, c.phone, c.email].filter(Boolean).map(esc).join(' · ') + (c.discount ? ` · remise habituelle <b>${pct(c.discount)}</b>` : '') : '';
  };
  if (isOffer) {
    $('#client').onchange = e => {
      o.clientId = e.target.value; const c = client();
      if (c && +c.discount && !(+o.globalDiscount) && !o.lines.some(l => +l.discount)) { o.globalDiscount = +c.discount; $('#gd').value = o.globalDiscount; toast(`Remise habituelle de ${pct(c.discount)} appliquée`); }
      persist(); drawClient(); drawTotals();
    };
    $('#addClient').onclick = () => editClient(null, c => { o.clientId = c.id; o.globalDiscount = +c.discount || o.globalDiscount; persist(); route(); });
  } else {
    $('#tname').oninput = e => { o.name = e.target.value; persist(); };
  }
  drawClient();

  /* -- Lignes -- */
  const drawLines = () => {
    $('#nLines').textContent = o.lines.length ? o.lines.length + ' ligne(s)' : '';
    $('#lines').innerHTML = o.lines.length ? o.lines.map((l, i) => `
      <div class="line" data-i="${i}">
        <div class="row between" style="flex-wrap:nowrap;align-items:start">
          <div class="grow">${l.productId ? `<div class="lt">${esc(l.name)}</div>` : `<input data-f="name" value="${esc(l.name)}" placeholder="Désignation" style="font-weight:600">`}
            <div class="muted small">${l.productId ? esc([l.ref, l.brand, l.unit].filter(Boolean).join(' · ')) : ''}${+l.publicPrice ? ` · public ${money(l.publicPrice)} HT` : ''}</div></div>
          <button class="btn ghost sm" data-del="${i}" aria-label="Supprimer la ligne">🗑</button>
        </div>
        <div class="lgrid">
          <div><label>Qté</label><div class="stepper"><button type="button" data-step="-1">−</button><input data-f="qty" type="number" inputmode="numeric" min="0" value="${l.qty}"><button type="button" data-step="1">＋</button></div></div>
          <div><label>PU HT (€)</label><input data-f="price" type="number" inputmode="decimal" step="any" value="${l.price}"></div>
          <div><label>Remise %</label><input data-f="discount" type="number" inputmode="decimal" step="any" min="0" max="100" value="${+l.discount || ''}" placeholder="0"></div>
        </div>
        <div class="ltot num" data-tot></div>
      </div>`).join('') : `<div class="empty">Aucune ligne. Ajoutez des produits du catalogue.</div>`;
    drawLineTotals();
  };
  const drawLineTotals = () => {
    const t = calc(o);
    $$('#lines .line').forEach((el, i) => {
      const l = t.lines[i];
      el.querySelector('[data-tot]').innerHTML = `${num(l.qty, 0)} × ${money(l.net)} = ${money(l.total)} HT`;
    });
  };
  const drawTotals = () => {
    const t = calc(o);
    $('#totals').innerHTML = `<table class="totals">
      <tr><td>Sous-total HT</td><td>${money(t.subtotal)}</td></tr>
      ${t.globalDiscount ? `<tr><td>Remise globale ${pct(o.globalDiscount)}</td><td>- ${money(t.globalDiscount)}</td></tr>` : ''}
      <tr><td><b>Total HT</b></td><td><b>${money(t.totalHT)}</b></td></tr>
      <tr><td>TVA ${pct(S().vat)}</td><td>${money(t.vat)}</td></tr>
      <tr class="big"><td>Total TTC</td><td>${money(t.totalTTC)}</td></tr></table>
      ${t.saving > 0.005 ? `<div class="saving">Économie client : ${money(t.saving)} HT (−${pct(t.savingPct)}) vs prix public ${money(t.publicTotal)} HT</div>` : ''}`;
  };
  const lines = $('#lines');
  lines.addEventListener('input', e => {
    const f = e.target.dataset.f; if (!f) return;
    const i = +e.target.closest('.line').dataset.i;
    o.lines[i][f] = f === 'name' ? e.target.value : parseNum(e.target.value);
    persist(); drawLineTotals(); drawTotals();
  });
  lines.addEventListener('click', e => {
    const st = e.target.closest('[data-step]'), del = e.target.closest('[data-del]');
    if (st) {
      const i = +st.closest('.line').dataset.i, l = o.lines[i];
      l.qty = Math.max(0, (+l.qty || 0) + +st.dataset.step);
      st.parentElement.querySelector('input').value = l.qty;
      persist(); drawLineTotals(); drawTotals();
    } else if (del) {
      o.lines.splice(+del.dataset.del, 1); persist(); drawLines(); drawTotals();
    }
  });
  $('#addProd').onclick = () => pickProducts(o, () => { persist(); drawLines(); drawTotals(); });
  $('#addFree').onclick = () => { o.lines.push({ productId: '', ref: '', name: '', brand: '', unit: '', publicPrice: 0, price: 0, qty: 1, discount: 0 }); persist(); drawLines(); drawTotals(); const ins = $$('#lines [data-f=name]'); ins.length && ins[ins.length - 1].focus(); };
  $('#gd').oninput = e => { o.globalDiscount = parseNum(e.target.value); persist(); drawTotals(); };
  $('#applyAll').onclick = () => {
    const v = prompt('Remise (%) à appliquer sur chaque ligne :', o.globalDiscount || (client() && client().discount) || '');
    if (v === null) return;
    o.lines.forEach(l => l.discount = parseNum(v)); o.globalDiscount = 0; $('#gd').value = 0;
    persist(); drawLines(); drawTotals();
  };
  drawLines(); drawTotals();

  /* -- Conditions -- */
  const drawValid = () => { $('#validTxt').textContent = isOffer ? "Jusqu'au " + fmtDate(validUntil(o)) : ''; };
  const bind = (sel, k, numeric) => { $(sel).oninput = e => { o[k] = numeric ? parseNum(e.target.value) : e.target.value; persist(); drawValid(); }; };
  if (isOffer) bind('#date', 'date');
  bind('#valid', 'validityDays', true); bind('#franco', 'franco'); bind('#delivery', 'delivery'); bind('#msg', 'message');
  drawValid();

  /* -- Actions -- */
  $('#del').onclick = () => {
    if (!confirm(isOffer ? 'Supprimer cette proposition ?' : 'Supprimer ce modèle ?')) return;
    db[coll] = db[coll].filter(x => x !== o); save(coll); go(isOffer ? '#/offres' : '#/modeles');
  };
  if (!isOffer) { $('#useTpl').onclick = () => newOffer({ template: o }); return; }
  const markSent = () => { if (o.status !== 'envoyée') { o.status = 'envoyée'; o.sentAt = new Date().toISOString(); persist(); $('#sent').checked = true; } };
  const ready = () => {
    if (!o.lines.length) { alert('Ajoutez au moins une ligne.'); return false; }
    if (!o.clientId && !confirm("Aucun client n'est choisi. Continuer quand même ?")) return false;
    return true;
  };
  $('#sent').onchange = e => { o.status = e.target.checked ? 'envoyée' : 'brouillon'; o.sentAt = e.target.checked ? new Date().toISOString() : ''; persist(); };
  $('#pdf').onclick = () => { if (!ready()) return; const { blob, name } = makePdf(o); download(name, blob); toast('PDF téléchargé'); };
  $('#sharePdf').onclick = async () => {
    if (!ready()) return;
    const { blob, name } = makePdf(o);
    const file = new File([blob], name, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Proposition ' + o.number, text: shortText(o) }); markSent(); }
      catch (e) { if (e.name !== 'AbortError') { download(name, blob); } }
    } else { download(name, blob); toast('Partage non disponible : PDF téléchargé'); }
  };
  $('#mail').onclick = () => {
    if (!ready()) return;
    const c = client();
    location.href = `mailto:${encodeURIComponent(c && c.email || '')}?subject=${encodeURIComponent(mailSubject(o))}&body=${encodeURIComponent(longText(o))}`;
    markSent();
  };
  $('#text').onclick = () => { if (ready()) textDialog(o, markSent); };
  $('#dup').onclick = () => duplicateOffer(o);
  $('#asTpl').onclick = () => {
    const name = prompt('Nom du modèle :', '');
    if (!name) return;
    db.templates.push({ id: uid(), name, lines: o.lines.map(l => Object.assign({}, l)), globalDiscount: 0, franco: o.franco, delivery: o.delivery, message: o.message, validityDays: o.validityDays });
    save('templates'); toast('Modèle « ' + name + ' » enregistré');
  };
}

function duplicateOffer(o, clientId) {
  const hasCat = o.lines.some(l => l.productId && byId('products', l.productId));
  const upd = hasCat && confirm('Mettre à jour les prix avec le catalogue actuel ?\n(OK = prix du catalogue, Annuler = garder les prix de l\'ancienne offre)');
  newOffer({ from: Object.assign({}, o, { lines: upd ? refreshPrices(o.lines) : o.lines }), clientId });
  toast('Offre dupliquée');
}

function makePdf(o) {
  const c = byId('clients', o.clientId);
  const doc = buildOfferPdf(o, c, S());
  return { blob: doc.output('blob'), name: `Proposition_${o.number}${c ? '_' + safeName(c.name) : ''}.pdf` };
}

/* ---------- Textes ---------- */
function mailSubject(o) { return `Proposition ${S().company.name} n° ${o.number}`; }
function greeting(c) { return c && c.contact ? `Bonjour ${c.contact},` : 'Bonjour,'; }
function sig() {
  const s = S(), se = s.seller, co = s.company;
  return [se.name, se.title, co.name, se.phone || co.phone, se.email].filter(Boolean).join('\n');
}
function conditionsText(o) {
  return [o.franco, o.delivery && 'Livraison : ' + o.delivery, `Offre valable jusqu'au ${fmtDate(validUntil(o))}`].filter(Boolean).join(' · ');
}
function shortText(o) {
  const c = byId('clients', o.clientId), t = calc(o);
  const lines = t.lines.map(l => `• ${num(l.qty, 0)} × ${l.name}${l.ref ? ' (' + l.ref + ')' : ''} : ${money(l.net)} HT/u`);
  return [greeting(c), '',
    `Voici notre proposition ${S().company.name} n° ${o.number} :`, ...lines, '',
    `Total : ${money(t.totalHT)} HT (${money(t.totalTTC)} TTC)` + (t.globalDiscount ? `, remise ${pct(o.globalDiscount)} incluse` : ''),
    t.saving > 0.005 ? `Votre économie : ${money(t.saving)} HT (−${pct(t.savingPct)} vs prix public)` : '',
    conditionsText(o),
    o.message ? '\n' + o.message.trim() : '', '',
    sig()].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n').trim();
}
function longText(o) {
  const c = byId('clients', o.clientId), t = calc(o);
  const lines = t.lines.map(l => `- ${num(l.qty, 0)} × ${l.name}${l.brand ? ' – ' + l.brand : ''}${l.ref ? ' (réf. ' + l.ref + ')' : ''}${l.unit ? ', ' + l.unit : ''} : ${money(l.net)} HT/u${l.discount ? ' (remise ' + pct(l.discount) + ')' : ''} = ${money(l.total)} HT`);
  return [greeting(c), '',
    (o.message && o.message.trim()) || 'Suite à notre échange, je vous prie de trouver ci-dessous notre proposition tarifaire.', '',
    `PROPOSITION N° ${o.number} du ${fmtDate(o.date)}`, ...lines, '',
    t.globalDiscount ? `Remise globale ${pct(o.globalDiscount)} : -${money(t.globalDiscount)} HT` : '',
    `Total HT : ${money(t.totalHT)}`, `TVA ${pct(S().vat)} : ${money(t.vat)}`, `Total TTC : ${money(t.totalTTC)}`,
    t.saving > 0.005 ? `\nVotre économie : ${money(t.saving)} HT, soit ${pct(t.savingPct)} par rapport au prix public.` : '', '',
    'Conditions : ' + conditionsText(o), '',
    'Je reste à votre disposition pour toute question ou pour enregistrer votre commande.', '',
    'Bien cordialement,', sig()].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
}
function textDialog(o, onSent) {
  const c = byId('clients', o.clientId);
  const phone = c && c.phone ? c.phone.replace(/[^\d+]/g, '') : '';
  const intl = phone.startsWith('0') ? '33' + phone.slice(1) : phone.replace('+', '');
  openDialog({
    title: 'Texte de l\'offre',
    body: `<div class="chips"><button type="button" class="chip on" data-kind="short">Court (SMS/WhatsApp)</button><button type="button" class="chip" data-kind="long">Email détaillé</button></div>
      <textarea id="txt" style="min-height:300px"></textarea>
      <div class="btns stack" style="margin-top:.6rem">
        <button type="button" class="btn primary" id="copy">📋 Copier</button>
        <a class="btn" id="wa" target="_blank" rel="noopener">WhatsApp</a>
        <a class="btn" id="sms">SMS</a>
        <a class="btn" id="em">✉️ Email</a>
      </div>`,
    onOpen: f => {
      const set = k => {
        $('#txt', f).value = k === 'long' ? longText(o) : shortText(o);
        $$('[data-kind]', f).forEach(b => b.classList.toggle('on', b.dataset.kind === k)); upd();
      };
      const upd = () => {
        const v = $('#txt', f).value;
        $('#wa', f).href = (intl ? `https://wa.me/${intl}` : 'https://wa.me/') + '?text=' + encodeURIComponent(v);
        $('#sms', f).href = `sms:${phone}${/iPhone|iPad/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(v)}`;
        $('#em', f).href = `mailto:${encodeURIComponent(c && c.email || '')}?subject=${encodeURIComponent(mailSubject(o))}&body=${encodeURIComponent(v)}`;
      };
      $$('[data-kind]', f).forEach(b => b.onclick = () => set(b.dataset.kind));
      $('#txt', f).oninput = upd;
      ['#wa', '#sms', '#em'].forEach(s => $(s, f).addEventListener('click', onSent));
      $('#copy', f).onclick = async () => {
        const v = $('#txt', f).value;
        try { await navigator.clipboard.writeText(v); } catch (e) { $('#txt', f).select(); document.execCommand('copy'); }
        toast('Texte copié');
      };
      set('short');
    }
  });
}

/* ---------- Sélecteur de produits ---------- */
function pickProducts(o, onChange) {
  let cat = '';
  openDialog({
    title: 'Ajouter des produits',
    body: `<input id="pq" type="search" placeholder="Référence ou mot-clé…" autocomplete="off">
      <div class="chips" style="margin-top:.5rem"><button type="button" class="chip on" data-cat="">Tous</button>${Object.entries(CATS).map(([k, v]) => `<button type="button" class="chip" data-cat="${k}">${CAT_ICON[k]} ${v}</button>`).join('')}</div>
      <div id="pres"></div>`,
    actions: [{ label: 'Terminé', cls: 'primary' }],
    onOpen: f => {
      const draw = () => {
        const words = norm($('#pq', f).value).split(/\s+/).filter(Boolean);
        const res = db.products.filter(p => (!cat || p.cat === cat) && words.every(w => norm([p.ref, p.name, p.brand, CATS[p.cat], p.unit].join(' ')).includes(w)))
          .sort((a, b) => a.name.localeCompare(b.name, 'fr')).slice(0, 80);
        $('#pres', f).innerHTML = res.length ? res.map(p => {
          const inO = o.lines.find(l => l.productId === p.id);
          return `<div class="pick-item" data-p="${p.id}"><div class="grow"><div><b>${esc(p.name)}</b></div>
            <div class="muted small">${esc([p.ref, p.brand, p.unit].filter(Boolean).join(' · '))}</div></div>
            <div class="right"><div class="num"><b>${money(p.price)}</b></div>${inO ? `<div class="in small">✓ ${num(inO.qty, 0)}</div>` : '<div class="muted small">＋ ajouter</div>'}</div></div>`;
        }).join('') : `<div class="empty">Aucun produit trouvé.${db.products.length ? '' : ' Le catalogue est vide : ajoutez des produits dans l\'onglet Catalogue.'}</div>`;
      };
      $('#pq', f).oninput = draw;
      $$('[data-cat]', f).forEach(b => b.onclick = () => { cat = b.dataset.cat; $$('[data-cat]', f).forEach(x => x.classList.toggle('on', x === b)); draw(); });
      $('#pres', f).onclick = e => {
        const it = e.target.closest('[data-p]'); if (!it) return;
        const p = byId('products', it.dataset.p);
        const ex = o.lines.find(l => l.productId === p.id);
        if (ex) ex.qty = (+ex.qty || 0) + 1; else o.lines.push(lineFromProduct(p, 1));
        onChange(); draw(); toast(`${p.name} ajouté`);
      };
      draw();
      if (matchMedia('(min-width:860px)').matches) $('#pq', f).focus();
    }
  });
}

/* ---------- Clients ---------- */
const CLIENT_FIELDS = [
  { k: 'name', label: 'Nom du garage *', req: true },
  { k: 'contact', label: 'Contact', ph: 'M. / Mme …' },
  { k: 'phone', label: 'Téléphone', type: 'tel' },
  { k: 'email', label: 'Email', type: 'email' },
  { k: 'city', label: 'Ville' },
  { k: 'discount', label: 'Remise habituelle (%)', type: 'number' },
  { k: 'notes', label: 'Notes', type: 'textarea' }
];
function editClient(c, after) {
  const isNew = !c;
  openDialog({
    title: isNew ? 'Nouveau client' : 'Modifier le client',
    body: `<div class="grid2">${fieldsHTML(CLIENT_FIELDS.slice(0, 6), c || {})}</div>${fieldsHTML(CLIENT_FIELDS.slice(6), c || {})}`,
    actions: [{ label: 'Annuler', novalidate: true }, {
      label: 'Enregistrer', cls: 'primary', onClick: f => {
        if (!f.reportValidity()) return false;
        const v = readFields(f, CLIENT_FIELDS);
        if (isNew) { c = Object.assign({ id: uid() }, v); db.clients.push(c); } else { Object.assign(c, v); delete c.demo; }
        save('clients'); toast('Client enregistré');
        setTimeout(() => after ? after(c) : route());
      }
    }]
  });
}
function viewClients(app) {
  const st = viewClients.state || (viewClients.state = { q: '' });
  app.innerHTML = `<div class="row between"><h1>Clients</h1><button class="btn primary" id="add">＋ Client</button></div>
    <div class="card"><input id="q" type="search" placeholder="Rechercher un garage, une ville…" value="${esc(st.q)}"><ul class="list" id="list"></ul></div>
    <div class="card"><h2>Import / export CSV (Excel)</h2>
      <p class="small muted">Colonnes : <code>${CLIENT_CSV_HEAD.join(';')}</code>. À l'import, un client déjà présent (même nom et même ville) est mis à jour.</p>
      <div class="btns"><button class="btn" id="imp">⬆️ Importer un CSV</button><button class="btn" id="exp">⬇️ Exporter les clients</button></div>
      <input type="file" id="file" accept=".csv,text/csv,text/plain" class="hidden"></div>`;
  const draw = () => {
    const q = norm(st.q);
    const list = sortedClients().filter(c => !q || norm([c.name, c.contact, c.city, c.phone, c.email].join(' ')).includes(q));
    $('#list').innerHTML = list.length ? list.map(c => {
      const n = db.offers.filter(o => o.clientId === c.id).length;
      return `<li class="item" data-c="${c.id}"><div class="grow"><div class="t">${esc(c.name)} ${c.demo ? '<span class="badge demo">exemple</span>' : ''}</div>
        <div class="muted small">${esc([c.contact, c.city].filter(Boolean).join(' · '))}</div></div>
        <div class="right small muted">${c.discount ? `remise ${pct(c.discount)}<br>` : ''}${n} offre(s)</div></li>`;
    }).join('') : `<li class="empty">Aucun client.</li>`;
  };
  draw();
  $('#q').oninput = e => { st.q = e.target.value; draw(); };
  $('#list').onclick = e => { const li = e.target.closest('[data-c]'); if (li) go('#/client/' + li.dataset.c); };
  $('#add').onclick = () => editClient(null, c => go('#/client/' + c.id));
  $('#exp').onclick = () => download(`clients-${todayISO()}.csv`, toCSV(CLIENT_CSV_HEAD, sortedClients().map(c => [c.name, c.contact, c.phone, c.email, c.city, String(+c.discount || 0).replace('.', ','), c.notes])), 'text/csv;charset=utf-8');
  $('#imp').onclick = () => $('#file').click();
  $('#file').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (f) importClientsCSV(await readText(f)); };
}
const CLIENT_CSV_HEAD = ['nom', 'contact', 'telephone', 'email', 'ville', 'remise', 'notes'];
function toCSV(head, rows) {
  const q = v => { v = String(v == null ? '' : v); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  return '\ufeff' + [head.join(';'), ...rows.map(r => r.map(q).join(';'))].join('\r\n') + '\r\n';
}
function importClientsCSV(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) return alert('Fichier vide ou illisible.');
  const H = rows[0].map(h => norm(h).replace(/[^a-z]/g, ''));
  const find = (...keys) => H.findIndex(h => keys.some(k => h.startsWith(k)));
  const ix = { name: find('nom', 'garage', 'raison', 'client'), contact: find('contact', 'interlocuteur'), phone: find('tel', 'portable', 'mobile'),
    email: find('email', 'mail', 'courriel'), city: find('ville', 'commune'), discount: find('remise'), notes: find('note', 'comment') };
  if (ix.name < 0) return alert('Colonne « nom » introuvable dans la 1re ligne.');
  const key = c => norm(c.name) + '|' + norm(c.city);
  const items = rows.slice(1).map(r => {
    const g = k => ix[k] >= 0 ? (r[ix[k]] || '').trim() : '';
    return { name: g('name'), contact: g('contact'), phone: g('phone'), email: g('email'), city: g('city'), discount: parseNum(g('discount')), notes: g('notes') };
  }).filter(c => c.name);
  if (!confirm(`${items.length} client(s) lu(s). Les importer ?\n(Les clients déjà présents, même nom et même ville, seront mis à jour.)`)) return;
  let a = 0, u = 0;
  const before = db.clients.slice();
  items.forEach(c => { const ex = before.find(x => key(x) === key(c)); if (ex) { Object.assign(ex, c); delete ex.demo; u++; } else { db.clients.push(Object.assign({ id: uid() }, c)); a++; } });
  save('clients'); toast(`${a} client(s) ajouté(s), ${u} mis à jour`); route();
}
function viewClient(app, id) {
  const c = byId('clients', id); if (!c) return go('#/clients');
  const offers = db.offers.filter(o => o.clientId === id).sort((a, b) => (b.date + b.createdAt).localeCompare(a.date + a.createdAt));
  const tel = (c.phone || '').replace(/[^\d+]/g, '');
  app.innerHTML = `<a href="#/clients" class="btn ghost sm">← Clients</a>
    <h1>${esc(c.name)} ${c.demo ? '<span class="badge demo">exemple</span>' : ''}</h1>
    <div class="card">
      <div class="grid2 small">
        <div><span class="muted">Contact</span><br>${esc(c.contact || '—')}</div>
        <div><span class="muted">Ville</span><br>${esc(c.city || '—')}</div>
        <div><span class="muted">Téléphone</span><br>${c.phone ? `<a href="tel:${esc(tel)}">${esc(c.phone)}</a>` : '—'}</div>
        <div><span class="muted">Email</span><br>${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '—'}</div>
        <div><span class="muted">Remise habituelle</span><br>${pct(c.discount)}</div>
        ${c.notes ? `<div><span class="muted">Notes</span><br>${esc(c.notes)}</div>` : ''}
      </div>
      <div class="btns" style="margin-top:.8rem"><button class="btn primary" id="newO">＋ Nouvelle offre</button><button class="btn" id="edit">Modifier</button><button class="btn danger" id="del">Supprimer</button></div>
    </div>
    <div class="card"><h2>Historique des propositions (${offers.length})</h2>
      <ul class="list" id="list">${offers.length ? offers.map(o => offerItemHTML(o).replace('</li>', `<div><button class="btn sm" data-dup="${o.id}" title="Dupliquer">⧉</button></div></li>`)).join('') : '<li class="empty">Aucune proposition pour ce client.</li>'}</ul></div>`;
  $('#newO').onclick = () => newOffer({ clientId: id });
  $('#edit').onclick = () => editClient(c);
  $('#del').onclick = () => {
    if (!confirm(`Supprimer ${c.name} ?` + (offers.length ? `\nSes ${offers.length} proposition(s) seront conservées sans client.` : ''))) return;
    db.clients = db.clients.filter(x => x !== c); save('clients'); go('#/clients');
  };
  $('#list').onclick = e => {
    const d = e.target.closest('[data-dup]');
    if (d) { e.stopPropagation(); return duplicateOffer(byId('offers', d.dataset.dup), id); }
    const li = e.target.closest('[data-offer]'); if (li) go('#/offre/' + li.dataset.offer);
  };
}

/* ---------- Catalogue ---------- */
const PRODUCT_FIELDS = [
  { k: 'ref', label: 'Référence *', req: true },
  { k: 'name', label: 'Désignation *', req: true },
  { k: 'brand', label: 'Marque' },
  { k: 'cat', label: 'Catégorie', type: 'select', options: Object.entries(CATS) },
  { k: 'publicPrice', label: 'Prix public HT (€)', type: 'number' },
  { k: 'price', label: 'Mon prix de vente HT (€)', type: 'number' },
  { k: 'unit', label: 'Unité / conditionnement', ph: 'pièce, jeu, paire, bidon 10 L, lot de 20…', list: ['pièce', 'jeu (4)', 'paire', 'bidon 10 L', 'bidon 20 L', 'lot de 20', 'carton'] }
];
function editProduct(p) {
  const isNew = !p;
  openDialog({
    title: isNew ? 'Nouveau produit' : 'Modifier le produit',
    body: `<div class="grid2">${fieldsHTML(PRODUCT_FIELDS, p || { cat: 'autre' })}</div><div id="marg" class="muted small"></div>`,
    actions: [
      ...(isNew ? [] : [{ label: 'Supprimer', cls: 'danger', novalidate: true, onClick: () => { if (!confirm('Supprimer ce produit du catalogue ?')) return false; db.products = db.products.filter(x => x !== p); save('products'); setTimeout(route); } }]),
      { label: 'Annuler', novalidate: true },
      { label: 'Enregistrer', cls: 'primary', onClick: f => {
        if (!f.reportValidity()) return false;
        const v = readFields(f, PRODUCT_FIELDS);
        const dup = db.products.find(x => x !== p && norm(x.ref) === norm(v.ref));
        if (dup && !confirm(`La référence ${v.ref} existe déjà (${dup.name}). Enregistrer quand même ?`)) return false;
        if (isNew) db.products.push(Object.assign({ id: uid() }, v)); else { Object.assign(p, v); delete p.demo; }
        save('products'); toast('Produit enregistré'); setTimeout(route);
      } }
    ],
    onOpen: f => {
      const upd = () => { const a = parseNum(f.elements.publicPrice.value), b = parseNum(f.elements.price.value); $('#marg', f).textContent = a && b ? `Remise vs prix public : ${pct((1 - b / a) * 100)}` : ''; };
      f.elements.publicPrice.oninput = f.elements.price.oninput = upd; upd();
    }
  });
}
function viewCatalog(app) {
  const st = viewCatalog.state || (viewCatalog.state = { q: '', cat: '' });
  app.innerHTML = `<div class="row between"><h1>Catalogue</h1><button class="btn primary" id="add">＋ Produit</button></div>
    <div class="card">
      <input id="q" type="search" placeholder="Référence, désignation, marque…" value="${esc(st.q)}">
      <div class="chips" style="margin-top:.5rem"><button class="chip ${!st.cat ? 'on' : ''}" data-cat="">Tous (${db.products.length})</button>${Object.entries(CATS).map(([k, v]) => `<button class="chip ${st.cat === k ? 'on' : ''}" data-cat="${k}">${CAT_ICON[k]} ${v}</button>`).join('')}</div>
      <ul class="list" id="list"></ul>
    </div>
    <div class="card"><h2>Import / export CSV (Excel)</h2>
      <p class="small muted">Colonnes : <code>reference;designation;marque;categorie;prix_public_ht;prix_vente_ht;unite</code>. Séparateur « ; » ou « , », décimales avec virgule acceptées. Catégories : batterie, freinage, adblue, pneus, huiles, autre.</p>
      <div class="btns"><button class="btn" id="imp">⬆️ Importer un CSV</button><button class="btn" id="exp">⬇️ Exporter le catalogue</button><button class="btn" id="tpl">Modèle CSV vide</button></div>
      <input type="file" id="file" accept=".csv,text/csv,text/plain" class="hidden">
    </div>`;
  const draw = () => {
    const words = norm(st.q).split(/\s+/).filter(Boolean);
    const list = db.products.filter(p => (!st.cat || p.cat === st.cat) && words.every(w => norm([p.ref, p.name, p.brand, p.unit].join(' ')).includes(w)))
      .sort((a, b) => (a.cat + a.name).localeCompare(b.cat + b.name, 'fr'));
    $('#list').innerHTML = list.length ? list.map(p => `<li class="item" data-p="${p.id}">
      <div style="font-size:1.3rem">${CAT_ICON[p.cat] || '🔧'}</div>
      <div class="grow"><div class="t">${esc(p.name)} ${p.demo ? '<span class="badge demo">exemple</span>' : ''}</div><div class="muted small">${esc([p.ref, p.brand, p.unit].filter(Boolean).join(' · '))}</div></div>
      <div class="right num"><b>${money(p.price)}</b><div class="muted small">${p.publicPrice ? 'public ' + money(p.publicPrice) : ''}</div></div></li>`).join('')
      : `<li class="empty">Aucun produit.</li>`;
  };
  draw();
  $('#q').oninput = e => { st.q = e.target.value; draw(); };
  $$('[data-cat]').forEach(b => b.onclick = () => { st.cat = b.dataset.cat; $$('[data-cat]').forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $('#list').onclick = e => { const li = e.target.closest('[data-p]'); if (li) editProduct(byId('products', li.dataset.p)); };
  $('#add').onclick = () => editProduct(null);
  $('#exp').onclick = () => { download(`catalogue-${todayISO()}.csv`, catalogToCSV(db.products), 'text/csv;charset=utf-8'); };
  $('#tpl').onclick = () => { download('modele-catalogue.csv', catalogToCSV([{ ref: 'REF-001', name: 'Exemple de désignation', brand: 'Marque', cat: 'batterie', publicPrice: 100, price: 75, unit: 'pièce' }]), 'text/csv;charset=utf-8'); };
  $('#imp').onclick = () => $('#file').click();
  $('#file').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (f) importCSV(await readText(f)); };
}
const CSV_HEAD = ['reference', 'designation', 'marque', 'categorie', 'prix_public_ht', 'prix_vente_ht', 'unite'];
function catalogToCSV(list) {
  const q = v => { v = String(v == null ? '' : v); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const dec = n => (+n || 0).toFixed(2).replace('.', ',');
  return '﻿' + [CSV_HEAD.join(';'), ...list.map(p => [p.ref, p.name, p.brand, p.cat, dec(p.publicPrice), dec(p.price), p.unit].map(q).join(';'))].join('\r\n') + '\r\n';
}
function readText(file) {
  return file.arrayBuffer().then(buf => {
    let t = new TextDecoder('utf-8').decode(buf);
    if (t.includes('�')) t = new TextDecoder('windows-1252').decode(buf); // CSV Excel « ANSI »
    return t.replace(/^﻿/, '');
  });
}
function parseCSV(text) {
  const first = text.split(/\r?\n/)[0] || '';
  const cnt = ch => first.split(ch).length - 1;
  const sep = [';', '\t', ','].sort((a, b) => cnt(b) - cnt(a))[0];
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim()));
}
function importCSV(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) return alert('Fichier vide ou illisible.');
  const H = rows[0].map(h => norm(h).replace(/[^a-z]/g, ''));
  const find = (...keys) => H.findIndex(h => keys.some(k => h.startsWith(k)));
  const ix = {
    ref: find('ref'), name: find('designation', 'libelle', 'nom', 'description'), brand: find('marque', 'brand', 'fabricant'),
    cat: find('categ', 'famille'), publicPrice: find('prixpublic', 'public', 'pvc', 'tarif'), price: find('prixvente', 'monprix', 'vente', 'prixnet', 'net'),
    unit: find('unite', 'cond', 'unit')
  };
  if (ix.ref < 0 || ix.name < 0) return alert('Colonnes « reference » et « designation » introuvables dans la 1re ligne.\nTéléchargez le « Modèle CSV vide » pour voir le format attendu.');
  const items = rows.slice(1).map(r => {
    const g = k => ix[k] >= 0 ? (r[ix[k]] || '').trim() : '';
    return { ref: g('ref'), name: g('name'), brand: g('brand'), cat: normCat(g('cat')), publicPrice: parseNum(g('publicPrice')), price: parseNum(g('price')), unit: g('unit') };
  }).filter(p => p.ref || p.name);
  openDialog({
    title: 'Importer le catalogue',
    body: `<p><b>${items.length}</b> produit(s) lu(s) dans le fichier.</p>
      <p class="small muted">Aperçu : ${items.slice(0, 3).map(p => esc(`${p.ref} – ${p.name} – ${money(p.price)}`)).join('<br>')}</p>
      <p>Comment importer ?</p>
      <ul class="small"><li><b>Fusionner</b> : met à jour les produits ayant la même référence, ajoute les nouveaux.</li><li><b>Remplacer</b> : efface tout le catalogue actuel puis importe.</li></ul>`,
    actions: [{ label: 'Annuler' },
      { label: 'Remplacer tout', cls: 'danger', onClick: () => { db.products = items.map(p => Object.assign({ id: uid() }, p)); save('products'); toast(items.length + ' produits importés'); setTimeout(route); } },
      { label: 'Fusionner', cls: 'primary', onClick: () => {
        let a = 0, u = 0;
        items.forEach(p => { const ex = db.products.find(x => norm(x.ref) === norm(p.ref)); if (ex) { Object.assign(ex, p); delete ex.demo; u++; } else { db.products.push(Object.assign({ id: uid() }, p)); a++; } });
        save('products'); toast(`${a} ajouté(s), ${u} mis à jour`); setTimeout(route);
      } }]
  });
}

/* ---------- Modèles ---------- */
function viewTemplates(app) {
  app.innerHTML = `<div class="row between"><h1>Modèles d'offres</h1><button class="btn primary" id="add">＋ Modèle</button></div>
    <p class="muted small">Un modèle mémorise des lignes et des conditions (ex. « Pack freinage », « AdBlue x20 »). Les prix sont repris du catalogue au moment de créer l'offre. Vous pouvez aussi créer un modèle depuis une offre (« Enregistrer comme modèle »).</p>
    <div class="card"><ul class="list" id="list">${db.templates.length ? db.templates.map(t => `<li class="item" data-t="${t.id}">
      <div class="grow"><div class="t">⭐ ${esc(t.name || 'Sans nom')} ${t.demo ? '<span class="badge demo">exemple</span>' : ''}</div>
      <div class="muted small">${esc(t.lines.map(l => num(l.qty, 0) + ' × ' + l.name).join(', ') || 'aucune ligne')}</div></div>
      <button class="btn sm primary" data-use="${t.id}">Utiliser</button></li>`).join('') : '<li class="empty">Aucun modèle.</li>'}</ul></div>`;
  $('#add').onclick = () => { const t = { id: uid(), name: 'Nouveau modèle', lines: [], globalDiscount: 0, franco: S().defaultFranco, delivery: S().defaultDelivery, message: '', validityDays: S().defaultValidity }; db.templates.push(t); save('templates'); go('#/modele/' + t.id); };
  $('#list').onclick = e => {
    const u = e.target.closest('[data-use]'); if (u) return newOffer({ template: byId('templates', u.dataset.use) });
    const li = e.target.closest('[data-t]'); if (li) go('#/modele/' + li.dataset.t);
  };
}

/* ---------- Réglages ---------- */
const SET_COMPANY = [
  { k: 'name', label: "Nom de l'entreprise" }, { k: 'address', label: 'Adresse' }, { k: 'zip', label: 'Code postal' }, { k: 'city', label: 'Ville' },
  { k: 'phone', label: 'Téléphone', type: 'tel' }, { k: 'email', label: 'Email', type: 'email' }, { k: 'web', label: 'Site web' },
  { k: 'siret', label: 'SIRET' }, { k: 'vatNumber', label: 'N° TVA intracommunautaire' }
];
const SET_SELLER = [{ k: 'name', label: 'Nom et prénom' }, { k: 'title', label: 'Fonction' }, { k: 'phone', label: 'Portable', type: 'tel' }, { k: 'email', label: 'Email', type: 'email' }];
const SET_OFFER = [
  { k: 'vat', label: 'Taux de TVA (%)', type: 'number' }, { k: 'prefix', label: 'Préfixe de numérotation' },
  { k: 'nextNum', label: 'Prochain numéro', type: 'number' }, { k: 'defaultValidity', label: 'Validité par défaut (jours)', type: 'number' },
  { k: 'defaultFranco', label: 'Port par défaut' }, { k: 'defaultDelivery', label: 'Délai de livraison par défaut' }
];
function viewSettings(app) {
  const s = S();
  const demoCount = ['products', 'clients', 'offers', 'templates'].reduce((a, k) => a + db[k].filter(x => x.demo).length, 0);
  let used = 0; try { for (const k in localStorage) if (k.startsWith('pa.')) used += (localStorage.getItem(k) || '').length; } catch (e) { }
  app.innerHTML = `<h1>Réglages</h1>
    <form id="sf">
    <div class="card"><h2>Logo</h2>
      <div class="row">${s.logo ? `<img src="${s.logo}" class="logo-prev" alt="Logo">` : '<span class="muted small">Aucun logo</span>'}
        <button type="button" class="btn sm" id="logoBtn">Choisir une image</button>${s.logo ? '<button type="button" class="btn sm danger" id="logoDel">Retirer</button>' : ''}</div>
      <input type="file" id="logoFile" accept="image/png,image/jpeg,image/webp" class="hidden"></div>
    <div class="card"><h2>Entreprise</h2><div class="grid2">${fieldsHTML(SET_COMPANY.map(f => Object.assign({}, f, { k: 'c_' + f.k })), prefix(s.company, 'c_'))}</div></div>
    <div class="card"><h2>Vendeur (vous)</h2><div class="grid2">${fieldsHTML(SET_SELLER.map(f => Object.assign({}, f, { k: 's_' + f.k })), prefix(s.seller, 's_'))}</div></div>
    <div class="card"><h2>Offres</h2><div class="grid2">${fieldsHTML(SET_OFFER, s)}</div>
      ${fieldsHTML([{ k: 'defaultMessage', label: 'Message par défaut', type: 'textarea' }, { k: 'legal', label: 'Mentions légales (bas du PDF)', type: 'textarea' }], s)}</div>
    <div class="sticky-actions"><button class="btn primary block" type="submit">Enregistrer les réglages</button></div>
    </form>
    <div class="card"><h2>Sauvegarde</h2>
      <p class="small muted">Vos données restent uniquement dans ce navigateur, sur cet appareil. Faites régulièrement une sauvegarde (fichier .json) et gardez-la en lieu sûr ; elle sert aussi à transférer vos données vers un autre appareil (téléphone ↔ PC).${s.lastBackup ? ' Dernière sauvegarde : ' + fmtDate(s.lastBackup) + '.' : ''}</p>
      <div class="btns"><button class="btn primary" id="bk">💾 Sauvegarder tout</button><button class="btn" id="rs">♻️ Restaurer une sauvegarde</button></div>
      <input type="file" id="rsFile" accept=".json,application/json" class="hidden">
      <p class="small muted" style="margin-bottom:0">Espace utilisé : ~${num(used / 1024, 0)} Ko · ${db.products.length} produits · ${db.clients.length} clients · ${db.offers.length} offres · ${db.templates.length} modèles</p>
    </div>
    <div class="card"><h2>Données d'exemple</h2>
      <p class="small muted">${demoCount ? `${demoCount} élément(s) fictif(s) marqué(s) « exemple ».` : "Aucune donnée d'exemple."}</p>
      <div class="btns">${demoCount ? '<button class="btn danger" id="demoDel">Effacer les données d\'exemple</button>' : '<button class="btn" id="demoAdd">Recharger les exemples</button>'}
        <button class="btn danger" id="wipe">Tout effacer</button></div></div>
    <div class="card"><h2>Installer sur le téléphone</h2>
      <p class="small">• <b>Android (Chrome)</b> : menu ⋮ → « Installer l'application » / « Ajouter à l'écran d'accueil ».<br>• <b>iPhone (Safari)</b> : bouton Partager → « Sur l'écran d'accueil ».<br>Une fois ouverte une première fois, l'application fonctionne aussi hors connexion.</p>
      <button class="btn ${window._installEvt ? '' : 'hidden'}" id="inst">📲 Installer maintenant</button></div>`;
  const f = $('#sf');
  f.onsubmit = e => {
    e.preventDefault();
    Object.assign(s.company, unprefix(readFields(f, SET_COMPANY.map(x => Object.assign({}, x, { k: 'c_' + x.k }))), 'c_'));
    Object.assign(s.seller, unprefix(readFields(f, SET_SELLER.map(x => Object.assign({}, x, { k: 's_' + x.k }))), 's_'));
    Object.assign(s, readFields(f, SET_OFFER), readFields(f, [{ k: 'defaultMessage' }, { k: 'legal' }]));
    s.nextNum = Math.max(1, Math.round(s.nextNum) || 1);
    save('settings'); toast('Réglages enregistrés');
  };
  $('#logoBtn').onclick = () => $('#logoFile').click();
  $('#logoFile').onchange = async e => { const file = e.target.files[0]; if (!file) return; s.logo = await resizeImage(file, 600); save('settings'); route(); };
  if ($('#logoDel')) $('#logoDel').onclick = () => { s.logo = ''; save('settings'); route(); };
  $('#bk').onclick = () => {
    const data = { app: 'propositions-pa', version: 1, exportedAt: new Date().toISOString() };
    KEYS.forEach(k => data[k] = db[k]);
    download(`sauvegarde-propositions-${todayISO()}.json`, JSON.stringify(data, null, 1), 'application/json');
    s.lastBackup = todayISO(); save('settings'); toast('Sauvegarde téléchargée');
  };
  $('#rs').onclick = () => $('#rsFile').click();
  $('#rsFile').onchange = async e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    let data; try { data = JSON.parse(await file.text()); } catch (err) { return alert('Fichier de sauvegarde illisible.'); }
    if (!data || data.app !== 'propositions-pa') return alert("Ce fichier n'est pas une sauvegarde de cette application.");
    if (!confirm(`Restaurer la sauvegarde du ${fmtDate((data.exportedAt || '').slice(0, 10))} ?\nToutes les données actuelles de cet appareil seront remplacées.`)) return;
    KEYS.forEach(k => { if (data[k] != null) db[k] = data[k]; });
    KEYS.forEach(save); localStorage.setItem('pa.init', '1'); load(); toast('Données restaurées'); route();
  };
  if ($('#demoDel')) $('#demoDel').onclick = () => {
    if (!confirm("Effacer tous les éléments marqués « exemple » ?")) return;
    ['products', 'clients', 'offers', 'templates'].forEach(k => { db[k] = db[k].filter(x => !x.demo); save(k); });
    toast("Données d'exemple effacées"); route();
  };
  if ($('#demoAdd')) $('#demoAdd').onclick = () => {
    const D = window.DEMO_DATA;
    ['products', 'clients', 'offers', 'templates'].forEach(k => { D[k].forEach(x => { if (!byId(k, x.id)) db[k].push(JSON.parse(JSON.stringify(x))); }); save(k); });
    toast('Exemples rechargés'); route();
  };
  $('#wipe').onclick = () => {
    if (!confirm('Effacer TOUTES les données (catalogue, clients, offres, modèles et réglages) de cet appareil ?')) return;
    if (prompt('Tapez EFFACER pour confirmer') !== 'EFFACER') return;
    KEYS.forEach(k => localStorage.removeItem('pa.' + k)); localStorage.setItem('pa.init', '1'); load(); route(); toast('Tout est effacé');
  };
  $('#inst').onclick = async () => { const ev = window._installEvt; if (!ev) return; ev.prompt(); await ev.userChoice; window._installEvt = null; $('#inst').classList.add('hidden'); };
}
const prefix = (o, p) => Object.fromEntries(Object.entries(o).map(([k, v]) => [p + k, v]));
const unprefix = (o, p) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.slice(p.length), v]));
function resizeImage(file, max) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      res(file.type === 'image/jpeg' ? c.toDataURL('image/jpeg', 0.88) : c.toDataURL('image/png'));
    };
    img.onerror = rej; img.src = URL.createObjectURL(file);
  });
}

/* ---------- Démarrage ---------- */
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); window._installEvt = e; });
window.addEventListener('hashchange', route);
load();
route();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
