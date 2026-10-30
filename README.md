# Katalog stoisk

Publiczny katalog elementów scenografii targowej. Klient wpisuje termin wydarzenia, wybiera elementy i ich ilość, widzi ich dostępność w tym terminie i kosztorys (netto/brutto), a potem wysyła zapytanie. Zapytanie przychodzi do Ciebie mailem i zapisuje się w panelu administratora. W panelu edytujesz każdą pozycję: zdjęcie, nazwę, opis, cenę, kategorię, widoczność i kolejność.

**Z czego korzysta (wszystko w darmowych planach):**

| Usługa | Do czego |
|---|---|
| GitHub Pages | hosting strony |
| Firebase Firestore | baza pozycji, rezerwacji, ustawień i zapytań (zdjęcia też są w bazie) |
| Firebase Authentication | logowanie do panelu admina |
| Web3Forms | wysyłka zapytań na Twój e-mail (250 maili/mies. za darmo) |

**Pliki:**

- `index.html`, `app.js` – katalog dla klientów
- `admin.html`, `admin.js`, `admin.css` – panel administratora (adres: `…/admin.html`)
- `config.js` – **tu wpisujesz swoje dane**
- `firestore.rules` – reguły bezpieczeństwa bazy (wklejasz w konsoli Firebase)
- `seed.js` – przykładowy katalog do wczytania jednym kliknięciem w panelu
- `common.js`, `styles.css` – części wspólne

Dopóki `config.js` nie jest uzupełniony, katalog działa w **trybie demo** na przykładowych danych. Dwa wydarzenia z dopiskiem „(przykład)” są wtedy wpisane na stałe w `seed.js` i znikają same po podłączeniu Firebase.

---

## Instalacja krok po kroku (ok. 20 minut)

### 1. Projekt Firebase

1. Wejdź na <https://console.firebase.google.com> i kliknij **Utwórz projekt** (Google Analytics możesz wyłączyć).
2. W menu po lewej: **Build → Firestore Database → Utwórz bazę danych**. Lokalizacja: `eur3 (europe-west)`. Tryb: **produkcyjny**.
3. **Build → Authentication → Rozpocznij → E-mail/hasło → Włącz → Zapisz.**
4. W **Authentication → Użytkownicy → Dodaj użytkownika** utwórz konto admina (Twój e-mail i hasło). Skopiuj jego **UID użytkownika**.
5. **Firestore Database → Reguły**: wklej całą zawartość pliku `firestore.rules`, w miejsce `WPISZ_UID_ADMINA` wpisz skopiowany UID i kliknij **Opublikuj**.
6. Kliknij koło zębate → **Ustawienia projektu → Twoje aplikacje → ikona `</>` (Web)**. Nadaj nazwę, nie zaznaczaj Hostingu, kliknij **Zarejestruj**. Skopiuj obiekt `firebaseConfig` do pliku `config.js` (w miejsce `FIREBASE_CONFIG`).

### 2. Wysyłka maili (Web3Forms)

1. Wejdź na <https://web3forms.com>, wpisz adres, na który mają przychodzić zapytania, i kliknij **Create Access Key**.
2. Klucz przyjdzie mailem. Wklej go w `config.js` jako `WEB3FORMS_KEY`.
3. W `config.js` wpisz też `FIRMA_NAZWA` i `FIRMA_EMAIL` (adres pokazywany klientom, gdy wysyłka się nie uda).

Klient dostaje „Odpowiedz do” ustawione na swój adres, więc na zapytanie odpowiadasz zwykłym „Odpowiedz” w poczcie.

### 3. GitHub Pages

1. Na GitHubie utwórz nowe repozytorium (np. `katalog-stoisk`, może być publiczne).
2. Wgraj **wszystkie pliki z tego folderu** (przycisk **Add file → Upload files**, przeciągnij pliki, **Commit changes**).
3. **Settings → Pages → Source: Deploy from a branch → Branch: `main` / `(root)` → Save.**
4. Po 1–2 minutach strona będzie pod adresem `https://TWOJA-NAZWA.github.io/katalog-stoisk/`.
5. Wróć do Firebase: **Authentication → Ustawienia → Autoryzowane domeny → Dodaj domenę** i wpisz `TWOJA-NAZWA.github.io` (bez `https://`). Bez tego logowanie do panelu nie zadziała.

### 4. Pierwsze uruchomienie

1. Otwórz `https://TWOJA-NAZWA.github.io/katalog-stoisk/admin.html` i zaloguj się kontem admina.
2. Kliknij **Wczytaj przykładowy katalog**: do bazy trafią wszystkie dotychczasowe pozycje razem z Twoimi wizualizacjami.
3. Popraw ceny, opisy i zdjęcia, usuń zbędne pozycje, dodaj nowe.
4. Otwórz katalog (`…/katalog-stoisk/`), dodaj coś do kosztorysu i wyślij próbne zapytanie na swój adres.

---

## Stany magazynowe i rezerwacje

- **Stan magazynowy** ustawiasz w edycji pozycji. Klient nie doda więcej sztuk, niż macie. Puste pole oznacza brak limitu.
- **Termin:** klient wpisuje tylko dni, w których elementy są używane (jeden dzień albo zakres). Do rezerwacji system sam dolicza zapas na transport, montaż i demontaż: domyślnie 1 dzień przed i 1 dzień po (zmienisz to w Ustawieniach). Wydarzenie 1 grudnia rezerwuje elementy od 30 listopada do 2 grudnia.
- **Wstępna rezerwacja:** wysłane zapytanie od razu tworzy wstępną rezerwację. Na kartach w katalogu widać, ile sztuk jest wolnych w wybranym terminie, ile jest zarezerwowanych i na jakie wydarzenie (wstępnie lub potwierdzone). Lista „Zaplanowane wydarzenia” nad katalogiem pokazuje wszystkie nadchodzące rezerwacje.
- **Rezerwacje nie blokują wyboru** – to informacja. Gdy klient wybierze więcej, niż jest wolnych w danym terminie, zobaczy ostrzeżenie, a w mailu do Ciebie pozycja dostanie dopisek „UWAGA”.
- **Akceptacja** w zakładce Zapytania: „Akceptuj rezerwację” zmienia rezerwację na potwierdzoną. Status „odrzucone” albo usunięcie zapytania zwalnia elementy.

Publicznie widoczne są tylko nazwa wydarzenia, daty i liczby sztuk. Dane kontaktowe z zapytań widzi wyłącznie admin.

## Praca z panelem

- **Pozycje** – „Edytuj” otwiera formularz: zdjęcie (wgrywane z dysku, automatycznie zmniejszane do ok. 1100 px) albo adres URL zdjęcia, kod, kategoria, nazwa, opis/wymiary, cena netto, jednostka (szt., m², kpl.…), widoczność i „szeroka karta” dla poziomych zdjęć. Przełącznik w tabeli ukrywa pozycję bez usuwania. Strzałki zmieniają kolejność w katalogu.
- **Zapytania** – lista wysłanych kosztorysów z terminem i pełną treścią, przycisk akceptacji, status (nowe / zaakceptowane / zakończone / odrzucone) i szybka odpowiedź mailem. Zapytania zapisują się tu nawet wtedy, gdy mail by nie doszedł.
- **Rezerwacje** – wszystkie rezerwacje (bieżące, nadchodzące i minione). Tu je potwierdzasz, edytujesz (nazwa wydarzenia, daty, okres z montażem, elementy i ilości) i usuwasz. Przyciskiem „Dodaj rezerwację” wpiszesz też wydarzenie spoza katalogu, np. własne targi, serwis albo wypożyczenie uzgodnione telefonicznie. Usunięcie rezerwacji z zapytania w toku oznacza to zapytanie jako odrzucone.
- **Ustawienia** – liczba dni wliczonych w cenę, dopłata za każdy kolejny dzień wydarzenia, stawka VAT, dni zapasu przed i po wydarzeniu.

Nowa kategoria powstaje sama, gdy wpiszesz jej nazwę w pozycji. Kolejność kategorii w katalogu wynika z kolejności pozycji.

## Dobre praktyki dla zdjęć

- Format poziomy 4:3 albo kwadrat, białe tło (tak jak Twoje rendery).
- Do „szerokiej karty” pasują zdjęcia bardzo poziome (np. ściany ekspozycyjne).
- Jedno zdjęcie po kompresji zajmuje zwykle 60–200 KB. Darmowy plan Firebase daje 10 GB transferu miesięcznie, co przy ok. 30 pozycjach wystarcza na kilka tysięcy odwiedzin katalogu w miesiącu (przeglądarka klienta zapamiętuje dane, więc powroty są tańsze).

## Bezpieczeństwo

Dane w `config.js` są widoczne publicznie i tak ma być. Bazę chronią reguły z `firestore.rules`: każdy może czytać katalog i rezerwacje oraz wysłać zapytanie, ale tylko konto o Twoim UID może zmieniać pozycje oraz czytać zapytania klientów. Panel `admin.html` jest dostępny pod adresem dla każdego, ale bez logowania niczego nie pokaże ani nie zmieni.
