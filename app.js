/* Katalog dla klientów: wybór elementów, termin, dostępność, kosztorys, wysyłka zapytania */
import {
  CONFIGURED, CFG_ as CFG, getFb, loadItems, loadSettings, loadReservations, zl, esc, plural, pic,
  todayStr, addDays, daysBetween, fmtD, fmtRange, overlaps, isDate, RES_STATUS, hasStock,
} from "./common.js";

const $ = id => document.getElementById(id);
let ITEMS = [], SET = {}, CATS = [], RES = [];
let cart = {}, dateFrom = "", dateTo = "", filter = "Wszystkie", gross = false;
let sentId = "";   // rezerwacja z własnego, właśnie wysłanego zapytania: nie liczymy jej jako konfliktu

try { const s = JSON.parse(localStorage.getItem("katalog-stoisko-v3") || "{}"); cart = s.cart || {}; dateFrom = s.dateFrom || ""; dateTo = s.dateTo || ""; gross = !!s.gross; sentId = s.sentId || ""; } catch (e) {}
const save = () => { try { localStorage.setItem("katalog-stoisko-v3", JSON.stringify({ cart, dateFrom, dateTo, gross, sentId })); } catch (e) {} };

const key = it => it._id;
const show = n => gross ? n * (1 + SET.vat) : n;
const tag = () => gross ? "brutto" : "netto";
const unitOf = it => it.unit || "szt.";
const byId = id => ITEMS.find(i => key(i) === id);

/* ---------- termin ---------- */
/** Dni użycia + dni rezerwacji (z zapasem na transport, montaż i demontaż) albo null */
function term() {
  if (!isDate(dateFrom)) return null;
  const useTo = isDate(dateTo) && dateTo >= dateFrom ? dateTo : dateFrom;
  return { useFrom: dateFrom, useTo, days: daysBetween(dateFrom, useTo) + 1,
    from: addDays(dateFrom, -SET.zapasPrzed), to: addDays(useTo, SET.zapasPo) };
}
const bufferText = () => {
  const p = SET.zapasPrzed, a = SET.zapasPo;
  const d = n => n === 1 ? "1 dzień" : `${n} dni`;
  return p === a ? `${d(p)} przed i po` : `${d(p)} przed, ${d(a)} po`;
};

/* ---------- dostępność ---------- */
/** Rezerwacje innych wydarzeń nachodzące na wybrany termin, dla jednej pozycji */
function availability(it) {
  const t = term(); const stock = hasStock(it) ? it.stock : null;
  const list = [];
  if (t) for (const r of RES) {
    if (r._id === sentId) continue;
    if (!overlaps(r.resFrom, r.resTo, t.from, t.to)) continue;
    const q = (r.items || []).filter(x => x.id === key(it)).reduce((s, x) => s + (Number(x.qty) || 0), 0);
    if (q) list.push({ event: r.event, qty: q, status: r.status, dateFrom: r.dateFrom, dateTo: r.dateTo });
  }
  const reserved = list.reduce((s, x) => s + x.qty, 0);
  return { stock, reserved, free: stock == null ? null : Math.max(0, stock - reserved), list, hasTerm: !!t };
}
const isOver = it => { const a = availability(it); return a.free != null && (cart[key(it)] || 0) > a.free; };

function availHTML(it) {
  const a = availability(it), q = cart[key(it)] || 0, u = esc(unitOf(it));
  const rows = [];
  if (a.stock != null) {
    if (!a.hasTerm) rows.push(`<span>Na stanie: <b>${a.stock}</b> ${u}</span>`);
    else {
      const cls = a.free === 0 ? "bad" : a.free < a.stock ? "warn" : "ok";
      rows.push(`<span class="${cls}">Wolne w tym terminie: <b>${a.free}</b> z ${a.stock} ${u}</span>`);
    }
  }
  if (a.list.length) {
    rows.push(`<span class="resv">Zarezerwowane: ${a.list.map(r =>
      `${r.qty} ${u} – ${esc(r.event)}${r.status === "wstepna" ? " (wstępnie)" : ""}`).join("; ")}</span>`);
  }
  if (a.free != null && q > a.free) rows.push(`<span class="bad">Wybrano więcej niż wolne w tym terminie (${q} z ${a.free}).</span>`);
  return `<div class="avail">${rows.join("")}</div>`;
}

function totals() {
  let items = 0, count = 0;
  for (const it of ITEMS) { const q = cart[key(it)] || 0; items += q * it.price; count += q; }
  const t = term(); const days = t ? t.days : 1;
  const extra = items * SET.doplataDzien * Math.max(0, days - SET.dniWCenie);
  const net = items + extra, vat = net * SET.vat;
  return { items, extra, net, vat, gross: net + vat, count, days };
}

/* ---------- render ---------- */
function renderFilters() {
  $("filters").innerHTML = ["Wszystkie", ...CATS].map(c =>
    `<button class="chip" type="button" aria-pressed="${c === filter}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
}
const maxQty = it => hasStock(it) ? it.stock : 999;
function cardHTML(it) {
  const q = cart[key(it)] || 0, over = isOver(it);
  return `<article class="card${q ? " in" : ""}${over ? " over" : ""}${it.wide ? " wide" : ""}" data-id="${esc(key(it))}">
    <div class="ill${it.img ? " photo" : ""}">${pic(it)}<span class="code">${esc(it.kod)}</span>${q ? `<span class="badge">× ${q}</span>` : ""}</div>
    <div class="card-body">
      <h3>${esc(it.name)}</h3><div class="dim">${esc(it.dim)}</div>
      ${availHTML(it)}
      <div class="row">
        <div class="price">${zl(show(it.price))}<small>${tag()} / ${esc(unitOf(it))}</small></div>
        <span class="qty"><button type="button" data-step="-1" aria-label="Odejmij: ${esc(it.name)}" ${q <= 0 ? "disabled" : ""}>−</button><input type="number" min="0" max="${maxQty(it)}" value="${q}" id="q-${esc(key(it))}" aria-label="Liczba: ${esc(it.name)}"><button type="button" data-step="1" aria-label="Dodaj: ${esc(it.name)}" ${q >= maxQty(it) ? "disabled" : ""}>+</button></span>
      </div>
    </div></article>`;
}
function renderGrid() {
  const list = ITEMS.filter(i => filter === "Wszystkie" || i.cat === filter);
  $("grid").innerHTML = list.length ? list.map(cardHTML).join("") : `<p class="loading">Brak pozycji w tej kategorii.</p>`;
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
  const t = term();
  $("termInfo").innerHTML = t
    ? `Wydarzenie: <b>${fmtRange(t.useFrom, t.useTo)}</b> (${t.days} ${t.days === 1 ? "dzień" : "dni"}). Rezerwujemy elementy od <b>${fmtD(t.from)}</b> do <b>${fmtD(t.to)}</b>, z zapasem na transport, montaż i demontaż (${bufferText()}).`
    : `Wpisz dni, w których elementy będą używane. Pokażemy, ile sztuk jest wolnych w tym terminie. Do rezerwacji doliczamy ${bufferText()} na transport, montaż i demontaż.`;
  $("cartTerm").textContent = t ? `Wydarzenie: ${fmtRange(t.useFrom, t.useTo)} · ${t.days} ${t.days === 1 ? "dzień" : "dni"}` : "Termin nie jest wybrany";
  $("cartRes").textContent = t ? `Rezerwacja: ${fmtRange(t.from, t.to)}` : "";
  $("goTerm").textContent = t ? "Zmień" : "Wybierz";
  renderPlan();
}
function renderPlan() {
  $("plan").hidden = RES.length === 0;
  $("planCount").textContent = `(${RES.length})`;
  const t = term();
  $("planList").innerHTML = RES.map(r => {
    const own = r._id === sentId;
    const hit = !own && t && overlaps(r.resFrom, r.resTo, t.from, t.to);
    const its = (r.items || []).map(x => { const it = byId(x.id); return it ? `${x.qty}× ${esc(it.name)}` : null; }).filter(Boolean).join(", ");
    return `<li class="${hit ? "hit" : ""}">
      <div class="p-head"><span class="p-date">${fmtRange(r.dateFrom, r.dateTo)}</span><b>${esc(r.event)}</b><span class="pill ${esc(r.status)}">${RES_STATUS[r.status] || esc(r.status)}</span>${hit ? `<span class="pill wstepna">nachodzi na Twój termin</span>` : ""}${own ? `<span class="pill">Twoje zapytanie</span>` : ""}</div>
      <div class="p-items">${its || "—"}</div></li>`;
  }).join("");
}
function renderCart() {
  const chosen = ITEMS.filter(i => cart[key(i)] > 0);
  const t = totals();
  $("countLbl").textContent = `${t.count} ${plural(t.count)}`;
  $("mCount").textContent = `${t.count} ${plural(t.count)}`;
  $("mTotal").textContent = zl(gross ? t.gross : t.net) + " " + tag();
  let thumbs = "";
  for (const it of chosen) { const n = Math.min(cart[key(it)], unitOf(it) === "szt." ? 12 : 1); for (let k = 0; k < n; k++) thumbs += pic(it); }
  $("stand").innerHTML = thumbs || `<span class="empty">Nic jeszcze nie wybrano. Dodaj elementy z katalogu.</span>`;
  $("lines").innerHTML = chosen.map(it => {
    const a = availability(it), q = cart[key(it)];
    return `<li>
      <div class="nm">${esc(it.name)}<span>${esc(it.kod)} · ${q} ${esc(unitOf(it))} × ${zl(show(it.price))} ${tag()}</span></div>
      <div class="val">${zl(show(q * it.price))}</div>
      ${a.free != null && q > a.free ? `<span class="warnmini">W tym terminie wolnych: ${a.free} ${esc(unitOf(it))}</span>` : ""}
      <button class="rm" type="button" data-rm="${esc(key(it))}">Usuń</button></li>`;
  }).join("");
  const overs = chosen.filter(isOver);
  $("cartWarn").hidden = overs.length === 0;
  $("cartWarn").textContent = overs.length ? `${overs.length === 1 ? "1 pozycja przekracza" : overs.length + " pozycje przekraczają"} liczbę wolnych sztuk w tym terminie. Możesz wysłać zapytanie, ale część elementów jest zarezerwowana na inne wydarzenie.` : "";
  $("clearAll").hidden = chosen.length === 0;
  $("lDays").textContent = `Dopłata za dni ponad ${SET.dniWCenie}`;
  $("sItems").textContent = zl(t.items); $("sDays").textContent = zl(t.extra);
  $("sNet").textContent = zl(t.net); $("sVat").textContent = zl(t.vat); $("sGross").textContent = zl(t.gross);
  $("sendBtn").disabled = t.count === 0;
  save();
}
function renderStatic() {
  const pct = Math.round(SET.doplataDzien * 100), vat = Math.round(SET.vat * 100);
  $("lVat").textContent = `VAT ${vat}%`;
  $("priceNote").textContent = `Ceny za wynajem na wydarzenie trwające do ${SET.dniWCenie} dni. Każdy kolejny dzień wydarzenia: +${pct}% ceny. Dni montażu i demontażu nie są doliczane.`;
  document.querySelectorAll(".toggle button").forEach(x => x.setAttribute("aria-pressed", String((x.dataset.vat === "gross") === gross)));
}
function setQty(id, q) {
  const it = byId(id); if (!it) return;
  q = Math.max(0, Math.min(maxQty(it), Math.round(Number(q) || 0)));
  if (q) cart[id] = q; else delete cart[id];
  refreshCard(id); renderCart();
}
function rerenderAll() { renderTerm(); renderGrid(); renderCart(); }

/* ---------- zdarzenia ---------- */
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
  rerenderAll();
});
$("d-to").addEventListener("change", e => { dateTo = e.target.value; sentId = ""; if (dateTo && dateFrom && dateTo < dateFrom) dateTo = ""; rerenderAll(); });
$("goTerm").addEventListener("click", () => {
  $("panel").classList.remove("open");
  const s = $("term"); s.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  s.classList.add("flash"); setTimeout(() => s.classList.remove("flash"), 1200); $("d-from").focus({ preventScroll: true });
});
document.querySelector(".toggle").addEventListener("click", e => {
  const b = e.target.closest("[data-vat]"); if (!b) return;
  gross = b.dataset.vat === "gross"; renderStatic(); renderGrid(); renderCart();
});
$("clearAll").addEventListener("click", () => { cart = {}; sentId = ""; renderGrid(); renderCart(); });
$("openPanel").addEventListener("click", () => $("panel").classList.add("open"));
$("closePanel").addEventListener("click", () => $("panel").classList.remove("open"));

/* ---------- zapytanie ---------- */
const val = id => $(id).value.trim();
function buildMail() {
  const t = totals(), tm = term();
  const lines = ITEMS.filter(i => cart[key(i)] > 0).map(it => {
    const a = availability(it), q = cart[key(it)];
    const warn = a.free != null && q > a.free ? `  [UWAGA: w terminie wolnych ${a.free} z ${a.stock}]` : "";
    return `- [${it.kod}] ${it.name} (${it.dim}) — ${q} ${unitOf(it)} × ${zl(it.price)} = ${zl(q * it.price)}${warn}`;
  }).join("\n");
  return `Dzień dobry,

proszę o przygotowanie wizualizacji i wyceny stoiska z poniższych elementów.

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

KOSZTORYS ORIENTACYJNY
Elementy netto: ${zl(t.items)}
Dopłata za dni ponad ${SET.dniWCenie}: ${zl(t.extra)}
Razem netto: ${zl(t.net)}
VAT ${Math.round(SET.vat * 100)}%: ${zl(t.vat)}
Razem brutto: ${zl(t.gross)}

UWAGI
${val("f-notes") || "—"}

Pozdrawiam,
${val("f-name")}`;
}

/** Zapis zapytania i wstępnej rezerwacji jednym ruchem */
async function saveToDb(body, subject) {
  const fb = await getFb(); if (!fb) return false;
  const { fs, db } = fb; const t = totals(), tm = term();
  const items = ITEMS.filter(i => cart[key(i)] > 0).map(it => ({ id: key(it), kod: String(it.kod), name: String(it.name), qty: cart[key(it)], price: Number(it.price) }));
  const dates = { dateFrom: tm.useFrom, dateTo: tm.useTo, resFrom: tm.from, resTo: tm.to };
  const ref = fs.doc(fs.collection(db, "zapytania"));
  const batch = fs.writeBatch(db);
  batch.set(ref, {
    created: fs.serverTimestamp(), status: "nowe", subject,
    name: val("f-name"), company: val("f-company"), email: val("f-email"), phone: val("f-phone"),
    event: val("f-event"), size: val("f-size"), notes: val("f-notes"),
    days: tm.days, items, net: Math.round(t.net * 100) / 100, gross: Math.round(t.gross * 100) / 100, body, ...dates,
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
  if (!term()) { fail("Wybierz termin wydarzenia, żebyśmy mogli zarezerwować elementy."); $("goTerm").click(); return; }
  if (dateFrom < todayStr()) { fail("Termin wydarzenia nie może być w przeszłości."); $("goTerm").click(); return; }
  if (!name) return fail("Wpisz imię i nazwisko, żebyśmy wiedzieli, do kogo odpisać.", $("f-name"));
  if (!/^\S+@\S+\.\S+$/.test(mail)) return fail("Wpisz poprawny adres e-mail, na który wyślemy wizualizację.", $("f-email"));
  err.hidden = true;
  const body = buildMail();
  const subject = `Zapytanie o stoisko ${fmtRange(term().useFrom, term().useTo)}${val("f-event") ? " – " + val("f-event") : ""} – ${name}`;

  if (!CONFIGURED && !CFG.WEB3FORMS_KEY) {
    showFallback(body, subject, "Tryb demo: automatyczna wysyłka nie jest jeszcze skonfigurowana. Tak będzie wyglądać treść zapytania.");
    return;
  }
  const btn = $("sendBtn"); btn.disabled = true; btn.classList.add("busy"); btn.textContent = "Wysyłam…";
  let saved = false, mailed = false;
  try { saved = await saveToDb(body, subject); } catch (e) { console.warn("Zapis w bazie nieudany", e); }
  try { mailed = await sendMail(body, subject); } catch (e) { console.warn("Wysyłka maila nieudana", e); }
  btn.classList.remove("busy"); btn.textContent = "Wyślij zapytanie"; btn.disabled = totals().count === 0;

  if (mailed || saved) {
    const tm = term();
    $("okText").textContent = `Elementy są wstępnie zarezerwowane od ${fmtD(tm.from)} do ${fmtD(tm.to)}. Przygotujemy wizualizację i odezwiemy się na adres ${mail}.`;
    $("okSheet").hidden = false; $("okNew").focus();
    if (saved) { try { RES = await loadReservations(); } catch (e) {} }
  } else {
    showFallback(body, subject, "Nie udało się wysłać zapytania automatycznie. Skopiuj treść i wyślij ją na nasz adres.");
  }
});
$("okNew").addEventListener("click", () => { cart = {}; dateFrom = ""; dateTo = ""; sentId = ""; $("client").reset(); $("okSheet").hidden = true; rerenderAll(); });
$("okClose").addEventListener("click", () => { $("okSheet").hidden = true; rerenderAll(); });

$("copyBtn").addEventListener("click", () => {
  const txt = $("mailText").textContent;
  const fallback = () => { const r = document.createRange(); r.selectNodeContents($("mailText")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); $("toast").textContent = "Treść zaznaczona. Skopiuj ją skrótem Ctrl+C (⌘C)."; };
  try { navigator.clipboard.writeText(txt).then(() => { $("toast").textContent = `Skopiowano. Wklej treść do maila na adres ${CFG.FIRMA_EMAIL}.`; }, fallback); } catch (e) { fallback(); }
});
$("closeSheet").addEventListener("click", () => $("sheet").hidden = true);
for (const id of ["sheet", "okSheet"]) $(id).addEventListener("click", e => { if (e.target.id === id) $(id).hidden = true; });
document.addEventListener("keydown", e => { if (e.key === "Escape") { $("sheet").hidden = true; $("okSheet").hidden = true; } });

/* ---------- start ---------- */
(async () => {
  $("demoBar").hidden = CONFIGURED;
  try {
    [ITEMS, SET] = await Promise.all([loadItems(), loadSettings()]);
  } catch (e) {
    console.error(e);
    $("grid").innerHTML = `<p class="loading">Nie udało się wczytać katalogu. Odśwież stronę za chwilę.</p>`;
    return;
  }
  try { RES = await loadReservations(); } catch (e) { console.warn("Nie udało się wczytać rezerwacji", e); RES = []; }
  CATS = [...new Set(ITEMS.map(i => i.cat).filter(Boolean))];
  for (const k of Object.keys(cart)) { const it = byId(k); if (!it) delete cart[k]; else if (hasStock(it) && cart[k] > it.stock) cart[k] = it.stock; }
  if (dateFrom && dateFrom < todayStr()) { dateFrom = ""; dateTo = ""; }   // stary termin z poprzedniej wizyty
  if (!ITEMS.length) { $("grid").innerHTML = `<p class="loading">Katalog jest pusty. Dodaj pozycje w panelu administratora.</p>`; }
  renderStatic(); renderFilters(); renderTerm(); if (ITEMS.length) renderGrid(); renderCart();
})();
