/* Teksty katalogu po polsku i angielsku.
   Nazwę, opis i kategorię pozycji tłumaczy się w panelu admina (pola „EN”).
   Kategorie bez tłumaczenia w pozycji biorą je z CAT_EN poniżej, a w ostateczności zostają po polsku. */

export const LANGS = ["pl", "en"];

const T = {
  pl: {
    title: "Katalog stoisk",
    eyebrow: "Zabudowa i wyposażenie stoisk · wynajem",
    lead: "Wybierz elementy i ich liczbę, a gotową listę wyślesz nam jednym kliknięciem. Na jej podstawie przygotujemy wizualizację i wycenę stoiska.",
    step1: "Wybierz elementy", step2: "Uzupełnij dane", step3: "Wyślij do nas",
    demo: "Tryb demo: katalog pokazuje przykładowe dane, a zapytania nie są wysyłane.",
    termTitle: "Termin wydarzenia", firstDay: "Pierwszy dzień", lastDay: "Ostatni dzień", optional: "(opcjonalnie)",
    termHint: "Wpisz dni, w których elementy będą używane. Pokażemy, ile sztuk jest wolnych w tym terminie. Do rezerwacji doliczamy {buf} na transport, montaż i demontaż.",
    termSet: "Wydarzenie: <b>{range}</b> ({days}). Rezerwujemy elementy od <b>{from}</b> do <b>{to}</b>, z zapasem na transport, montaż i demontaż ({buf}).",
    bufSame: "{n} przed i po", bufDiff: "{a} przed, {b} po",
    day1: "1 dzień", daysN: "{n} dni",
    planTitle: "Zaplanowane wydarzenia", overlaps: "nachodzi na Twój termin", yourRequest: "Twoje zapytanie",
    resWstepna: "wstępnie", resPotwierdzona: "potwierdzone",
    all: "Wszystkie", categories: "Kategorie",
    loading: "Wczytuję katalog…", loadFail: "Nie udało się wczytać katalogu. Odśwież stronę za chwilę.",
    empty: "Katalog jest pusty.", emptyCat: "Brak pozycji w tej kategorii.",
    inStock: "Na stanie: <b>{n}</b> {u}", freeIn: "Wolne w tym terminie: <b>{free}</b> z {stock} {u}",
    reserved: "Zarezerwowane:", prelim: " (wstępnie)", tooMany: "Wybrano więcej niż wolne w tym terminie ({q} z {free}).",
    minus: "Odejmij: {name}", plus: "Dodaj: {name}", qtyOf: "Liczba: {name}",
    panelTitle: "Twoje stoisko", close: "Zamknij",
    nothing: "Nic jeszcze nie wybrano. Dodaj elementy z katalogu.",
    remove: "Usuń", clearAll: "Wyczyść wszystko",
    noTerm: "Termin nie jest wybrany", cartTerm: "Wydarzenie: {range} · {days}", cartRes: "Rezerwacja: {range}",
    change: "Zmień", choose: "Wybierz",
    freeOnly: "W tym terminie wolnych: {free} {u}",
    overWarn1: "1 pozycja przekracza liczbę wolnych sztuk w tym terminie. Możesz wysłać zapytanie, ale część elementów jest zarezerwowana na inne wydarzenie.",
    overWarnN: "{n} pozycje przekraczają liczbę wolnych sztuk w tym terminie. Możesz wysłać zapytanie, ale część elementów jest zarezerwowana na inne wydarzenie.",
    priceNote: "Wycenę przygotujemy po otrzymaniu zapytania, razem z wizualizacją stoiska.",
    fName: "Imię i nazwisko*", fCompany: "Firma", fEmail: "E-mail*", fPhone: "Telefon", fEvent: "Targi / wydarzenie",
    fSize: "Wymiary stoiska (m)", fSizePh: "np. 4 × 3", fNotes: "Uwagi do aranżacji", fNotesPh: "Kolorystyka, logo, ustawienie, wejście z dwóch stron…",
    send: "Wyślij zapytanie", sending: "Wysyłam…", showStand: "Twoje stoisko",
    errTerm: "Wybierz termin wydarzenia, żebyśmy mogli zarezerwować elementy.",
    errPast: "Termin wydarzenia nie może być w przeszłości.",
    errName: "Wpisz imię i nazwisko, żebyśmy wiedzieli, do kogo odpisać.",
    errEmail: "Wpisz poprawny adres e-mail, na który wyślemy wizualizację.",
    okTitle: "Dziękujemy, zapytanie wysłane",
    okText: "Elementy są wstępnie zarezerwowane od {from} do {to}. Przygotujemy wizualizację i wycenę, a odezwiemy się na adres {mail}.",
    okNew: "Zacznij nowe stoisko", back: "Wróć do katalogu",
    fbTitle: "Wyślij zapytanie mailem", fbNote: "Nie udało się wysłać zapytania automatycznie. Skopiuj treść i wyślij ją na nasz adres.",
    fbDemo: "Tryb demo: automatyczna wysyłka nie jest jeszcze skonfigurowana. Tak będzie wyglądać treść zapytania.",
    address: "Adres:", copy: "Kopiuj treść", openMail: "Otwórz w poczcie",
    copied: "Skopiowano. Wklej treść do maila na adres {mail}.", selected: "Treść zaznaczona. Skopiuj ją skrótem Ctrl+C (⌘C).",
    lang: "Język",
  },
  en: {
    title: "Stand catalogue",
    eyebrow: "Exhibition stand build and furniture · rental",
    lead: "Choose the elements and how many you need, then send us the list in one click. We will prepare a visualisation and a quote for your stand.",
    step1: "Choose elements", step2: "Add your details", step3: "Send to us",
    demo: "Demo mode: the catalogue shows sample data and requests are not sent.",
    termTitle: "Event dates", firstDay: "First day", lastDay: "Last day", optional: "(optional)",
    termHint: "Enter the days the elements will be in use. We will show how many are available on those dates. We add {buf} for transport, set-up and dismantling.",
    termSet: "Event: <b>{range}</b> ({days}). We reserve the elements from <b>{from}</b> to <b>{to}</b>, including time for transport, set-up and dismantling ({buf}).",
    bufSame: "{n} before and after", bufDiff: "{a} before, {b} after",
    day1: "1 day", daysN: "{n} days",
    planTitle: "Scheduled events", overlaps: "overlaps your dates", yourRequest: "Your request",
    resWstepna: "provisional", resPotwierdzona: "confirmed",
    all: "All", categories: "Categories",
    loading: "Loading the catalogue…", loadFail: "The catalogue could not be loaded. Please refresh the page in a moment.",
    empty: "The catalogue is empty.", emptyCat: "No items in this category.",
    inStock: "In stock: <b>{n}</b> {u}", freeIn: "Available on these dates: <b>{free}</b> of {stock} {u}",
    reserved: "Reserved:", prelim: " (provisional)", tooMany: "More selected than available on these dates ({q} of {free}).",
    minus: "Remove one: {name}", plus: "Add one: {name}", qtyOf: "Quantity: {name}",
    panelTitle: "Your stand", close: "Close",
    nothing: "Nothing selected yet. Add elements from the catalogue.",
    remove: "Remove", clearAll: "Clear all",
    noTerm: "No dates selected", cartTerm: "Event: {range} · {days}", cartRes: "Reservation: {range}",
    change: "Change", choose: "Choose",
    freeOnly: "Available on these dates: {free} {u}",
    overWarn1: "1 item exceeds the number available on these dates. You can still send the request, but some elements are reserved for another event.",
    overWarnN: "{n} items exceed the number available on these dates. You can still send the request, but some elements are reserved for another event.",
    priceNote: "We will send you a quote together with the stand visualisation once we receive your request.",
    fName: "Full name*", fCompany: "Company", fEmail: "Email*", fPhone: "Phone", fEvent: "Trade fair / event",
    fSize: "Stand size (m)", fSizePh: "e.g. 4 × 3", fNotes: "Notes on the layout", fNotesPh: "Colours, logo, layout, open on two sides…",
    send: "Send request", sending: "Sending…", showStand: "Your stand",
    errTerm: "Choose the event dates so we can reserve the elements.",
    errPast: "The event dates cannot be in the past.",
    errName: "Enter your full name so we know who to reply to.",
    errEmail: "Enter a valid email address for the visualisation.",
    okTitle: "Thank you, your request has been sent",
    okText: "The elements are provisionally reserved from {from} to {to}. We will prepare a visualisation and a quote and reply to {mail}.",
    okNew: "Start a new stand", back: "Back to the catalogue",
    fbTitle: "Send the request by email", fbNote: "The request could not be sent automatically. Copy the text and email it to us.",
    fbDemo: "Demo mode: automatic sending is not set up yet. This is what the request will look like.",
    address: "Address:", copy: "Copy text", openMail: "Open in email app",
    copied: "Copied. Paste the text into an email to {mail}.", selected: "Text selected. Copy it with Ctrl+C (⌘C).",
    lang: "Language",
  },
};

/** Angielskie nazwy kategorii używane, gdy pozycja nie ma własnego tłumaczenia kategorii */
export const CAT_EN = {
  "Gotowe strefy": "Ready-made zones", "Stoły": "Tables", "Siedziska": "Seating", "Lady": "Counters",
  "Zabudowa": "Stand build", "Multimedia i światło": "AV and lighting", "Dekoracje": "Decor", "Zaplecze": "Back-of-house",
};
const UNIT_EN = { "szt.": "pcs", "kpl.": "set", "mb": "lin. m", "m²": "m²" };

let lang = "pl";
try { lang = localStorage.getItem("katalog-lang") || ""; } catch (e) {}
if (!LANGS.includes(lang)) lang = (navigator.language || "pl").toLowerCase().startsWith("pl") ? "pl" : "en";

export const getLang = () => lang;
export function setLang(l) {
  if (!LANGS.includes(l)) return;
  lang = l;
  try { localStorage.setItem("katalog-lang", l); } catch (e) {}
  document.documentElement.lang = l;
}
export const locale = () => lang === "en" ? "en-GB" : "pl-PL";

/** Tekst ze słownika z podstawieniem {zmiennych} */
export function t(key, vars = {}) {
  const s = (T[lang] && T[lang][key]) ?? T.pl[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}
export const daysWord = n => n === 1 ? t("day1") : t("daysN", { n });
export const countWord = n => lang === "en" ? `${n} ${n === 1 ? "element" : "elements"}`
  : `${n} ${n === 1 ? "element" : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? "elementy" : "elementów"}`;

/* Pola pozycji w bieżącym języku */
export const itName = it => (lang === "en" && it.name_en) || it.name || "";
export const itDim = it => (lang === "en" && it.dim_en) || it.dim || "";
export const itCat = it => lang === "en" ? (it.cat_en || CAT_EN[it.cat] || it.cat || "") : (it.cat || "");
export const itUnit = it => { const u = it.unit || "szt."; return lang === "en" ? (UNIT_EN[u] || u) : u; };

/** Wypełnia elementy z atrybutami data-t (tekst), data-t-html (HTML ze słownika), data-t-ph (placeholder), data-t-aria */
export function applyStatic(root = document) {
  root.querySelectorAll("[data-t]").forEach(el => { el.textContent = t(el.dataset.t); });
  root.querySelectorAll("[data-t-ph]").forEach(el => { el.placeholder = t(el.dataset.tPh); });
  root.querySelectorAll("[data-t-aria]").forEach(el => { el.setAttribute("aria-label", t(el.dataset.tAria)); });
  document.documentElement.lang = lang;
}
