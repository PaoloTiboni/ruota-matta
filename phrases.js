// Archivio frasi: c = categoria, h = indizio mostrato sotto il tabellone, t = soluzione.
// Accenti e apostrofi sono gestiti automaticamente. Ogni parola: massimo 14 caratteri.
window.PUZZLES = [
  // Proverbi famosi
  { c: 'Proverbio', h: 'Se resti a letto tutto il giorno, non concludi niente', t: 'CHI DORME NON PIGLIA PESCI' },
  { c: 'Proverbio', h: 'Arrivare in ritardo è comunque meglio che non arrivare', t: 'MEGLIO TARDI CHE MAI' },
  { c: 'Proverbio', h: "Non giudicare una persona da come si veste", t: "L'ABITO NON FA IL MONACO" },
  { c: 'Proverbio', h: "Un vero amico vale più dell'oro", t: 'CHI TROVA UN AMICO TROVA UN TESORO' },
  { c: 'Proverbio', h: 'Non sprecare i minuti: valgono soldi', t: 'IL TEMPO È DENARO' },
  { c: 'Proverbio', h: 'Senza fretta si arriva più lontano', t: 'CHI VA PIANO VA SANO E VA LONTANO' },
  { c: 'Proverbio', h: 'Le previsioni del meteo dei nonni, guardando il tramonto', t: 'ROSSO DI SERA BEL TEMPO SI SPERA' },
  { c: 'Proverbio', h: 'Un frutto al giorno per stare in salute', t: 'UNA MELA AL GIORNO TOGLIE IL MEDICO DI TORNO' },
  { c: 'Proverbio', h: 'Ogni cosa bella ha anche il suo lato pungente', t: "NON C'È ROSA SENZA SPINE" },
  { c: 'Proverbio', h: 'Insieme si è più forti', t: "L'UNIONE FA LA FORZA" },

  // Cibo
  { c: 'In cucina', h: 'Pomodoro, mozzarella e basilico: i colori della bandiera', t: 'PIZZA MARGHERITA' },
  { c: 'In cucina', h: 'Pasta romana con uova, guanciale e pecorino', t: 'SPAGHETTI ALLA CARBONARA' },
  { c: 'In cucina', h: 'Strati di pasta, ragù e besciamella', t: 'LASAGNE AL FORNO' },
  { c: 'In cucina', h: 'Dolce freddo al gusto più amato dai golosi', t: 'GELATO AL CIOCCOLATO' },
  { c: 'In cucina', h: 'Dolce con mascarpone, caffè e savoiardi', t: 'TIRAMISÙ' },
  { c: 'In cucina', h: 'Si beve al bancone in un sorso', t: 'CAFFÈ ESPRESSO' },
  { c: 'In cucina', h: 'La colazione classica al bar', t: 'CORNETTO E CAPPUCCINO' },
  { c: 'In cucina', h: 'Piatto giallo tipico di Milano', t: 'RISOTTO ALLO ZAFFERANO' },

  // Luoghi
  { c: 'Luogo famoso', h: 'Monumento toscano famoso perché pende', t: 'LA TORRE DI PISA' },
  { c: 'Luogo famoso', h: 'Antico anfiteatro nel cuore di Roma', t: 'IL COLOSSEO' },
  { c: 'Luogo famoso', h: 'La piazza più famosa di Venezia', t: 'PIAZZA SAN MARCO' },
  { c: 'Luogo famoso', h: "Il lago più grande d'Italia", t: 'IL LAGO DI GARDA' },
  { c: 'Luogo famoso', h: 'Il vulcano che guarda Napoli', t: 'IL VESUVIO' },
  { c: 'Luogo famoso', h: 'Montagne rosa al tramonto tra Veneto e Trentino', t: 'LE DOLOMITI' },

  // Oggetti
  { c: 'Oggetto', h: 'Lo usi in bagno mattina e sera', t: 'SPAZZOLINO DA DENTI' },
  { c: 'Oggetto', h: 'Ti salva quando piove', t: 'OMBRELLO' },
  { c: 'Oggetto', h: 'Sparisce sempre tra i cuscini del divano', t: 'TELECOMANDO' },
  { c: 'Oggetto', h: "Si indossano d'estate quando c'è troppa luce", t: 'OCCHIALI DA SOLE' },
  { c: 'Oggetto', h: 'Caffettiera che borbotta sul fuoco', t: 'MOKA DEL CAFFÈ' },
  { c: 'Oggetto', h: 'Senza di lui il telefono si spegne', t: 'CARICABATTERIE' },
  { c: 'Oggetto', h: 'Lo porti sulle spalle con libri e quaderni', t: 'ZAINO DI SCUOLA' },

  // Azioni
  { c: 'Cosa si fa', h: "In spiaggia, sdraiati sull'asciugamano", t: 'PRENDERE IL SOLE' },
  { c: 'Cosa si fa', h: 'Due ruote, due pedali e via!', t: 'ANDARE IN BICICLETTA' },
  { c: 'Cosa si fa', h: 'Al supermercato, con il carrello', t: 'FARE LA SPESA' },
  { c: 'Cosa si fa', h: 'Divano, popcorn e luci spente', t: 'GUARDARE UN FILM' },
  { c: 'Cosa si fa', h: 'Camminare senza fretta, magari al parco', t: 'FARE UNA PASSEGGIATA' },
  { c: 'Cosa si fa', h: 'Dopo cena, con spugna e detersivo', t: 'LAVARE I PIATTI' },

  // Animali
  { c: 'Animale', h: 'Ha il collo lunghissimo', t: 'LA GIRAFFA' },
  { c: 'Animale', h: 'Uccello che non vola e vive tra i ghiacci', t: 'IL PINGUINO' },
  { c: 'Animale', h: 'Grande, grigio e con la proboscide', t: "L'ELEFANTE" },
  { c: 'Animale', h: 'Due animali di casa che non vanno d\'accordo', t: 'CANE E GATTO' },

  // Sport
  { c: 'Sport', h: 'Si tira dagli undici metri', t: 'CALCIO DI RIGORE' },
  { c: 'Sport', h: 'Sport con canestro e pallone arancione', t: 'PALLACANESTRO' },
  { c: 'Sport', h: 'Corsa ciclistica in cui chi vince indossa la maglia rosa', t: "IL GIRO D'ITALIA" },

  // Tecnologia
  { c: 'Tecnologia', h: 'Macchine che imparano a ragionare', t: 'INTELLIGENZA ARTIFICIALE' },
  { c: 'Tecnologia', h: 'Lo hai quasi sempre in tasca', t: 'TELEFONO CELLULARE' },
  { c: 'Tecnologia', h: 'In inglese si chiama email', t: 'POSTA ELETTRONICA' },
];
