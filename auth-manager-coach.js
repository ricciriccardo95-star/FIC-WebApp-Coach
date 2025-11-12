// File: auth-manager-coach.js
// Gestore di autenticazione centralizzato per l'app COACH.
// AGGIUNTO: Logging per il debug.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configurazione (la stessa di index.html)
const firebaseConfig = {
    apiKey: "AIzaSyAQ_0F8KCks_4Wn2h2aTIepQY9VrIkWpUQ",
    authDomain: "database-atleti-fic.firebaseapp.com",
    databaseURL: "https://database-atleti-fic-default-rtdb.firebaseio.com",
    projectId: "database-atleti-fic",
    storageBucket: "database-atleti-fic.firebasestorage.app",
    messagingSenderId: "860422140545",
    appId: "1:860422140545:web:cd14c042a47f2650681380"
};

// Inizializza Firebase ED ESPORTA le istanze per l'uso in altri moduli
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const CACHE_KEY = 'currentCoach';

/**
 * Funzione globale per ottenere i dati del coach dalla cache (localStorage).
 * @returns {Object | null} I dati del coach (id, cognome, email) o null.
 */
window.getCurrentCoach = () => {
    const coachData = localStorage.getItem(CACHE_KEY);
    try {
        return coachData ? JSON.parse(coachData) : null;
    } catch (e) {
        console.error("AuthManager: Errore nel parsing dei dati coach da localStorage:", e);
        localStorage.removeItem(CACHE_KEY);
        return null;
    }
};

/**
 * Funzione globale per eseguire il logout.
 */
window.appLogout = () => {
    console.log("AuthManager: Esecuzione di appLogout()...");
    signOut(auth).catch((error) => {
        console.error('AuthManager: Logout Error', error);
    });
    // onAuthStateChanged gestirà la pulizia e il redirect
};

/**
 * Funzione helper per determinare se ci si trova su una pagina di login.
 */
const isLoginPage = () => {
    const path = window.location.pathname;
    const normalizedPath = path.toLowerCase();
    
    // Controlla se il path finisce con /index.html
    if (normalizedPath.endsWith('/index.html')) {
        return true;
    }
    
    // Controlla se siamo nella root (es. /WEB APP COACH/)
    // Questo è più robusto di un controllo esatto
    const segments = normalizedPath.split('/').filter(Boolean); // Rimuove spazi vuoti
    // Se c'è un solo segmento (es. 'web app coach') E non è un file .html, siamo in root.
    if (segments.length === 1 && !segments[0].endsWith('.html')) {
        return true;
    }
     // Se non ci sono segmenti (root assoluta, es. http://127.0.0.1/), è la pagina di login
    if (segments.length === 0) {
        return true;
    }

    return false;
};


/**
 * Gestore di autenticazione centrale.
 * Viene eseguito una volta al caricamento di QUALSIASI pagina.
 */
const authStateManager = async () => {
    console.log("AuthManager: Avviato.");
    try {
        await setPersistence(auth, browserLocalPersistence);

        onAuthStateChanged(auth, async (user) => {
            let coach = null;
            let error = null;

            if (user && user.email) {
                // --- UTENTE CON EMAIL LOGGATO ---
                console.log("AuthManager: Utente LOGGATO rilevato.", user.email);
                coach = window.getCurrentCoach(); // Prova a leggere dalla cache

                if (!coach || coach.email !== user.email) {
                    console.log("AuthManager: Dati coach non in cache. Recupero da Firestore...");
                    try {
                        // Cerca nella collezione 'allenatori' usando l'UID
                        const docRef = doc(db, "allenatori", user.uid);
                        const docSnap = await getDoc(docRef);

                        if (docSnap.exists()) {
                            const coachData = docSnap.data();
                            coach = {
                                id: docSnap.id,
                                cognome: coachData.cognome || 'Coach', // Aggiungi un default
                                email: user.email
                            };
                            localStorage.setItem(CACHE_KEY, JSON.stringify(coach));
                            console.log("AuthManager: Dati coach recuperati e salvati in cache:", coach);
                        } else {
                            console.error("AuthManager: Utente autenticato ma non trovato nel database 'allenatori'. Eseguo logout.");
                            error = new Error("Accesso non autorizzato per allenatori.");
                            await window.appLogout(); // Esegue logout
                            return; // Esce dalla funzione onAuthStateChanged
                        }
                    } catch (dbError) {
                        console.error("AuthManager: Errore recupero dati da Firestore:", dbError);
                        error = dbError;
                        localStorage.removeItem(CACHE_KEY);
                        await window.appLogout(); // Esegue logout
                        return; // Esce dalla funzione
                    }
                }

                // Reindirizzamento DOPO aver gestito i dati
                if (isLoginPage()) {
                    console.log("AuthManager: Utente loggato su pagina di login. Reindirizzo a coach_home.html...");
                    window.location.href = 'coach_home.html';
                    return; // Esce per evitare l'invio dell'evento sulla pagina di login
                }
                
                // Invia l'evento
                console.log("AuthManager: Invio evento 'coachAuthStateReady' (LOGGATO)");
                document.dispatchEvent(new CustomEvent('coachAuthStateReady', {
                    detail: { coach: coach, error: null }
                }));

            } else {
                // --- UTENTE NON LOGGATO O ANONIMO ---
                console.log("AuthManager: Utente NON LOGGATO rilevato.");
                localStorage.removeItem(CACHE_KEY); // Pulisci la cache

                if (!isLoginPage()) {
                    console.log("AuthManager: Utente non loggato su pagina protetta. Reindirizzo a index.html...");
                    // Gestisce il reindirizzamento dalle sottocartelle
                    const path = window.location.pathname;
                    const segments = path.split('/').filter(Boolean);
                    
                    // Definisce la root dell'app. Modifica 'web app coach' se il nome cambia.
                    const appRootSegment = 'web app coach'; 
                    
                    if (segments.length > 1 && segments[0].toLowerCase() === appRootSegment && segments[segments.length - 1].endsWith('.html')) {
                         // Es. /WEB APP COACH/GYM/gym_coach.html -> ../index.html
                         // Es. /WEB APP COACH/coach_home.html -> index.html
                         
                         // Conta quanti livelli scendere
                         let relativePath = '';
                         // Se siamo più profondi di 2 segmenti (es. /WEB APP COACH/GYM/file.html)
                         if (segments.length > 2) {
                            relativePath = '../'.repeat(segments.length - 2); // Scendi di (N-2) livelli
                         }
                         
                         window.location.href = relativePath + 'index.html'; 
                    } else {
                         // Fallback (se la struttura è diversa, es. /coach_home.html senza cartella root)
                         window.location.href = 'index.html';
                    }
                    return;
                }
                
                // Invia l'evento sulla pagina di login (per nascondere loader, ecc.)
                console.log("AuthManager: Invio evento 'coachAuthStateReady' (SLOGGATO)");
                document.dispatchEvent(new CustomEvent('coachAuthStateReady', {
                    detail: { coach: null, error: error } // 'error' sarà null o l'errore di logout
                }));
            }
        });

    } catch (persistenceError) {
        console.error("AuthManager: Errore nell'impostare la persistenza:", persistenceError);
        // Segnala errore critico
        document.dispatchEvent(new CustomEvent('coachAuthStateReady', { 
            detail: { coach: null, error: persistenceError } 
        }));
    }
};

// Avvia il gestore di autenticazione
authStateManager();
// MODIFICA: Ho rimosso la parentesi graffa '}' che era qui sotto e causava un errore di sintassi.