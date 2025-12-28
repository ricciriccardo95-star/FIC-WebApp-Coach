// File: auth-manager-coach.js
// Gestore di autenticazione centralizzato per l'app COACH.
// AGGIUNTO: Recupero del campo 'societa' da Firestore.
// MODIFICATO: Aggiornato a reCAPTCHA Enterprise.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// *** 1. MODIFICATO IMPORT PER APP CHECK ENTERPRISE ***
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

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

// *** 2. INIZIALIZZA APP CHECK (VERSIONE ENTERPRISE) ***
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider('6LdySxgsAAAAAOPjpX_oQPGTAJoqxJTNe9758JE0'),
  isTokenAutoRefreshEnabled: true
});


const CACHE_KEY = 'currentCoach';

/**
 * Funzione globale per ottenere i dati del coach dalla cache (localStorage).
 * @returns {Object | null} I dati del coach (id, cognome, email, societa) o null.
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
    const segments = normalizedPath.split('/').filter(Boolean); 
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

                // Controlliamo se in cache ci sono tutti i dati necessari (inclusa societa)
                if (!coach || coach.email !== user.email || !coach.societa) {
                    console.log("AuthManager: Dati coach mancanti o incompleti in cache. Recupero da Firestore...");
                    try {
                        // Cerca nella collezione 'allenatori' usando l'UID
                        const docRef = doc(db, "allenatori", user.uid);
                        const docSnap = await getDoc(docRef);

                        if (docSnap.exists()) {
                            const coachData = docSnap.data();
                            
                            // Costruisce l'oggetto coach con i campi richiesti
                            coach = {
                                id: docSnap.id,
                                nome: coachData.nome || '',         // Aggiunto per completezza
                                cognome: coachData.cognome || 'Coach', 
                                societa: coachData.societa || '',   // AGGIUNTO: Campo societa
                                email: user.email
                            };
                            
                            localStorage.setItem(CACHE_KEY, JSON.stringify(coach));
                            console.log("AuthManager: Dati coach recuperati e salvati in cache:", coach);
                        } else {
                            console.error("AuthManager: Utente autenticato ma non trovato nel database 'allenatori'. Eseguo logout.");
                            error = new Error("Accesso non autorizzato per allenatori.");
                            await window.appLogout(); 
                            return; 
                        }
                    } catch (dbError) {
                        console.error("AuthManager: Errore recupero dati da Firestore:", dbError);
                        error = dbError;
                        localStorage.removeItem(CACHE_KEY);
                        await window.appLogout(); 
                        return; 
                    }
                }

                // Reindirizzamento DOPO aver gestito i dati
                if (isLoginPage()) {
                    console.log("AuthManager: Utente loggato su pagina di login. Reindirizzo a coach_home.html...");
                    window.location.href = 'coach_home.html';
                    return; 
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
                    
                    const path = window.location.pathname;
                    const segments = path.split('/').filter(Boolean);
                    const appRootSegment = 'web app coach'; 
                    
                    if (segments.length > 1 && segments[0].toLowerCase() === appRootSegment && segments[segments.length - 1].endsWith('.html')) {
                         let relativePath = '';
                         if (segments.length > 2) {
                            relativePath = '../'.repeat(segments.length - 2); 
                         }
                         window.location.href = relativePath + 'index.html'; 
                    } else {
                         window.location.href = 'index.html';
                    }
                    return;
                }
                
                // Invia l'evento sulla pagina di login 
                console.log("AuthManager: Invio evento 'coachAuthStateReady' (SLOGGATO)");
                document.dispatchEvent(new CustomEvent('coachAuthStateReady', {
                    detail: { coach: null, error: error } 
                }));
            }
        });

    } catch (persistenceError) {
        console.error("AuthManager: Errore nell'impostare la persistenza:", persistenceError);
        document.dispatchEvent(new CustomEvent('coachAuthStateReady', { 
            detail: { coach: null, error: persistenceError } 
        }));
    }
};

// Avvia il gestore di autenticazione
authStateManager();
