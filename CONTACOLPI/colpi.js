// --- File: CONTACOLPI/colpi.js ---
// Calcolo del ritmo di voga a partire dagli istanti dei tocchi.
// Nessun riferimento al DOM: la stessa logica dell'app mobile.

/** Su quanti colpi mediare. 1 risponde subito ma oscilla, 5 è il più stabile. */
export const BASI = [1, 3, 5];

/** Aggiunge l'istante di un tocco. Il primo è lo start: da lì ogni tocco chiude un colpo. */
export function registraTocco(tocchi, ora) {
    return [...tocchi, ora];
}

/** Colpi effettivamente contati (il primo tocco è solo la partenza). */
export function colpiContati(tocchi) {
    return Math.max(0, tocchi.length - 1);
}

/** Quanti tocchi mancano alla prima lettura con la base scelta. */
export function tocchiMancanti(tocchi, base) {
    return base + 1 - tocchi.length;
}

/**
 * Colpi al minuto sugli ultimi `base` colpi.
 * Ritorna null finché non ci sono abbastanza tocchi: meglio nessun numero
 * che un numero costruito su un solo intervallo e quindi inaffidabile.
 */
export function ritmo(tocchi, base) {
    if (tocchi.length < base + 1) return null;
    const ultimi = tocchi.slice(-(base + 1));
    const durata = ultimi[ultimi.length - 1] - ultimi[0];
    if (durata <= 0) return null;
    return (base * 60000) / durata;
}
