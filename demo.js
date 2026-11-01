/* Jeu de données d'EXEMPLE entièrement FICTIF (marques, références, garages et prix inventés).
   Effaçable depuis Réglages > « Effacer les données d'exemple ». */
window.DEMO_DATA = (function () {
  const p = (id, ref, name, brand, cat, publicPrice, price, unit) =>
    ({ id, ref, name, brand, cat, publicPrice, price, unit, demo: true });
  const products = [
    p('dp1', 'DEMO-BAT-60', 'Batterie 12V 60Ah 540A', 'VoltaDémo', 'batterie', 129.0, 89.5, 'pièce'),
    p('dp2', 'DEMO-BAT-74', 'Batterie 12V 74Ah 680A', 'VoltaDémo', 'batterie', 159.0, 109.0, 'pièce'),
    p('dp3', 'DEMO-BAT-95S', 'Batterie Start&Stop AGM 95Ah', 'VoltaDémo', 'batterie', 259.0, 182.0, 'pièce'),
    p('dp4', 'DEMO-PLQ-AV1', 'Plaquettes de frein avant', 'FreinFictif', 'freinage', 54.9, 31.2, 'jeu (4)'),
    p('dp5', 'DEMO-PLQ-AR1', 'Plaquettes de frein arrière', 'FreinFictif', 'freinage', 46.9, 26.5, 'jeu (4)'),
    p('dp6', 'DEMO-DSQ-280', 'Disques de frein ventilés Ø280', 'FreinFictif', 'freinage', 98.0, 58.0, 'paire'),
    p('dp7', 'DEMO-DSQ-256', 'Disques de frein pleins Ø256', 'FreinFictif', 'freinage', 76.0, 44.9, 'paire'),
    p('dp8', 'DEMO-LDF-1L', 'Liquide de frein DOT 4 – 1 L', 'FreinFictif', 'freinage', 14.5, 7.9, 'bidon 1 L'),
    p('dp9', 'DEMO-ADB-10', 'AdBlue 10 L avec bec verseur', 'BleuTest', 'adblue', 19.9, 9.8, 'bidon 10 L'),
    p('dp10', 'DEMO-ADB-20', 'AdBlue 20 L', 'BleuTest', 'adblue', 32.0, 15.9, 'bidon 20 L'),
    p('dp11', 'DEMO-PN-2055516', 'Pneu été 205/55 R16 91V', 'RouleExemple', 'pneus', 95.0, 62.0, 'pièce'),
    p('dp12', 'DEMO-PN-1956515', 'Pneu 4 saisons 195/65 R15 91H', 'RouleExemple', 'pneus', 89.0, 57.5, 'pièce'),
    p('dp13', 'DEMO-ESS-AV', 'Balais d\'essuie-glace avant 600/400', 'ExempleParts', 'autre', 29.9, 14.9, 'paire'),
    p('dp14', 'DEMO-HUI-5L', 'Huile moteur 5W30 – 5 L', 'ExempleParts', 'autre', 49.0, 27.0, 'bidon 5 L')
  ];
  const c = (id, name, contact, phone, email, city, discount) =>
    ({ id, name, contact, phone, email, city, discount, notes: 'Client fictif de démonstration', demo: true });
  const clients = [
    c('dc1', 'Garage Démo du Plateau (fictif)', 'M. Jean Exemple', '06 00 00 00 01', 'garage.demo@example.com', 'Foix', 5),
    c('dc2', 'Auto Test Services (fictif)', 'Mme Claire Essai', '06 00 00 00 02', 'contact@example.org', 'Saverdun', 8),
    c('dc3', 'Carrosserie Fictive Martin', 'M. Paul Fictif', '06 00 00 00 03', 'atelier@example.net', 'Mirepoix', 0)
  ];
  const l = (pr, qty, discount) => ({
    productId: pr.id, ref: pr.ref, name: pr.name, brand: pr.brand, unit: pr.unit,
    publicPrice: pr.publicPrice, price: pr.price, qty, discount: discount || 0
  });
  const P = Object.fromEntries(products.map(x => [x.id, x]));
  const templates = [
    { id: 'dt1', name: 'Pack freinage', demo: true, globalDiscount: 0, franco: 'Franco de port', delivery: 'Sous 24 h',
      message: 'Pack freinage complet avant : plaquettes + disques + liquide.',
      lines: [l(P.dp4, 2), l(P.dp6, 2), l(P.dp8, 2)] },
    { id: 'dt2', name: 'AdBlue x20', demo: true, globalDiscount: 0, franco: 'Franco de port', delivery: 'Sous 48 h',
      message: 'Tarif spécial par lot de 20 bidons.',
      lines: [l(P.dp9, 20, 5)] }
  ];
  const today = new Date();
  const iso = d => d.toISOString().slice(0, 10);
  const past = new Date(today.getTime() - 12 * 864e5);
  const offers = [
    { id: 'do1', number: 'DEMO-0001', clientId: 'dc1', date: iso(past), validityDays: 30,
      franco: 'Franco de port', delivery: 'Sous 24 h', message: 'Merci pour votre accueil, voici l\'offre évoquée.',
      globalDiscount: 5, status: 'envoyée', sentAt: past.toISOString(), demo: true,
      createdAt: past.toISOString(), updatedAt: past.toISOString(),
      lines: [l(P.dp1, 3), l(P.dp9, 20, 5), l(P.dp4, 2)] }
  ];
  return { products, clients, templates, offers };
})();
