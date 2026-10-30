/* Panel administratora: logowanie, pozycje, zapytania, ustawienia */
import { CONFIGURED, getFb, getAuth, loadSettings, zl, esc, pic, ILL, byOrder, DEFAULT_SETTINGS, ORDER_STATUS, fmtRange, hasStock, RES_STATUS, todayStr, addDays, isDate } from "./common.js";

const $ = id => document.getElementById(id);
let fb = null, A = null;
let items = [], editing = null, edImg = "", unsubOrders = null, unsubRes = null;
let SETS = { ...DEFAULT_SETTINGS }, resList = [], resEditing = null;

/* ---------- start ---------- */
(async () => {
  if (!CONFIGURED) { $("notConfigured").hidden = false; return; }
  fb = await getFb(); A = await getAuth();
  A.am.onAuthStateChanged(A.auth, user => {
    $("login").hidden = !!user; $("app").hidden = !user; $("who").hidden = !user;
    $("noAccess").hidden = true;
    if (unsubOrders) { unsubOrders(); unsubOrders = null; }
    if (unsubRes) { unsubRes(); unsubRes = null; }
    if (user) { $("whoEmail").textContent = user.email; startApp(user); }
  });
})();

/* ---------- logowanie ---------- */
const AUTH_ERR = {
  "auth/invalid-credential": "Nieprawidłowy e-mail lub hasło.",
  "auth/wrong-password": "Nieprawidłowy e-mail lub hasło.",
  "auth/user-not-found": "Nieprawidłowy e-mail lub hasło.",
  "auth/too-many-requests": "Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.",
  "auth/invalid-email": "Wpisz poprawny adres e-mail.",
  "auth/unauthorized-domain": "Ta domena nie jest dodana w Firebase (Authentication → Ustawienia → Autoryzowane domeny).",
};
$("login").addEventListener("submit", async e => {
  e.preventDefault();
  const err = $("l-err"); err.hidden = true;
  try { await A.am.signInWithEmailAndPassword(A.auth, $("l-email").value.trim(), $("l-pass").value); }
  catch (x) { err.textContent = AUTH_ERR[x.code] || `Logowanie nieudane (${x.code}).`; err.hidden = false; }
});
$("l-reset").addEventListener("click", async () => {
  const err = $("l-err"); const mail = $("l-email").value.trim();
  if (!mail) { err.textContent = "Wpisz najpierw swój e-mail."; err.hidden = false; return; }
  try { await A.am.sendPasswordResetEmail(A.auth, mail); err.textContent = "Wysłaliśmy link do zmiany hasła na podany adres."; }
  catch (x) { err.textContent = AUTH_ERR[x.code] || `Nie udało się wysłać linku (${x.code}).`; }
  err.hidden = false;
});
$("logout").addEventListener("click", () => A.am.signOut(A.auth));

function denied(x) {
  if (x && x.code === "permission-denied") {
    $("noAccess").innerHTML = `To konto nie ma uprawnień administratora. Wpisz jego UID w pliku <code>firestore.rules</code> i opublikuj reguły w konsoli Firebase. UID: <code>${esc(A.auth.currentUser?.uid)}</code>`;
    $("noAccess").hidden = false; return true;
  }
  return false;
}

/* ---------- zakładki ---------- */
document.querySelector(".tabs").addEventListener("click", e => {
  const b = e.target.closest("[data-tab]"); if (!b) return;
  document.querySelectorAll(".tabs button").forEach(x => x.setAttribute("aria-selected", String(x === b)));
  for (const t of ["items", "orders", "res", "settings"]) $("tab-" + t).hidden = t !== b.dataset.tab;
});

async function startApp() {
  await reloadItems();
  watchOrders();
  watchRes();
  const s = await loadSettings(); SETS = s;
  $("s-days").value = s.dniWCenie; $("s-extra").value = Math.round(s.doplataDzien * 100); $("s-vat").value = Math.round(s.vat * 100);
  $("s-before").value = s.zapasPrzed; $("s-after").value = s.zapasPo;
}

/* ---------- pozycje ---------- */
async function reloadItems() {
  const snap = await fb.fs.getDocs(fb.fs.collection(fb.db, "pozycje"));
  items = snap.docs.map(d => ({ _id: d.id, ...d.data() })).sort(byOrder);
  renderItems();
}
function renderItems() {
  const q = $("search").value.trim().toLowerCase();
  const list = items.filter(i => !q || [i.kod, i.name, i.cat, i.dim].join(" ").toLowerCase().includes(q));
  $("cItems").textContent = items.length;
  $("seed").hidden = items.length > 0;
  $("catList").innerHTML = [...new Set(items.map(i => i.cat).filter(Boolean))].map(c => `<option value="${esc(c)}">`).join("");
  if (!items.length) { $("rows").innerHTML = `<tr><td colspan="8" class="muted">Katalog jest pusty. Dodaj pierwszą pozycję albo wczytaj przykładowy katalog.</td></tr>`; return; }
  if (!list.length) { $("rows").innerHTML = `<tr><td colspan="8" class="muted">Nic nie pasuje do wyszukiwania.</td></tr>`; return; }
  $("rows").innerHTML = list.map(it => {
    const idx = items.indexOf(it);
    return `<tr data-id="${esc(it._id)}" class="${it.active === false ? "off" : ""}">
      <td><div class="thumb${it.img ? " photo" : ""}">${pic(it)}</div></td>
      <td class="kod">${esc(it.kod)}</td>
      <td>${esc(it.name)}<span class="sub">${esc(it.cat)} · ${esc(it.dim)}</span></td>
      <td class="num">${zl(it.price)}<span class="sub">/ ${esc(it.unit || "szt.")}</span></td>
      <td class="num">${hasStock(it) ? it.stock : `<span class="sub">bez limitu</span>`}</td>
      <td><label class="switch" title="Widoczna w katalogu"><input type="checkbox" data-act="active" ${it.active !== false ? "checked" : ""} aria-label="Widoczna: ${esc(it.name)}"><span></span></label></td>
      <td><span class="mv"><button type="button" data-act="up" ${idx === 0 || q ? "disabled" : ""} aria-label="Przesuń wyżej">↑</button><button type="button" data-act="down" ${idx === items.length - 1 || q ? "disabled" : ""} aria-label="Przesuń niżej">↓</button></span></td>
      <td><button class="btn ghost sm" type="button" data-act="edit">Edytuj</button></td></tr>`;
  }).join("");
}
$("search").addEventListener("input", renderItems);

$("rows").addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const id = b.closest("tr").dataset.id; const it = items.find(i => i._id === id);
  const act = b.dataset.act;
  if (act === "edit") return openEditor(it);
  if (act === "up" || act === "down") {
    const i = items.indexOf(it), j = act === "up" ? i - 1 : i + 1; const other = items[j]; if (!other) return;
    const oa = it.order ?? i * 10, ob = other.order ?? j * 10;
    const swapA = oa === ob ? ob + (act === "up" ? -1 : 1) : ob;
    try {
      const batch = fb.fs.writeBatch(fb.db);
      batch.update(fb.fs.doc(fb.db, "pozycje", it._id), { order: swapA });
      batch.update(fb.fs.doc(fb.db, "pozycje", other._id), { order: oa });
      await batch.commit(); it.order = swapA; other.order = oa; items.sort(byOrder); renderItems();
    } catch (x) { if (!denied(x)) alertBar(`Nie udało się zmienić kolejności (${x.code || x.message}).`); }
  }
});
$("rows").addEventListener("change", async e => {
  const b = e.target.closest("[data-act='active']"); if (!b) return;
  const id = b.closest("tr").dataset.id; const it = items.find(i => i._id === id);
  try { await fb.fs.updateDoc(fb.fs.doc(fb.db, "pozycje", id), { active: b.checked }); it.active = b.checked; renderItems(); }
  catch (x) { b.checked = !b.checked; if (!denied(x)) alertBar(`Nie udało się zapisać (${x.code || x.message}).`); }
});
function alertBar(text) { $("noAccess").textContent = text; $("noAccess").hidden = false; }

$("seed").addEventListener("click", async () => {
  const btn = $("seed"); btn.disabled = true; btn.textContent = "Wczytuję…";
  try {
    const { SEED_ITEMS } = await import("./seed.js");
    const batch = fb.fs.writeBatch(fb.db);
    for (const it of SEED_ITEMS) batch.set(fb.fs.doc(fb.fs.collection(fb.db, "pozycje")), it);
    batch.set(fb.fs.doc(fb.db, "ustawienia", "ogolne"), DEFAULT_SETTINGS, { merge: true });
    await batch.commit(); await reloadItems();
  } catch (x) { if (!denied(x)) alertBar(`Nie udało się wczytać katalogu (${x.code || x.message}).`); }
  btn.disabled = false; btn.textContent = "Wczytaj przykładowy katalog";
});

/* ---------- edytor ---------- */
$("edIll").innerHTML = `<option value="">— brak —</option>` + Object.keys(ILL).map(k => `<option value="${k}">${k}</option>`).join("");
function previewImg() {
  const it = { img: edImg, ill: $("edIll").value, name: $("edName").value };
  const box = $("edPreview"); box.className = "ill" + (edImg ? " photo" : ""); box.innerHTML = pic(it);
  $("edImgInfo").textContent = edImg.startsWith("data:") ? `Zdjęcie zapisane w bazie (${Math.round(edImg.length * 0.75 / 1024)} KB).` : edImg ? "Zdjęcie z adresu URL." : "";
}
function openEditor(it) {
  editing = it || null;
  $("edTitle").textContent = it ? "Edytuj pozycję" : "Nowa pozycja";
  $("edKod").value = it?.kod || ""; $("edCat").value = it?.cat || ""; $("edName").value = it?.name || "";
  $("edDim").value = it?.dim || ""; $("edPrice").value = it?.price ?? ""; $("edUnit").value = it?.unit || "szt.";
  $("edStock").value = it && hasStock(it) ? it.stock : "";
  $("edActive").checked = it ? it.active !== false : true; $("edWide").checked = !!it?.wide;
  $("edIll").value = it?.ill || "";
  edImg = it?.img || ""; $("edUrl").value = edImg.startsWith("data:") ? "" : edImg; $("edFile").value = "";
  $("edDelete").hidden = !it; $("edDelete").classList.remove("armed"); $("edDelete").textContent = "Usuń pozycję";
  $("edErr").hidden = true;
  previewImg(); $("editor").hidden = false; $("edKod").focus();
}
$("addItem").addEventListener("click", () => openEditor(null));
$("edCancel").addEventListener("click", () => $("editor").hidden = true);
$("editor").addEventListener("click", e => { if (e.target.id === "editor") $("editor").hidden = true; });
document.addEventListener("keydown", e => { if (e.key === "Escape") $("editor").hidden = true; });
$("edIll").addEventListener("change", previewImg);
$("edName").addEventListener("input", () => { if (!edImg) previewImg(); });
$("edUrl").addEventListener("change", () => { edImg = $("edUrl").value.trim(); previewImg(); });
$("edNoImg").addEventListener("click", () => { edImg = ""; $("edUrl").value = ""; $("edFile").value = ""; previewImg(); });

/** Zmniejsza zdjęcie do max 1100 px i kompresuje do JPEG mieszczącego się w dokumencie bazy */
async function compress(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    const scale = Math.min(1, 1100 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    let out = "";
    for (const q of [0.82, 0.72, 0.62, 0.5, 0.4]) { out = c.toDataURL("image/jpeg", q); if (out.length < 600000) break; }
    return out;
  } finally { URL.revokeObjectURL(url); }
}
$("edFile").addEventListener("change", async () => {
  const f = $("edFile").files[0]; if (!f) return;
  $("edImgInfo").textContent = "Przygotowuję zdjęcie…";
  try { edImg = await compress(f); $("edUrl").value = ""; previewImg(); }
  catch (x) { $("edImgInfo").textContent = "Nie udało się odczytać pliku. Użyj zdjęcia JPG lub PNG."; }
});

$("edForm").addEventListener("submit", async e => {
  e.preventDefault();
  const err = $("edErr"); err.hidden = true;
  const data = {
    kod: $("edKod").value.trim(), cat: $("edCat").value.trim(), name: $("edName").value.trim(),
    dim: $("edDim").value.trim(), price: Math.round(Number($("edPrice").value) * 100) / 100,
    unit: $("edUnit").value.trim() || "szt.", active: $("edActive").checked, wide: $("edWide").checked,
    ill: $("edIll").value, img: edImg,
    stock: $("edStock").value === "" ? null : Math.max(0, Math.round(Number($("edStock").value) || 0)),
  };
  if (!data.kod || !data.cat || !data.name || !(Number($("edPrice").value) >= 0) || $("edPrice").value === "") {
    err.textContent = "Uzupełnij kod, kategorię, nazwę i cenę."; err.hidden = false; return;
  }
  if (data.img.length > 900000) { err.textContent = "Zdjęcie jest za duże. Wybierz mniejszy plik."; err.hidden = false; return; }
  const btn = $("edSave"); btn.disabled = true; btn.textContent = "Zapisuję…";
  try {
    if (editing) {
      await fb.fs.updateDoc(fb.fs.doc(fb.db, "pozycje", editing._id), data);
    } else {
      data.order = items.length ? Math.max(...items.map(i => i.order ?? 0)) + 10 : 10;
      await fb.fs.addDoc(fb.fs.collection(fb.db, "pozycje"), data);
    }
    $("editor").hidden = true; await reloadItems();
  } catch (x) {
    if (denied(x)) $("editor").hidden = true;
    else { err.textContent = `Nie udało się zapisać (${x.code || x.message}).`; err.hidden = false; }
  }
  btn.disabled = false; btn.textContent = "Zapisz";
});
$("edDelete").addEventListener("click", async () => {
  const b = $("edDelete");
  if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "Kliknij ponownie, aby usunąć na stałe"; return; }
  try { await fb.fs.deleteDoc(fb.fs.doc(fb.db, "pozycje", editing._id)); $("editor").hidden = true; await reloadItems(); }
  catch (x) { if (!denied(x)) { $("edErr").textContent = `Nie udało się usunąć (${x.code || x.message}).`; $("edErr").hidden = false; } }
});

/* ---------- zapytania ---------- */
let orders = [];
function watchOrders() {
  const q = fb.fs.query(fb.fs.collection(fb.db, "zapytania"), fb.fs.orderBy("created", "desc"), fb.fs.limit(300));
  unsubOrders = fb.fs.onSnapshot(q, snap => {
    orders = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
    renderOrders(); renderRes();
  }, x => { denied(x); $("orders").innerHTML = `<p class="muted">Nie udało się wczytać zapytań.</p>`; });
}
const fmtDate = ts => ts?.toDate ? ts.toDate().toLocaleString("pl-PL", { dateStyle: "medium", timeStyle: "short" }) : "przed chwilą";
function renderOrders() {
  const nNew = orders.filter(o => o.status === "nowe").length;
  $("cOrders").textContent = nNew; $("cOrders").hidden = nNew === 0;
  const f = $("oFilter").value;
  const list = orders.filter(o => !f || o.status === f);
  if (!list.length) { $("orders").innerHTML = `<p class="muted">${orders.length ? "Brak zapytań o tym statusie." : "Nie ma jeszcze żadnych zapytań. Pojawią się tu, gdy klient wyśle kosztorys."}</p>`; return; }
  $("orders").innerHTML = list.map(o => {
    const its = (o.items || []).map(i => `${i.qty}× ${i.name}`).join(", ");
    const subj = encodeURIComponent("Re: " + (o.subject || "Zapytanie o stoisko"));
    const term = o.dateFrom ? `<div class="o-term"><b>${fmtRange(o.dateFrom, o.dateTo)}</b> · rezerwacja ${fmtRange(o.resFrom, o.resTo)}</div>` : "";
    return `<article class="order st-${esc(o.status)}" data-id="${esc(o._id)}">
      <div class="o-head">
        <div class="o-who">${esc(o.event || o.name)} <span>${esc(o.event ? o.name : "")}${o.company ? " · " + esc(o.company) : ""}</span></div>
        <div class="o-sum">${zl(o.net)} netto</div>
      </div>
      ${term}
      <div class="o-meta">wysłano ${esc(fmtDate(o.created))} · ${esc(o.email)}${o.phone ? " · " + esc(o.phone) : ""}</div>
      <div class="o-items">${esc(its)}</div>
      <div class="o-actions">
        ${o.status === "nowe" ? `<button class="btn sm" type="button" data-act="accept">Akceptuj rezerwację</button>` : ""}
        <select data-act="status" aria-label="Status">${Object.entries(ORDER_STATUS).map(([v, l]) => `<option value="${v}" ${v === o.status ? "selected" : ""}>${l}</option>`).join("")}</select>
        <button class="btn ghost sm" type="button" data-act="toggle">Pokaż treść</button>
        <a href="mailto:${esc(o.email)}?subject=${subj}">Odpowiedz</a>
        <button class="btn danger sm" type="button" data-act="del">Usuń</button>
      </div>
      <pre class="mail" hidden>${esc(o.body)}</pre>
    </article>`;
  }).join("");
}

/** Zmienia status zapytania i odpowiednio jego rezerwację:
    nowe → wstępna, zaakceptowane/zakończone → potwierdzona, odrzucone → rezerwacja usunięta */
async function setStatus(o, status) {
  const { fs, db } = fb;
  const batch = fs.writeBatch(db);
  batch.update(fs.doc(db, "zapytania", o._id), { status });
  const rref = fs.doc(db, "rezerwacje", o._id);
  const existing = status === "odrzucone" ? null : await fs.getDoc(rref);
  if (status === "odrzucone") batch.delete(rref);
  else if (existing && existing.exists()) batch.update(rref, { status: status === "nowe" ? "wstepna" : "potwierdzona" });
  else if (o.resFrom) batch.set(rref, {
    status: status === "nowe" ? "wstepna" : "potwierdzona",
    event: (o.event || o.company || o.name || "Wydarzenie").slice(0, 190),
    dateFrom: o.dateFrom, dateTo: o.dateTo, resFrom: o.resFrom, resTo: o.resTo,
    items: (o.items || []).filter(i => i.id).map(i => ({ id: i.id, qty: i.qty })),
    created: o.created || fs.serverTimestamp(),
  });
  await batch.commit();
}
$("oFilter").addEventListener("change", renderOrders);
$("orders").addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const card = b.closest(".order"); const id = card.dataset.id; const o = orders.find(x => x._id === id);
  if (b.dataset.act === "toggle") { const p = card.querySelector("pre"); p.hidden = !p.hidden; b.textContent = p.hidden ? "Pokaż treść" : "Ukryj treść"; }
  if (b.dataset.act === "accept") {
    b.disabled = true;
    try { await setStatus(o, "zaakceptowane"); } catch (x) { b.disabled = false; if (!denied(x)) alertBar(`Nie udało się zaakceptować (${x.code || x.message}).`); }
  }
  if (b.dataset.act === "del") {
    if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "Na pewno? Rezerwacja też zniknie"; return; }
    try {
      const batch = fb.fs.writeBatch(fb.db);
      batch.delete(fb.fs.doc(fb.db, "zapytania", id)); batch.delete(fb.fs.doc(fb.db, "rezerwacje", id));
      await batch.commit();
    } catch (x) { if (!denied(x)) alertBar(`Nie udało się usunąć (${x.code || x.message}).`); }
  }
});
$("orders").addEventListener("change", async e => {
  const s = e.target.closest("[data-act='status']"); if (!s) return;
  const o = orders.find(x => x._id === s.closest(".order").dataset.id);
  try { await setStatus(o, s.value); }
  catch (x) { s.value = o.status; if (!denied(x)) alertBar(`Nie udało się zmienić statusu (${x.code || x.message}).`); }
});

/* ---------- rezerwacje ---------- */
function watchRes() {
  unsubRes = fb.fs.onSnapshot(fb.fs.collection(fb.db, "rezerwacje"), snap => {
    resList = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
    renderRes();
  }, x => { denied(x); $("resList").innerHTML = `<p class="muted">Nie udało się wczytać rezerwacji.</p>`; });
}
const itemName = id => { const it = items.find(i => i._id === id); return it ? it.name : "(usunięta pozycja)"; };
function renderRes() {
  const today = todayStr(), f = $("rFilter").value;
  const upcoming = resList.filter(r => r.resTo >= today);
  $("cRes").textContent = upcoming.length || "";
  let list = f === "next" ? upcoming : f === "past" ? resList.filter(r => r.resTo < today) : resList.slice();
  list.sort((a, b) => (a.resFrom < b.resFrom ? -1 : 1) * (f === "past" ? -1 : 1));
  if (!list.length) {
    $("resList").innerHTML = `<p class="muted">${f === "past" ? "Brak minionych rezerwacji." : "Brak rezerwacji. Pojawią się, gdy klient wyśle zapytanie, albo dodaj je ręcznie."}</p>`;
    return;
  }
  $("resList").innerHTML = list.map(r => {
    const o = orders.find(x => x._id === r._id);
    const its = (r.items || []).map(i => `${i.qty}× ${esc(itemName(i.id))}`).join(", ");
    const now = r.resFrom <= today && r.resTo >= today;
    return `<article class="order res st-${esc(r.status)}" data-id="${esc(r._id)}">
      <div class="o-head">
        <div class="o-who">${esc(r.event)} <span class="pill ${esc(r.status)}">${RES_STATUS[r.status] || esc(r.status)}</span>${now ? ` <span class="pill now">trwa teraz</span>` : ""}</div>
      </div>
      <div class="o-term"><b>${fmtRange(r.dateFrom, r.dateTo)}</b> · rezerwacja ${fmtRange(r.resFrom, r.resTo)}</div>
      <div class="o-meta">${o ? `z zapytania: ${esc(o.name)}${o.company ? " · " + esc(o.company) : ""}` : "dodana ręcznie"}</div>
      <div class="o-items">${its || "—"}</div>
      <div class="o-actions">
        ${r.status === "wstepna" ? `<button class="btn sm" type="button" data-act="confirm">Potwierdź</button>` : ""}
        <button class="btn ghost sm" type="button" data-act="edit">Edytuj</button>
        <button class="btn danger sm" type="button" data-act="del">Usuń</button>
      </div>
    </article>`;
  }).join("");
}
$("rFilter").addEventListener("change", renderRes);

/** Usuwa rezerwację; powiązane zapytanie w toku oznacza jako odrzucone, żeby się nie odtworzyła */
async function deleteRes(r) {
  const { fs, db } = fb; const batch = fs.writeBatch(db);
  batch.delete(fs.doc(db, "rezerwacje", r._id));
  const o = orders.find(x => x._id === r._id);
  if (o && (o.status === "nowe" || o.status === "zaakceptowane")) batch.update(fs.doc(db, "zapytania", o._id), { status: "odrzucone" });
  await batch.commit();
}
$("resList").addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const r = resList.find(x => x._id === b.closest(".order").dataset.id); if (!r) return;
  const act = b.dataset.act;
  try {
    if (act === "edit") return openResEditor(r);
    if (act === "confirm") {
      b.disabled = true;
      const { fs, db } = fb; const batch = fs.writeBatch(db);
      batch.update(fs.doc(db, "rezerwacje", r._id), { status: "potwierdzona" });
      const o = orders.find(x => x._id === r._id);
      if (o && o.status === "nowe") batch.update(fs.doc(db, "zapytania", o._id), { status: "zaakceptowane" });
      await batch.commit();
    }
    if (act === "del") {
      const o = orders.find(x => x._id === r._id);
      if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = o ? "Na pewno? Zapytanie będzie odrzucone" : "Na pewno?"; return; }
      await deleteRes(r);
    }
  } catch (x) { b.disabled = false; if (!denied(x)) alertBar(`Nie udało się zapisać (${x.code || x.message}).`); }
});

/* edytor rezerwacji */
function itemOptions(sel) {
  return items.map(it => `<option value="${esc(it._id)}" ${it._id === sel ? "selected" : ""}>${esc(it.kod)} – ${esc(it.name)}${hasStock(it) ? ` (stan ${it.stock})` : ""}</option>`).join("");
}
function addResRow(id = "", qty = 1) {
  const row = document.createElement("div"); row.className = "r-row";
  row.innerHTML = `<select class="r-it" aria-label="Element">${itemOptions(id || items[0]?._id)}</select>
    <input class="r-q" type="number" min="1" step="1" value="${Number(qty) || 1}" aria-label="Liczba">
    <button class="iconbtn" type="button" data-rm aria-label="Usuń element">×</button>`;
  $("r-items").appendChild(row);
}
function fillBuffer() {
  const from = $("r-from").value, to = $("r-to").value && $("r-to").value >= from ? $("r-to").value : from;
  if (!isDate(from)) return;
  $("r-resFrom").value = addDays(from, -SETS.zapasPrzed);
  $("r-resTo").value = addDays(to, SETS.zapasPo);
}
function openResEditor(r) {
  resEditing = r || null;
  $("rTitle").textContent = r ? "Edytuj rezerwację" : "Nowa rezerwacja";
  $("r-event").value = r?.event || ""; $("r-from").value = r?.dateFrom || ""; $("r-to").value = r && r.dateTo !== r.dateFrom ? r.dateTo : "";
  $("r-resFrom").value = r?.resFrom || ""; $("r-resTo").value = r?.resTo || ""; $("r-status").value = r?.status || "potwierdzona";
  const o = r && orders.find(x => x._id === r._id);
  $("rLinked").hidden = !o; $("rLinked").textContent = o ? `Powiązana z zapytaniem: ${o.name}${o.company ? ", " + o.company : ""}. Zmiany dotyczą tylko rezerwacji.` : "";
  $("r-items").innerHTML = ""; (r?.items?.length ? r.items : [{}]).forEach(i => addResRow(i.id, i.qty));
  $("rDelete").hidden = !r; $("rDelete").classList.remove("armed"); $("rDelete").textContent = "Usuń rezerwację";
  $("rErr").hidden = true; $("resEditor").hidden = false; $("r-event").focus();
}
$("addRes").addEventListener("click", () => {
  if (!items.length) { alertBar("Najpierw dodaj pozycje do katalogu."); return; }
  openResEditor(null);
});
$("r-from").addEventListener("change", fillBuffer);
$("r-to").addEventListener("change", fillBuffer);
$("r-addItem").addEventListener("click", () => addResRow());
$("r-items").addEventListener("click", e => { if (e.target.closest("[data-rm]")) e.target.closest(".r-row").remove(); });
$("rCancel").addEventListener("click", () => $("resEditor").hidden = true);
$("resEditor").addEventListener("click", e => { if (e.target.id === "resEditor") $("resEditor").hidden = true; });
document.addEventListener("keydown", e => { if (e.key === "Escape") $("resEditor").hidden = true; });
$("rForm").addEventListener("submit", async e => {
  e.preventDefault();
  const err = $("rErr"); const fail = m => { err.textContent = m; err.hidden = false; };
  const from = $("r-from").value, to = $("r-to").value || from, rf = $("r-resFrom").value, rt = $("r-resTo").value;
  const merged = {};
  for (const row of $("r-items").querySelectorAll(".r-row")) {
    const id = row.querySelector(".r-it").value, q = Math.round(Number(row.querySelector(".r-q").value) || 0);
    if (id && q > 0) merged[id] = (merged[id] || 0) + q;
  }
  const list = Object.entries(merged).map(([id, qty]) => ({ id, qty }));
  if (!$("r-event").value.trim()) return fail("Wpisz nazwę wydarzenia.");
  if (!isDate(from)) return fail("Wybierz pierwszy dzień wydarzenia.");
  if (to < from) return fail("Ostatni dzień nie może być przed pierwszym.");
  if (!isDate(rf) || !isDate(rt) || rf > from || rt < to) return fail("Okres rezerwacji musi obejmować całe wydarzenie.");
  if (!list.length) return fail("Dodaj co najmniej jeden element.");
  const data = { event: $("r-event").value.trim().slice(0, 190), dateFrom: from, dateTo: to, resFrom: rf, resTo: rt, status: $("r-status").value, items: list };
  const btn = $("rSave"); btn.disabled = true; btn.textContent = "Zapisuję…";
  try {
    if (resEditing) await fb.fs.updateDoc(fb.fs.doc(fb.db, "rezerwacje", resEditing._id), data);
    else await fb.fs.addDoc(fb.fs.collection(fb.db, "rezerwacje"), { ...data, created: fb.fs.serverTimestamp() });
    $("resEditor").hidden = true;
  } catch (x) { if (denied(x)) $("resEditor").hidden = true; else fail(`Nie udało się zapisać (${x.code || x.message}).`); }
  btn.disabled = false; btn.textContent = "Zapisz";
});
$("rDelete").addEventListener("click", async () => {
  const b = $("rDelete");
  if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = "Kliknij ponownie, aby usunąć"; return; }
  try { await deleteRes(resEditing); $("resEditor").hidden = true; }
  catch (x) { if (!denied(x)) { $("rErr").textContent = `Nie udało się usunąć (${x.code || x.message}).`; $("rErr").hidden = false; } }
});

/* ---------- ustawienia ---------- */
$("settings").addEventListener("submit", async e => {
  e.preventDefault();
  const d = Math.max(1, Math.round(Number($("s-days").value) || 1));
  const data = { dniWCenie: d, doplataDzien: Math.max(0, Number($("s-extra").value) || 0) / 100, vat: Math.max(0, Number($("s-vat").value) || 0) / 100,
    zapasPrzed: Math.max(0, Math.round(Number($("s-before").value) || 0)), zapasPo: Math.max(0, Math.round(Number($("s-after").value) || 0)) };
  try { await fb.fs.setDoc(fb.fs.doc(fb.db, "ustawienia", "ogolne"), data, { merge: true }); SETS = { ...SETS, ...data }; $("s-msg").textContent = "Zapisano. Katalog pokaże nowe wartości po odświeżeniu."; }
  catch (x) { if (!denied(x)) $("s-msg").textContent = `Nie udało się zapisać (${x.code || x.message}).`; }
});
