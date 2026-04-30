// File: auth-manager-coach.js
// Gestore di autenticazione centralizzato per l'app COACH.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

const firebaseConfig = {
    apiKey: "AIzaSyAQ_0F8KCks_4Wn2h2aTIepQY9VrIkWpUQ",
    authDomain: "database-atleti-fic.firebaseapp.com",
    databaseURL: "https://database-atleti-fic-default-rtdb.firebaseio.com",
    projectId: "database-atleti-fic",
    storageBucket: "database-atleti-fic.firebasestorage.app",
    messagingSenderId: "860422140545",
    appId: "1:860422140545:web:cd14c042a47f2650681380"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider('6LdySxgsAAAAAOPjpX_oQPGTAJoqxJTNe9758JE0'),
  isTokenAutoRefreshEnabled: true
});

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
    
    if (normalizedPath.endsWith('/index.html')) {
        return true;
    }
    
    const segments = normalizedPath.split('/').filter(Boolean); 
    if (segments.length === 1 && !segments[0].endsWith('.html')) {
        return true;
    }
    if (segments.length === 0) {
        return true;
    }

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

                // MODIFICA: Controlliamo anche che "vedeOlimpica" non sia undefined, 
                // così forziamo l'aggiornamento della cache per chi era già loggato
                if (!coach || coach.email !== user.email || !coach.societa || coach.vedeOlimpica === undefined || coach.vedeBeach === undefined) {
                    console.log("AuthManager: Dati coach mancanti o incompleti in cache. Recupero da Firestore...");
                    try {
                        const docRef = doc(db, "allenatori", user.uid);
                        const docSnap = await getDoc(docRef);

                        if (docSnap.exists()) {
                            const coachData = docSnap.data();
                            
                            // MODIFICA: Aggiunto vedeOlimpica all'oggetto salvato in cache
                            coach = {
                                id: docSnap.id,
                                nome: coachData.nome || '',
                                cognome: coachData.cognome || 'Coach',
                                societa: coachData.societa || '',
                                email: user.email,
                                // Se il campo non c'è nel database, per sicurezza mettiamo false
                                vedeOlimpica: coachData.vedeOlimpica === true,
                                vedeBeach: coachData.vedeBeach === true
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

                if (isLoginPage()) {
                    console.log("AuthManager: Utente loggato su pagina di login. Reindirizzo a coach_home.html...");
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

authStateManager();
