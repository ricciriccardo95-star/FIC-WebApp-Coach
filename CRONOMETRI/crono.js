// --- File: CRONOMETRI/crono.js ---
// Logica del cronometro, senza niente che tocchi il DOM: così è verificabile
// da sola ed è la stessa usata dall'app mobile.
//
// Una "marcia" non conta il tempo: registra quando è partita e quanto aveva
// già accumulato. Il tempo si ricava dall'orologio a ogni ridisegno. Un
// contatore incrementato da un setInterval accumulerebbe errore e si
// fermerebbe quando il browser mette in pausa la scheda in background.

/** Marcia ferma a zero. */
export const marciaFerma = () => ({ accumulato: 0, avviatoA: null });

/** Millisecondi totali trascorsi, considerando anche il tratto in corso. */
export function trascorso(m, ora) {
    return m.accumulato + (m.avviatoA !== null ? ora - m.avviatoA : 0);
}

export function avvia(m, ora) {
    return m.avviatoA !== null ? m : { ...m, avviatoA: ora };
}

export function pausa(m, ora) {
    return m.avviatoA === null ? m : { ...m, accumulato: trascorso(m, ora), avviatoA: null };
}

export function azzera(m) {
    return { ...m, accumulato: 0, avviatoA: null };
}

/** Aggiunge un giro. Si salvano i tempi TOTALI: i parziali si ricavano. */
export function registraGiro(m, giri, ora) {
    return [...giri, trascorso(m, ora)];
}

/**
 * Da una lista di tempi totali ricava, per ogni giro, lo split assoluto
 * (dalla partenza) e quello sul giro precedente.
 */
export function calcolaGiri(giri) {
    return giri.map((totale, i) => ({
        n: i + 1,
        totale,
        parziale: totale - (i > 0 ? giri[i - 1] : 0)
    }));
}

/** mm:ss.cc, con le ore davanti solo quando servono. */
export function formatCrono(ms) {
    const totCent = Math.floor(ms / 10);
    const cent    = totCent % 100;
    const totSec  = Math.floor(totCent / 100);
    const sec     = totSec % 60;
    const totMin  = Math.floor(totSec / 60);
    const min     = totMin % 60;
    const ore     = Math.floor(totMin / 60);
    const due     = (n) => String(n).padStart(2, '0');
    return (ore > 0 ? `${ore}:${due(min)}` : `${min}`) + `:${due(sec)}.${due(cent)}`;
}
