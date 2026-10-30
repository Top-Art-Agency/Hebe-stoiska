/* =====================================================================
   USTAWIENIA — uzupełnij według instrukcji w README.md
   Te dane są publiczne z założenia (widzi je przeglądarka każdego klienta).
   Bezpieczeństwo zapewniają reguły Firestore (plik firestore.rules).
   ===================================================================== */

// 1) Firebase → Ustawienia projektu → Twoje aplikacje → Konfiguracja SDK
//    Wklej tu obiekt firebaseConfig. Dopóki projectId jest pusty,
//    katalog działa w trybie demo na przykładowych danych.
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB0vFn4TicrWIm8vdHnJsASEcJSbKHoSww",
  authDomain: "hebe-stoiska.firebaseapp.com",
  projectId: "hebe-stoiska",
  storageBucket: "hebe-stoiska.firebasestorage.app",
  messagingSenderId: "944216883372",
  appId: "1:944216883372:web:6dbf0ad545b2b7645c5f09",
};

// 2) Klucz z https://web3forms.com (przychodzi mailem po wpisaniu Twojego adresu).
//    Zapytania trafią na adres, dla którego wygenerowano klucz.
export const WEB3FORMS_KEY = "";

// 3) Dane firmy pokazywane klientom
export const FIRMA_NAZWA = "Twoja Firma";
export const FIRMA_EMAIL = "zamowienia@twojafirma.pl";
