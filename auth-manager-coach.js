// File: auth-manager-coach.js
// Gestore di autenticazione centralizzato per l'app COACH.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

const firebaseConfig = {
    apiKey: "AIzaSyAQ_0F8KCks_4Wn2h2aTIepQY9VrIkWpUQ",
    authDomain: "database-atleti-fic.firebaseapp.com",
    databaseURL: "https://database-atleti-fic-default-rtdb.firebaseio.com",
    projectId: "database-atleti-fic",
    storageBucket: "database-atleti-fic.firebasestorage.app",
    messagingSenderId: "860422140545",
    appId: "1:860422140545:web:cd14c042a47f2650681380"
};

// 1. Inizializza l'App
export const app = initializeApp(firebaseConfig);

// 2. *** IMPORTANTE: INIZIALIZZA APP CHECK SUBITO QUI, PRIMA DI AUTH E DB ***
try {
    const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider('6LeQ7wwsAAAAAHXKqRPOR70fWD_NfWFO03pwkZvY'),
        isTokenAutoRefreshEnabled: true
    });
    console.log("AuthManager Coach: App Check inizializzato (V3).");
} catch (e) {
    console.warn("AuthManager Coach: Errore init App Check:", e);
}

// 3. ORA inizializza Auth e Firestore
export const auth = getAuth(app);
export const db = getFirestore(app);

const CACHE_KEY = 'currentCoach';

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

window.appLogout = () => {
    console.log("AuthManager: Esecuzione di appLogout()...");
    signOut(auth).catch((error) => {
        console.error('AuthManager: Logout Error', error);
    });
};

const isLoginPage = () => {
    const path = window.location.pathname;
    const normalizedPath = path.toLowerCase();
    if (normalizedPath.endsWith('/index.html')) return true;
    const segments = normalizedPath.split('/').filter(Boolean);
    if (segments.length === 1 && !segments[0].endsWith('.html')) return true;
    if (segments.length === 0) return true;
    return false;
};

const authStateManager = async () => {
    console.log("AuthManager: Avviato.");
    try {
        await setPersistence(auth, browserLocalPersistence);

        onAuthStateChanged(auth, async (user) => {
            let coach = null;
            let error = null;

            if (user && user.email) {
                console.log("AuthManager: Utente LOGGATO rilevato.", user.email);
                coach = window.getCurrentCoach();

                if (!coach || coach.email !== user.email) {
                    console.log("AuthManager: Dati coach non in cache. Recupero da Firestore...");
                    try {
                        const docRef = doc(db, "allenatori", user.uid);
                        const docSnap = await getDoc(docRef);

                        if (docSnap.exists()) {
                            const coachData = docSnap.data();
                            coach = {
                                id: docSnap.id,
                                cognome: coachData.cognome || 'Coach',
                                email: user.email
                            };
                            localStorage.setItem(CACHE_KEY, JSON.stringify(coach));
                            console.log("AuthManager: Dati coach recuperati e salvati in cache:", coach);
                        } else {
                            console.error("AuthManager: Utente non trovato in 'allenatori'. Logout.");
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

                if (isLoginPage()) {
                    console.log("AuthManager: Redirect a coach_home.html...");
                    window.location.href = 'coach_home.html';
                    return;
                }
                
                console.log("AuthManager: Invio evento 'coachAuthStateReady' (LOGGATO)");
                document.dispatchEvent(new CustomEvent('coachAuthStateReady', {
                    detail: { coach: coach, error: null }
                }));

            } else {
                console.log("AuthManager: Utente NON LOGGATO rilevato.");
                localStorage.removeItem(CACHE_KEY);

                if (!isLoginPage()) {
                    console.log("AuthManager: Redirect a index.html...");
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
                
                console.log("AuthManager: Invio evento 'coachAuthStateReady' (SLOGGATO)");
                document.dispatchEvent(new CustomEvent('coachAuthStateReady', {
                    detail: { coach: null, error: error }
                }));
            }
        });

    } catch (persistenceError) {
        console.error("AuthManager: Errore persistenza:", persistenceError);
        document.dispatchEvent(new CustomEvent('coachAuthStateReady', { 
            detail: { coach: null, error: persistenceError } 
        }));
    }
};

authStateManager();
