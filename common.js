/* Wspólne funkcje: połączenie z Firebase, wczytywanie danych, rysunki zastępcze */
import * as CFG from "./config.js";

export const CFG_ = CFG;
export const CONFIGURED = !!(CFG.FIREBASE_CONFIG && CFG.FIREBASE_CONFIG.projectId);
const SDK = "https://www.gstatic.com/firebasejs/10.12.2";

export const DEFAULT_SETTINGS = { dniWCenie: 3, doplataDzien: 0.2, vat: 0.23, zapasPrzed: 1, zapasPo: 1 };

/* ---------- daty (format RRRR-MM-DD, liczone w UTC, bez przesunięć strefy) ---------- */
export const todayStr = () => { const d = new Date(); return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10); };
export const addDays = (s, n) => { const d = new Date(s + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const daysBetween = (a, b) => Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 864e5);
let DLOC = "pl-PL";
/** Język dat (katalog przełącza go przy zmianie języka; panel zostaje po polsku) */
export const setDateLocale = l => { DLOC = l; };
export const fmtD = (s, year = true) => s ? new Date(s + "T00:00:00Z").toLocaleDateString(DLOC, { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" }) : "";
export const fmtRange = (a, b) => !a ? "" : (!b || a === b) ? fmtD(a) : `${fmtD(a, a.slice(0, 4) !== b.slice(0, 4))} – ${fmtD(b)}`;
export const overlaps = (a1, a2, b1, b2) => a1 <= b2 && b1 <= a2;
export const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || "");

/* Statusy zapytań i rezerwacji */
export const ORDER_STATUS = { nowe: "nowe – wstępna rezerwacja", zaakceptowane: "zaakceptowane", zakonczone: "zakończone", odrzucone: "odrzucone" };
export const RES_STATUS = { wstepna: "wstępnie", potwierdzona: "potwierdzone" };
export const hasStock = it => typeof it.stock === "number" && it.stock >= 0;

/** Rezerwacje, które jeszcze się nie skończyły */
export async function loadReservations() {
  const fb = await getFb();
  if (!fb) { const { DEMO_RES } = await import("./seed.js"); return DEMO_RES; }
  const q = fb.fs.query(fb.fs.collection(fb.db, "rezerwacje"), fb.fs.where("resTo", ">=", todayStr()));
  const snap = await fb.fs.getDocs(q);
  return snap.docs.map(d => ({ _id: d.id, ...d.data() })).sort((a, b) => a.resFrom < b.resFrom ? -1 : 1);
}

let fbPromise = null;
/** Zwraca { app, db, fs } albo null w trybie demo */
export function getFb() {
  if (!CONFIGURED) return Promise.resolve(null);
  if (!fbPromise) fbPromise = (async () => {
    const appM = await import(`${SDK}/firebase-app.js`);
    const fs = await import(`${SDK}/firebase-firestore.js`);
    const app = appM.initializeApp(CFG.FIREBASE_CONFIG);
    // Pamięć podręczna tylko w bieżącej karcie. Wspólna pamięć między kartami powodowała,
    // że karta katalogu (bez logowania) obsługiwała zapytania karty panelu i baza odmawiała dostępu.
    let db;
    try { db = fs.initializeFirestore(app, { localCache: fs.memoryLocalCache() }); }
    catch (e) { db = fs.getFirestore(app); }
    return { app, db, fs };
  })();
  return fbPromise;
}
export async function getAuth() {
  const fb = await getFb(); if (!fb) return null;
  const am = await import(`${SDK}/firebase-auth.js`);
  return { auth: am.getAuth(fb.app), am };
}

export const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

/** Pozycje katalogu: z bazy albo (tryb demo) z seed.js */
export async function loadItems({ onlyActive = true } = {}) {
  let items;
  const fb = await getFb();
  if (!fb) {
    const { SEED_ITEMS } = await import("./seed.js");
    items = SEED_ITEMS.map(it => ({ ...it, _id: it.kod }));
  } else {
    const snap = await fb.fs.getDocs(fb.fs.collection(fb.db, "pozycje"));
    items = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  }
  items.sort(byOrder);
  return onlyActive ? items.filter(i => i.active !== false) : items;
}

export async function loadSettings() {
  const fb = await getFb();
  if (!fb) return { ...DEFAULT_SETTINGS };
  try {
    const d = await fb.fs.getDoc(fb.fs.doc(fb.db, "ustawienia", "ogolne"));
    return { ...DEFAULT_SETTINGS, ...(d.exists() ? d.data() : {}) };
  } catch (e) { return { ...DEFAULT_SETTINGS }; }
}

export const zl = n => (Number(n) || 0).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł";
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const plural = n => n === 1 ? "element" : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? "elementy" : "elementów";

/* Rysunki zastępcze dla pozycji bez zdjęcia (pole "ill") */
const S = {
  a:'fill="var(--ill-a)"', b:'fill="var(--ill-b)"', c:'fill="var(--ill-c)"', d:'fill="var(--ill-d)"', l:'fill="var(--ill-leaf)"',
};
const svg = inner => `<svg viewBox="0 0 120 90" aria-hidden="true">${inner}</svg>`;
export const ILL = {
  bistro: svg(`<ellipse cx="60" cy="30" rx="34" ry="7" ${S.d}/><rect x="57" y="34" width="6" height="40" ${S.b}/><ellipse cx="60" cy="78" rx="18" ry="4" ${S.b}/>`),
  koktajl: svg(`<ellipse cx="60" cy="14" rx="26" ry="5" ${S.d}/><rect x="58" y="18" width="4" height="58" ${S.b}/><ellipse cx="60" cy="80" rx="16" ry="4" ${S.b}/>`),
  konf: svg(`<rect x="8" y="30" width="104" height="8" rx="1" ${S.d}/><rect x="14" y="38" width="5" height="40" ${S.b}/><rect x="101" y="38" width="5" height="40" ${S.b}/><rect x="40" y="38" width="40" height="3" ${S.a}/>`),
  krzeslo: svg(`<rect x="44" y="8" width="32" height="34" rx="4" ${S.a}/><rect x="40" y="44" width="40" height="7" rx="2" ${S.a}/><rect x="43" y="51" width="4" height="30" ${S.b}/><rect x="73" y="51" width="4" height="30" ${S.b}/>`),
  hoker: svg(`<ellipse cx="60" cy="16" rx="18" ry="5" ${S.c}/><rect x="58" y="20" width="4" height="54" ${S.b}/><rect x="48" y="52" width="24" height="3" rx="1.5" ${S.b}/><ellipse cx="60" cy="78" rx="15" ry="4" ${S.b}/>`),
  fotel: svg(`<rect x="28" y="18" width="64" height="38" rx="10" ${S.c}/><rect x="18" y="34" width="16" height="34" rx="6" ${S.c}/><rect x="86" y="34" width="16" height="34" rx="6" ${S.c}/><rect x="32" y="50" width="56" height="16" rx="4" ${S.a}/><rect x="26" y="68" width="4" height="10" ${S.b}/><rect x="90" y="68" width="4" height="10" ${S.b}/>`),
  sofa: svg(`<rect x="10" y="22" width="100" height="32" rx="8" ${S.a}/><rect x="4" y="38" width="14" height="30" rx="5" ${S.b}/><rect x="102" y="38" width="14" height="30" rx="5" ${S.b}/><rect x="16" y="50" width="42" height="16" rx="4" ${S.d}/><rect x="62" y="50" width="42" height="16" rx="4" ${S.d}/><rect x="14" y="68" width="4" height="10" ${S.b}/><rect x="102" y="68" width="4" height="10" ${S.b}/>`),
  pufa: svg(`<ellipse cx="60" cy="38" rx="28" ry="8" ${S.c}/><rect x="32" y="38" width="56" height="34" ${S.c}/><ellipse cx="60" cy="72" rx="28" ry="8" ${S.c}/><ellipse cx="60" cy="38" rx="28" ry="8" fill="var(--ill-a)" opacity=".35"/>`),
  lada: svg(`<rect x="12" y="20" width="96" height="6" ${S.d}/><rect x="16" y="26" width="88" height="54" ${S.a}/><rect x="28" y="40" width="64" height="24" rx="2" ${S.c}/><rect x="40" y="49" width="40" height="5" fill="var(--surface)" opacity=".8"/>`),
  bar: svg(`<rect x="6" y="22" width="108" height="6" ${S.b}/><rect x="10" y="28" width="100" height="52" ${S.d}/><rect x="10" y="70" width="100" height="10" ${S.c}/>`),
  scianka: svg(`<rect x="38" y="4" width="44" height="80" ${S.a}/><rect x="36" y="4" width="3" height="80" ${S.b}/><rect x="81" y="4" width="3" height="80" ${S.b}/><rect x="36" y="2" width="48" height="3" ${S.b}/>`),
  backwall: svg(`<rect x="8" y="6" width="104" height="72" rx="3" ${S.c}/><rect x="8" y="78" width="104" height="5" ${S.b}/><rect x="36" y="30" width="48" height="8" fill="var(--surface)" opacity=".85"/><rect x="46" y="42" width="28" height="4" fill="var(--surface)" opacity=".5"/>`),
  regal: svg(`<rect x="30" y="4" width="4" height="80" ${S.b}/><rect x="86" y="4" width="4" height="80" ${S.b}/><rect x="30" y="20" width="60" height="3" ${S.b}/><rect x="30" y="44" width="60" height="3" ${S.b}/><rect x="30" y="68" width="60" height="3" ${S.b}/><rect x="38" y="8" width="12" height="12" ${S.c}/><rect x="54" y="12" width="10" height="8" ${S.d}/><rect x="42" y="32" width="18" height="12" ${S.d}/><rect x="66" y="34" width="14" height="10" ${S.c}/><rect x="40" y="58" width="10" height="10" ${S.a}/>`),
  gablota: svg(`<rect x="36" y="6" width="48" height="40" rx="1" fill="var(--ill-c)" opacity=".18"/><rect x="36" y="6" width="48" height="40" fill="none" stroke="var(--ill-b)" stroke-width="2"/><rect x="52" y="28" width="16" height="12" ${S.d}/><rect x="34" y="46" width="52" height="38" ${S.a}/>`),
  monitor: svg(`<rect x="14" y="8" width="92" height="54" rx="3" ${S.b}/><rect x="18" y="12" width="84" height="46" ${S.c}/><rect x="57" y="62" width="6" height="16" ${S.b}/><rect x="40" y="78" width="40" height="5" rx="2" ${S.b}/>`),
  roslina: svg(`<path d="M60 52 C40 40 34 20 46 8 C52 22 58 34 60 52Z" ${S.l}/><path d="M60 52 C80 40 88 22 76 10 C70 24 62 36 60 52Z" ${S.l}/><path d="M60 52 C56 34 58 18 62 6 C66 20 64 36 60 52Z" ${S.l}/><path d="M44 52 H76 L72 84 H48Z" ${S.a}/>`),
  reflektor: svg(`<rect x="10" y="10" width="100" height="5" ${S.b}/><rect x="28" y="15" width="3" height="10" ${S.b}/><rect x="88" y="15" width="3" height="10" ${S.b}/><path d="M22 25 h16 l-3 10 h-10z" ${S.b}/><path d="M82 25 h16 l-3 10 h-10z" ${S.b}/><path d="M25 35 h10 l12 50 h-34z" fill="var(--ill-d)" opacity=".7"/><path d="M85 35 h10 l12 50 h-34z" fill="var(--ill-d)" opacity=".7"/>`),
  wykladzina: svg(`<path d="M10 64 L50 40 L110 54 L70 80Z" ${S.c}/><path d="M10 64 L70 80 L70 84 L10 68Z" ${S.b}/><path d="M70 80 L110 54 L110 58 L70 84Z" ${S.b}/>`),
  ulotki: svg(`<rect x="58" y="20" width="4" height="62" ${S.b}/><rect x="40" y="80" width="40" height="4" ${S.b}/><rect x="40" y="8" width="40" height="36" rx="1" ${S.a}/><rect x="44" y="12" width="14" height="12" ${S.c}/><rect x="62" y="12" width="14" height="12" ${S.d}/><rect x="44" y="28" width="14" height="12" ${S.d}/><rect x="62" y="28" width="14" height="12" ${S.c}/>`),
  ekspres: svg(`<rect x="36" y="10" width="48" height="66" rx="4" ${S.b}/><rect x="42" y="16" width="36" height="12" rx="2" ${S.a}/><rect x="48" y="38" width="24" height="6" ${S.a}/><rect x="52" y="54" width="16" height="16" rx="2" ${S.d}/><rect x="34" y="76" width="52" height="4" ${S.b}/>`),
  lodowka: svg(`<rect x="36" y="4" width="48" height="80" rx="3" ${S.a}/><rect x="40" y="8" width="40" height="72" fill="var(--ill-c)" opacity=".18"/><rect x="40" y="30" width="40" height="2" ${S.b}/><rect x="40" y="54" width="40" height="2" ${S.b}/><rect x="46" y="16" width="6" height="14" ${S.l}/><rect x="56" y="18" width="6" height="12" ${S.d}/><rect x="48" y="40" width="6" height="14" ${S.d}/><rect x="76" y="34" width="2" height="18" ${S.b}/>`),
};
const PLACEHOLDER = `<svg viewBox="0 0 120 90" aria-hidden="true"><rect x="20" y="14" width="80" height="62" rx="4" fill="none" stroke="var(--ill-b)" stroke-width="2" stroke-dasharray="5 4"/><circle cx="46" cy="36" r="7" fill="var(--ill-a)"/><path d="M28 68 L50 48 L64 60 L76 50 L92 68Z" fill="var(--ill-a)"/></svg>`;
export const pic = it => it.img
  ? `<img src="${esc(it.img)}" alt="${esc(it.name)}" loading="lazy">`
  : (ILL[it.ill] || PLACEHOLDER);
