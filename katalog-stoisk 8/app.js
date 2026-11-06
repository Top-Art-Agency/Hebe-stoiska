/* Katalog dla klientów: wybór elementów, termin, dostępność, wysyłka zapytania.
   Klient nie widzi cen: są w kolekcji „ceny”, którą czyta tylko admin. Kosztorys liczy panel. */
import {
  CONFIGURED, CFG_ as CFG, getFb, loadItems, loadSettings, loadReservations, esc, pic,
  todayStr, addDays, daysBetween, fmtD, fmtRange, overlaps, isDate, hasStock, setDateLocale,
} from "./common.js";
import { t, getLang, setLang, locale, applyStatic, daysWord, countWord, itName, itDim, itCat, itUnit } from "./i18n.js";

const $ = id => document.getElementById(id);
let ITEMS = [], SET = {}, CATS = [], RES = [];
let cart = {}, dateFrom = "", dateTo = "", filter = "", sentId = "";   // filter "" = wszystkie kategorie

try { const s = JSON.parse(localStorage.getItem("katalog-stoisko-v4") || "{}"); cart = s.cart || {}; dateFrom = s.dateFrom || ""; dateTo = s.dateTo || ""; sentId = s.sentId || ""; } catch (e) {}
const save = () => { try { localStorage.setItem("katalog-stoisko-v4", JSON.stringify({ cart, dateFrom, dateTo, sentId })); } catch (e) {} };

const key = it => it._id;
const byId = id => ITEMS.find(i => key(i) === id);
const maxQty = it => hasStock(it) ? it.stock : 999;

/* ---------- termin ---------- */
/** Dni użycia + dni rezerwacji (z zapasem na transport, montaż i demontaż) albo null */
function term() {
  if (!isDate(dateFrom)) return null;
  const useTo = isDate(dateTo) && dateTo >= dateFrom ? dateTo : dateFrom;
  return { useFrom: dateFrom, useTo, days: daysBetween(dateFrom, useTo) + 1,
    from: addDays(dateFrom, -SET.zapasPrzed), to: addDays(useTo, SET.zapasPo) };
}
const bufferText = () => SET.zapasPrzed === SET.zapasPo
  ? t("bufSame", { n: daysWord(SET.zapasPrzed) })
  : t("bufDiff", { a: daysWord(SET.zapasPrzed), b: daysWord(SET.zapasPo) });

/* ---------- dostępność ---------- */
function availability(it) {
  const tm = term(); const stock = hasStock(it) ? it.stock : null;
  const list = [];
  if (tm) for (const r of RES) {
    if (r._id === sentId) continue;
    if (!overlaps(r.resFrom, r.resTo, tm.from, tm.to)) continue;
    const q = (r.items || []).filter(x => x.id === key(it)).reduce((s, x) => s + (Number(x.qty) || 0), 0);
    if (q) list.push({ event: r.event, qty: q, status: r.status });
  }
  const reserved = list.reduce((s, x) => s + x.qty, 0);
  return { stock, reserved, free: stock == null ? null : Math.max(0, stock - reserved), list, hasTerm: !!tm };
}
const isOver = it => { const a = availability(it); return a.free != null && (cart[key(it)] || 0) > a.free; };

function availHTML(it) {
  const a = availability(it), q = cart[key(it)] || 0, u = esc(itUnit(it));
  const rows = [];
  if (a.stock != null) {
    if (!a.hasTerm) rows.push(`<span>${t("inStock", { n: a.stock, u })}</span>`);
    else {
      const cls = a.free === 0 ? "bad" : a.free < a.stock ? "warn" : "ok";
      rows.push(`<span class="${cls}">${t("freeIn", { free: a.free, stock: a.stock, u })}</span>`);
    }
  }
  if (a.list.length) rows.push(`<span class="resv">${t("reserved")} ${a.list.map(r =>
    `${r.qty} ${u} – ${esc(r.event)}${r.status === "wstepna" ? t("prelim") : ""}`).join("; ")}</span>`);
  if (a.free != null && q > a.free) rows.push(`<span class="bad">${t("tooMany", { q, free: a.free })}</span>`);
  return `<div class="avail">${rows.join("")}</div>`;
}
const count = () => ITEMS.reduce((s, it) => s + (cart[key(it)] || 0), 0);

/* ---------- render ---------- */
function renderFilters() {
  const chips = [["", t("all")], ...CATS.map(c => [c, itCat(ITEMS.find(i => i.cat === c))])];
  $("filters").innerHTML = chips.map(([c, label]) =>
    `<button class="chip" type="button" aria-pressed="${c === filter}" data-cat="${esc(c)}">${esc(label)}</button>`).join("");
}
function cardHTML(it) {
  const q = cart[key(it)] || 0, over = isOver(it), name = esc(itName(it));
  return `<article class="card${q ? " in" : ""}${over ? " over" : ""}${it.wide ? " wide" : ""}" data-id="${esc(key(it))}">
    <div class="ill${it.img ? " photo" : ""}">${pic({ ...it, name: itName(it) })}<span class="code">${esc(it.kod)}</span>${q ? `<span class="badge">× ${q}</span>` : ""}</div>
    <div class="card-body">
      <h3>${name}</h3><div class="dim">${esc(itDim(it))}</div>
      ${availHTML(it)}
      <div class="row">
        <span class="unit">${esc(itUnit(it))}</span>
        <span class="qty"><button type="button" data-step="-1" aria-label="${esc(t("minus", { name: itName(it) }))}" ${q <= 0 ? "disabled" : ""}>−</button><input type="number" min="0" max="${maxQty(it)}" value="${q}" id="q-${esc(key(it))}" aria-label="${esc(t("qtyOf", { name: itName(it) }))}"><button type="button" data-step="1" aria-label="${esc(t("plus", { name: itName(it) }))}" ${q >= maxQty(it) ? "disabled" : ""}>+</button></span>
      </div>
    </div></article>`;
}
function renderGrid() {
  if (!ITEMS.length) { $("grid").innerHTML = `<p class="loading">${t("empty")}</p>`; return; }
  const list = ITEMS.filter(i => !filter || i.cat === filter);
  $("grid").innerHTML = list.length ? list.map(cardHTML).join("") : `<p class="loading">${t("emptyCat")}</p>`;
}
function refreshCard(id) {
  const el = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`); if (!el) return;
  const it = byId(id), q = cart[id] || 0;
  el.classList.toggle("in", q > 0); el.classList.toggle("over", isOver(it));
  const ill = el.querySelector(".ill"); const b = ill.querySelector(".badge");
  if (q) { if (b) b.textContent = "× " + q; else ill.insertAdjacentHTML("beforeend", `<span class="badge">× ${q}</span>`); } else if (b) b.remove();
  el.querySelector(".avail").outerHTML = availHTML(it);
  const inp = el.querySelector("input"); if (document.activeElement !== inp) inp.value = q;
  const [minus, plus] = el.querySelectorAll(".qty button");
  minus.disabled = q <= 0; plus.disabled = q >= maxQty(it);
}
function renderTerm() {
  $("d-from").value = dateFrom; $("d-to").value = dateTo;
  $("d-from").min = todayStr(); $("d-to").min = dateFrom || todayStr();
  const tm = term();
  $("termInfo").innerHTML = tm
    ? t("termSet", { range: fmtRange(tm.useFrom, tm.useTo), days: daysWord(tm.days), from: fmtD(tm.from), to: fmtD(tm.to), buf: bufferText() })
    : t("termHint", { buf: bufferText() });
  $("cartTerm").textContent = tm ? t("cartTerm", { range: fmtRange(tm.useFrom, tm.useTo), days: daysWord(tm.days) }) : t("noTerm");
  $("cartRes").textContent = tm ? t("cartRes", { range: fmtRange(tm.from, tm.to) }) : "";
  $("goTerm").textContent = tm ? t("change") : t("choose");
  renderPlan();
}
function renderPlan() {
  $("plan").hidden = RES.length === 0;
  $("planCount").textContent = `(${RES.length})`;
  const tm = term();
  $("planList").innerHTML = RES.map(r => {
    const own = r._id === sentId;
    const hit = !own && tm && overlaps(r.resFrom, r.resTo, tm.from, tm.to);
    const its = (r.items || []).map(x => { const it = byId(x.id); return it ? `${x.qty}× ${esc(itName(it))}` : null; }).filter(Boolean).join(", ");
    const st = r.status === "wstepna" ? t("resWstepna") : r.status === "potwierdzona" ? t("resPotwierdzona") : esc(r.status);
    return `<li class="${hit ? "hit" : ""}">
      <div class="p-head"><span class="p-date">${fmtRange(r.dateFrom, r.dateTo)}</span><b>${esc(r.event)}</b><span class="pill ${esc(r.status)}">${st}</span>${hit ? `<span class="pill wstepna">${t("overlaps")}</span>` : ""}${own ? `<span class="pill">${t("yourRequest")}</span>` : ""}</div>
      <div class="p-items">${its || "—"}</div></li>`;
  }).join("");
}
function renderCart() {
  const chosen = ITEMS.filter(i => cart[key(i)] > 0), n = count();
  $("countLbl").textContent = countWord(n);
  $("mCount").textContent = countWord(n);
  let thumbs = "";
  for (const it of chosen) { const k = Math.min(cart[key(it)], (it.unit || "szt.") === "szt." ? 12 : 1); for (let i = 0; i < k; i++) thumbs += pic(it); }
  $("stand").innerHTML = thumbs || `<span class="empty">${t("nothing")}</span>`;
  $("lines").innerHTML = chosen.map(it => {
    const a = availability(it), q = cart[key(it)];
    return `<li>
      <div class="nm">${esc(itName(it))}<span>${esc(it.kod)} · ${esc(itDim(it))}</span></div>
      <div class="val">${q} ${esc(itUnit(it))}</div>
      ${a.free != null && q > a.free ? `<span class="warnmini">${t("freeOnly", { free: a.free, u: esc(itUnit(it)) })}</span>` : ""}
      <button class="rm" type="button" data-rm="${esc(key(it))}">${t("remove")}</button></li>`;
  }).join("");
  const overs = chosen.filter(isOver).length;
  $("cartWarn").hidden = overs === 0;
  $("cartWarn").textContent = overs === 1 ? t("overWarn1") : overs ? t("overWarnN", { n: overs }) : "";
  $("clearAll").hidden = chosen.length === 0;
  $("sendBtn").disabled = n === 0;
  save();
}
function setQty(id, q) {
  const it = byId(id); if (!it) return;
  q = Math.max(0, Math.min(maxQty(it), Math.round(Number(q) || 0)));
  if (q) cart[id] = q; else delete cart[id];
  refreshCard(id); renderCart();
}
function renderLang() {
  setDateLocale(locale());
  applyStatic();
  document.title = t("title");
  document.querySelectorAll(".langs button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === getLang())));
}
function rerenderAll() { renderLang(); renderFilters(); renderTerm(); renderGrid(); renderCart(); }

/* ---------- zdarzenia ---------- */
document.querySelector(".langs").addEventListener("click", e => {
  const b = e.target.closest("[data-lang]"); if (!b || b.dataset.lang === getLang()) return;
  setLang(b.dataset.lang); rerenderAll();
});
$("filters").addEventListener("click", e => { const b = e.target.closest("[data-cat]"); if (!b) return; filter = b.dataset.cat; renderFilters(); renderGrid(); });
$("grid").addEventListener("click", e => {
  const b = e.target.closest("[data-step]"); if (!b) return;
  const id = b.closest(".card").dataset.id; setQty(id, (cart[id] || 0) + Number(b.dataset.step));
});
$("grid").addEventListener("change", e => { if (e.target.matches("input")) setQty(e.target.closest(".card").dataset.id, e.target.value); });
$("lines").addEventListener("click", e => { const b = e.target.closest("[data-rm]"); if (b) setQty(b.dataset.rm, 0); });
$("d-from").addEventListener("change", e => {
  dateFrom = e.target.value; sentId = "";
  if (dateTo && dateTo < dateFrom) dateTo = "";
  renderTerm(); renderGrid(); renderCart();
});
$("d-to").addEventListener("change", e => { dateTo = e.target.value; sentId = ""; if (dateTo && dateFrom && dateTo < dateFrom) dateTo = ""; renderTerm(); renderGrid(); renderCart(); });
$("goTerm").addEventListener("click", () => {
  $("panel").classList.remove("open");
  const s = $("term"); s.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  s.classList.add("flash"); setTimeout(() => s.classList.remove("flash"), 1200); $("d-from").focus({ preventScroll: true });
});
$("clearAll").addEventListener("click", () => { cart = {}; sentId = ""; renderGrid(); renderCart(); });
$("openPanel").addEventListener("click", () => $("panel").classList.add("open"));
$("closePanel").addEventListener("click", () => $("panel").classList.remove("open"));

/* ---------- zapytanie (treść maila zawsze po polsku, dla zespołu) ---------- */
const val = id => $(id).value.trim();
function buildMail() {
  const tm = term();
  setDateLocale("pl-PL");
  const lines = ITEMS.filter(i => cart[key(i)] > 0).map(it => {
    const a = availability(it), q = cart[key(it)];
    const warn = a.free != null && q > a.free ? `  [UWAGA: w terminie wolnych ${a.free} z ${a.stock}]` : "";
    return `- [${it.kod}] ${it.name} (${it.dim}) — ${q} ${it.unit || "szt."}${warn}`;
  }).join("\n");
  const body = `Nowe zapytanie o stoisko z katalogu.
Język klienta: ${getLang() === "en" ? "angielski (odpowiedz po angielsku)" : "polski"}

TERMIN
Wydarzenie: ${fmtRange(tm.useFrom, tm.useTo)} (${tm.days} ${tm.days === 1 ? "dzień" : "dni"})
Rezerwacja z transportem, montażem i demontażem: ${fmtRange(tm.from, tm.to)}

DANE KONTAKTOWE
Imię i nazwisko: ${val("f-name")}
Firma: ${val("f-company") || "—"}
E-mail: ${val("f-email")}
Telefon: ${val("f-phone") || "—"}
Wydarzenie: ${val("f-event") || "—"}
Wymiary stoiska: ${val("f-size") || "—"}

WYBRANE ELEMENTY
${lines}

UWAGI
${val("f-notes") || "—"}

Kosztorys tego zapytania jest w panelu administratora, w zakładce Zapytania.`;
  const subject = `Zapytanie o stoisko ${fmtRange(tm.useFrom, tm.useTo)}${val("f-event") ? " – " + val("f-event") : ""} – ${val("f-name")}${getLang() === "en" ? " [EN]" : ""}`;
  setDateLocale(locale());
  return { body, subject };
}

/** Zapis zapytania i wstępnej rezerwacji jednym ruchem */
async function saveToDb(body, subject) {
  const fb = await getFb(); if (!fb) return false;
  const { fs, db } = fb; const tm = term();
  const items = ITEMS.filter(i => cart[key(i)] > 0).map(it => ({ id: key(it), kod: String(it.kod), name: String(it.name), qty: cart[key(it)] }));
  const dates = { dateFrom: tm.useFrom, dateTo: tm.useTo, resFrom: tm.from, resTo: tm.to };
  const ref = fs.doc(fs.collection(db, "zapytania"));
  const batch = fs.writeBatch(db);
  batch.set(ref, {
    created: fs.serverTimestamp(), status: "nowe", subject, lang: getLang(),
    name: val("f-name"), company: val("f-company"), email: val("f-email"), phone: val("f-phone"),
    event: val("f-event"), size: val("f-size"), notes: val("f-notes"),
    days: tm.days, items, body, ...dates,
  });
  batch.set(fs.doc(db, "rezerwacje", ref.id), {
    created: fs.serverTimestamp(), status: "wstepna",
    event: (val("f-event") || val("f-company") || "Wydarzenie").slice(0, 190),
    items: items.map(i => ({ id: i.id, qty: i.qty })), ...dates,
  });
  await batch.commit();
  sentId = ref.id; save();
  return true;
}
async function sendMail(body, subject) {
  if (!CFG.WEB3FORMS_KEY) return false;
  const r = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: CFG.WEB3FORMS_KEY, subject, from_name: `Katalog stoisk – ${val("f-name")}`,
      email: val("f-email"), message: body, botcheck: $("f-botcheck").checked,
    }),
  });
  const j = await r.json().catch(() => ({}));
  return !!j.success;
}

function showFallback(body, subject, note) {
  $("mailText").textContent = body;
  $("toAddr").textContent = CFG.FIRMA_EMAIL;
  $("sheetNote").textContent = note;
  $("mailtoBtn").href = `mailto:${CFG.FIRMA_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  $("toast").textContent = "";
  $("sheet").hidden = false; $("copyBtn").focus();
}

$("sendBtn").addEventListener("click", async () => {
  const err = $("err"); const name = val("f-name"), mail = val("f-email");
  const fail = (msg, focusEl) => { err.textContent = msg; err.hidden = false; if (focusEl) focusEl.focus(); };
  if (!term()) { fail(t("errTerm")); $("goTerm").click(); return; }
  if (dateFrom < todayStr()) { fail(t("errPast")); $("goTerm").click(); return; }
  if (!name) return fail(t("errName"), $("f-name"));
  if (!/^\S+@\S+\.\S+$/.test(mail)) return fail(t("errEmail"), $("f-email"));
  err.hidden = true;
  const { body, subject } = buildMail();

  if (!CONFIGURED && !CFG.WEB3FORMS_KEY) { showFallback(body, subject, t("fbDemo")); return; }
  const btn = $("sendBtn"); btn.disabled = true; btn.classList.add("busy"); btn.textContent = t("sending");
  let saved = false, mailed = false;
  try { saved = await saveToDb(body, subject); } catch (e) { console.warn("Zapis w bazie nieudany", e); }
  try { mailed = await sendMail(body, subject); } catch (e) { console.warn("Wysyłka maila nieudana", e); }
  btn.classList.remove("busy"); btn.textContent = t("send"); btn.disabled = count() === 0;

  if (mailed || saved) {
    const tm = term();
    $("okText").textContent = t("okText", { from: fmtD(tm.from), to: fmtD(tm.to), mail });
    $("okSheet").hidden = false; $("okNew").focus();
    if (saved) { try { RES = await loadReservations(); } catch (e) {} }
  } else {
    showFallback(body, subject, t("fbNote"));
  }
});
$("okNew").addEventListener("click", () => { cart = {}; dateFrom = ""; dateTo = ""; sentId = ""; $("client").reset(); $("okSheet").hidden = true; rerenderAll(); });
$("okClose").addEventListener("click", () => { $("okSheet").hidden = true; rerenderAll(); });

$("copyBtn").addEventListener("click", () => {
  const txt = $("mailText").textContent;
  const fallback = () => { const r = document.createRange(); r.selectNodeContents($("mailText")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); $("toast").textContent = t("selected"); };
  try { navigator.clipboard.writeText(txt).then(() => { $("toast").textContent = t("copied", { mail: CFG.FIRMA_EMAIL }); }, fallback); } catch (e) { fallback(); }
});
$("closeSheet").addEventListener("click", () => $("sheet").hidden = true);
for (const id of ["sheet", "okSheet"]) $(id).addEventListener("click", e => { if (e.target.id === id) $(id).hidden = true; });
document.addEventListener("keydown", e => { if (e.key === "Escape") { $("sheet").hidden = true; $("okSheet").hidden = true; } });

/* ---------- start ---------- */
(async () => {
  renderLang();
  $("demoBar").hidden = CONFIGURED;
  try {
    [ITEMS, SET] = await Promise.all([loadItems(), loadSettings()]);
  } catch (e) {
    console.error(e);
    $("grid").innerHTML = `<p class="loading">${t("loadFail")}</p>`;
    return;
  }
  try { RES = await loadReservations(); } catch (e) { console.warn("Nie udało się wczytać rezerwacji", e); RES = []; }
  CATS = [...new Set(ITEMS.map(i => i.cat).filter(Boolean))];
  for (const k of Object.keys(cart)) { const it = byId(k); if (!it) delete cart[k]; else if (hasStock(it) && cart[k] > it.stock) cart[k] = it.stock; }
  if (dateFrom && dateFrom < todayStr()) { dateFrom = ""; dateTo = ""; }   // stary termin z poprzedniej wizyty
  rerenderAll();
})();
