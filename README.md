# 🎡 Gira la Frase

Un gioco di parole a ruota per browser: **gira la ruota, indovina le lettere, risolvi la frase**.
Scritto in **HTML, CSS e JavaScript vanilla**: niente framework, niente build e nessuna dipendenza (a parte i font di Google).

## Caratteristiche

- **Ruota disegnata su Canvas** con rotazione ease-out, ticchettio sincronizzato a ogni settore e freccia che "rimbalza".
- **Tabellone animato** con caselle che si accendono e si girano; le parole vanno a capo intere.
- **Fino a 3 giocatori**, ognuno umano o **CPU** con 3 livelli di difficoltà.
- **Regole complete**: valore × occorrenze, vocali a 250 €, Bancarotta, Passa, bonus soluzione, 3 round.
- **Audio sintetizzato con Web Audio API**: nessun file audio, si può silenziare.
- **Coriandoli** su canvas e animazioni CSS.
- **Classifica locale** dei migliori punteggi (localStorage).
- **Giocabile da tastiera**: `Spazio` gira, `A–Z` sceglie la lettera, `Invio` apre "Risolvi".
- **Responsive**, da desktop a smartphone.
- Gestione di **accenti e apostrofi** (es. `CAFFÈ`, `L'ABITO`): nella soluzione si può scrivere anche senza accenti.

## Avvio

Apri `index.html` nel browser, oppure servi la cartella:

```bash
python -m http.server 5173
# poi vai su http://localhost:5173
```

## Pubblicazione su GitHub Pages

1. Crea un repository e carica i file.
2. *Settings → Pages → Deploy from branch → `main` / root*.
3. Il gioco sarà online su `https://<utente>.github.io/<repo>/`.

## Struttura

| File | Contenuto |
|------|-----------|
| `index.html` | Struttura, modali (setup, risolvi, fine round) |
| `style.css` | Tema, layout responsive, animazioni |
| `game.js` | Macchina a stati del gioco, ruota, IA della CPU, audio, coriandoli |
| `phrases.js` | Archivio delle frasi per categoria: aggiungine quante vuoi |

## Note tecniche

- Il turno è gestito da una piccola **macchina a stati** (`turn → spinning → consonant/vowel → revealing → …`) che abilita e disabilita i comandi.
- Ogni timer è legato a un contatore di "generazione" della partita: se ricominci a metà animazione, i callback della partita vecchia vengono ignorati.
- La **CPU** sceglie le lettere per frequenza nella lingua italiana. Con una probabilità che dipende dalla difficoltà "intuisce" una lettera presente, e prova a risolvere quando gran parte della frase è scoperta.
- Il settore vincente si calcola dall'angolo finale: `floor(((3π/2 − rotazione) mod 2π) / ampiezzaSettore)`.
