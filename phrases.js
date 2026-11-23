// Frasi del tabellone: c = categoria, h = indizio, t = soluzione.
// Sono frasi che tutti conoscono: il divertimento sta nel riconoscerle mentre escono le lettere.
// Accenti e apostrofi sono gestiti automaticamente. Ogni parola: massimo 14 caratteri.
window.PUZZLES = [
  // Frasi da mamma
  { c: 'Frasi da mamma', h: 'Appena arriva ottobre, prima di uscire di casa', t: 'METTITI LA MAGLIETTA DELLA SALUTE' },
  { c: 'Frasi da mamma', h: 'La risposta definitiva a ogni "ma perché?"', t: 'PERCHÉ LO DICO IO' },
  { c: 'Frasi da mamma', h: 'Quando giuri di aver cercato dappertutto', t: 'SE VENGO IO E LO TROVO' },
  { c: 'Frasi da mamma', h: 'Quando torni tardi e usi casa solo per dormire', t: 'QUESTA CASA NON È UN ALBERGO' },
  { c: 'Frasi da mamma', h: 'La profezia di ogni genitore', t: 'QUANDO AVRAI FIGLI CAPIRAI' },
  { c: 'Frasi da mamma', h: 'Hai lasciato la finestra aperta', t: "CHIUDI CHE C'È CORRENTE" },

  // Frasi da nonna
  { c: 'Frasi da nonna', h: 'Detto al terzo piatto di pasta', t: 'SEI DIMAGRITO MANGIA ANCORA' },
  { c: 'Frasi da nonna', h: 'Anche se fuori ci sono trenta gradi', t: 'PORTATI UN GOLFINO' },
  { c: 'Frasi da nonna', h: "L'inizio di ogni racconto sul passato", t: 'AI MIEI TEMPI ERA TUTTO DIVERSO' },
  { c: 'Frasi da nonna', h: 'La domanda che arriva a ogni pranzo di Natale', t: 'E LA FIDANZATINA?' },

  // Scuse classiche
  { c: 'Scuse classiche', h: 'A scuola, senza compiti fatti', t: 'IL CANE MI HA MANGIATO I COMPITI' },
  { c: 'Scuse classiche', h: 'Arrivi in ufficio con mezz\'ora di ritardo', t: "C'ERA UN TRAFFICO PAZZESCO" },
  { c: 'Scuse classiche', h: 'Perché non hai risposto per tutto il giorno?', t: 'MI SI È SCARICATO IL TELEFONO' },
  { c: 'Scuse classiche', h: 'Quando ti svegli alle dieci', t: 'NON HO SENTITO LA SVEGLIA' },
  { c: 'Scuse classiche', h: 'Quando ti chiama lui per primo', t: 'STAVO PROPRIO PER CHIAMARTI' },

  // Frasi da ufficio
  { c: 'Frasi da ufficio', h: 'In videochiamata, dopo due minuti di silenzio', t: 'SCUSATE AVEVO IL MICROFONO SPENTO' },
  { c: 'Frasi da ufficio', h: "Pensata da tutti dopo un'ora di riunione inutile", t: 'POTEVA ESSERE UNA MAIL' },
  { c: 'Frasi da ufficio', h: 'Il modo più elegante per passare il problema a un collega', t: 'TI GIRO LA MAIL' },
  { c: 'Frasi da ufficio', h: 'La domanda più frequente in videochiamata', t: 'MI SENTITE? MI VEDETE?' },
  { c: 'Frasi da ufficio', h: 'Il giorno più atteso della settimana', t: 'FINALMENTE È VENERDÌ' },

  // Buoni propositi
  { c: 'Buoni propositi', h: 'Promessa che si rinnova ogni domenica sera', t: 'DA LUNEDÌ INIZIO LA DIETA' },
  { c: 'Buoni propositi', h: 'Abbonamento pagato a gennaio, usato due volte', t: 'QUEST\'ANNO VADO IN PALESTRA' },
  { c: 'Buoni propositi', h: 'Il motto di chi rimanda sempre', t: 'LO FACCIO DOMANI' },
  { c: 'Buoni propositi', h: 'Il primo giorno di lavoro dopo le vacanze', t: 'MI SERVONO ALTRE FERIE' },

  // In viaggio
  { c: 'In viaggio', h: 'I bambini in macchina, ogni cinque minuti', t: 'QUANTO MANCA? SIAMO ARRIVATI?' },
  { c: 'In viaggio', h: 'Il navigatore quando sbagli strada', t: 'RICALCOLO PERCORSO' },
  { c: 'In viaggio', h: "Detta in spiaggia alle sette di sera", t: 'ANCORA UN ULTIMO BAGNO' },

  // Modi di dire
  { c: 'Modo di dire', h: 'Quando ti cade tutto di mano', t: 'AVERE LE MANI DI PASTAFROLLA' },
  { c: 'Modo di dire', h: 'Fuori sta diluviando', t: 'PIOVE A CATINELLE' },
  { c: 'Modo di dire', h: 'Si dice prima di un esame', t: 'IN BOCCA AL LUPO' },
  { c: 'Modo di dire', h: 'Far finta di non sapere niente', t: 'FARE LO GNORRI' },
  { c: 'Modo di dire', h: 'Non avere più un euro in tasca', t: 'ESSERE AL VERDE' },
  { c: 'Modo di dire', h: 'Essere di pessimo umore', t: 'AVERE UN DIAVOLO PER CAPELLO' },
  { c: 'Modo di dire', h: 'Disturbare in continuazione', t: 'ROMPERE LE SCATOLE' },

  // Classici di prima
  { c: 'Proverbio', h: 'Se resti a letto tutto il giorno, non concludi niente', t: 'CHI DORME NON PIGLIA PESCI' },
  { c: 'Proverbio', h: 'Non giudicare una persona da come si veste', t: "L'ABITO NON FA IL MONACO" },
  { c: 'Proverbio', h: 'Non sprecare i minuti: valgono soldi', t: 'IL TEMPO È DENARO' },
  { c: 'In cucina', h: 'Pomodoro, mozzarella e basilico: i colori della bandiera', t: 'PIZZA MARGHERITA' },
  { c: 'In cucina', h: 'Pasta romana con uova, guanciale e pecorino', t: 'SPAGHETTI ALLA CARBONARA' },
  { c: 'In cucina', h: 'Dolce con mascarpone, caffè e savoiardi', t: 'TIRAMISÙ' },
  { c: 'Luogo famoso', h: 'Monumento toscano famoso perché pende', t: 'LA TORRE DI PISA' },
  { c: 'Luogo famoso', h: 'Antico anfiteatro nel cuore di Roma', t: 'IL COLOSSEO' },
  { c: 'Oggetto', h: 'Sparisce sempre tra i cuscini del divano', t: 'TELECOMANDO' },
  { c: 'Oggetto', h: 'Quando lo cerchi non è mai nella presa giusta', t: 'CARICABATTERIE' },
];

// Freddure che il presentatore racconta (non si indovinano: si ascoltano!)
window.JOKES = [
  { q: 'Cosa fa una capra sotto una panca?', a: 'Crepa!' },
  { q: 'Qual è il colmo per un idraulico?', a: 'Non capire un tubo!' },
  { q: 'Qual è il colmo per un elettricista?', a: 'Non essere al corrente!' },
  { q: 'Qual è il colmo per un sarto?', a: 'Perdere il filo del discorso!' },
  { q: 'Qual è il colmo per un giardiniere?', a: 'Piantare in asso la fidanzata!' },
  { q: 'Perché il pomodoro non riesce a dormire?', a: "Perché l'insalata russa!" },
  { q: 'Cosa dice un muro a un altro muro?', a: "Ci vediamo all'angolo!" },
  { q: 'Cosa fa un gallo in chiesa?', a: 'Il chicchirichetto!' },
  { q: "Cosa fa un'ape in palestra?", a: 'Zumba!' },
  { q: 'Qual è il colmo per un matematico?', a: 'Avere i calcoli renali!' },
  { q: 'Qual è il colmo per un panettiere?', a: 'Avere una figlia di nome Rosetta!' },
  { q: 'Qual è il colmo per un dentista?', a: 'Avere il dente avvelenato!' },
  { q: 'Qual è il colmo per un meteorologo?', a: 'Avere la testa tra le nuvole!' },
  { q: 'Qual è il colmo per un ladro?', a: 'Rubare la scena!' },
  { q: 'Perché lo scheletro non fa bungee jumping?', a: 'Perché non ha fegato!' },
  { q: 'Cosa fa un pomodoro al semaforo?', a: 'Diventa rosso!' },
  { q: 'Qual è il colmo per un fotografo?', a: 'Non mettere a fuoco la situazione!' },
  { q: 'Perché i fantasmi non dicono bugie?', a: 'Perché si vede attraverso!' },
  { q: 'Qual è il colmo per un orologiaio?', a: 'Non avere mai un minuto libero!' },
  { q: 'Qual è il colmo per un pescatore?', a: "Abboccare all'amo della fidanzata!" },
];
