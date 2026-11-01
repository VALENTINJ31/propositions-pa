/* Génération du PDF de proposition (jsPDF + autotable). Utilise les utilitaires d'app.js (money, num, fmtDate, calc…). */
window.buildOfferPdf = function (offer, client, S) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 14;
  const C = { primary: [31, 58, 95], ink: [24, 33, 45], muted: [93, 107, 124], line: [221, 227, 234], ok: [43, 138, 62], okbg: [230, 244, 234], soft: [243, 245, 248] };
  const t = calc(offer, S);
  const co = S.company || {}, se = S.seller || {};
  const clean = s => String(s == null ? '' : s).replace(/[  ]/g, ' ').replace(/[−–—]/g, '-').replace(/[‘’]/g, "'");
  const txt = (s, x, y, o) => doc.text(clean(s), x, y, o);

  // Bandeau supérieur
  doc.setFillColor(...C.primary); doc.rect(0, 0, W, 4, 'F');
  let y = 12, logoBottom = y;
  if (S.logo) {
    try {
      const p = doc.getImageProperties(S.logo);
      let w = 50, h = w * p.height / p.width;
      if (h > 24) { h = 24; w = h * p.width / p.height; }
      doc.addImage(S.logo, p.fileType || 'PNG', M, y, w, h);
      logoBottom = y + h;
    } catch (e) { console.warn('logo', e); }
  }
  // Coordonnées entreprise
  let cy = S.logo ? logoBottom + 5 : y + 4;
  doc.setTextColor(...C.ink); doc.setFont('helvetica', 'bold'); doc.setFontSize(S.logo ? 11 : 16);
  txt(co.name || 'Pamiers Automobiles', M, cy); cy += S.logo ? 4.6 : 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.muted);
  const coLines = [co.address, [co.zip, co.city].filter(Boolean).join(' '),
    [co.phone && 'Tél. ' + co.phone, co.email].filter(Boolean).join(' · '), co.web].filter(Boolean);
  coLines.forEach(s => { txt(s, M, cy); cy += 3.9; });

  // Titre à droite
  doc.setTextColor(...C.primary); doc.setFont('helvetica', 'bold'); doc.setFontSize(17);
  txt('PROPOSITION COMMERCIALE', W - M, 17, { align: 'right' });
  doc.setFontSize(9.5); doc.setTextColor(...C.ink); doc.setFont('helvetica', 'normal');
  txt('N° ' + (offer.number || ''), W - M, 23.5, { align: 'right' });
  txt('Date : ' + fmtDate(offer.date), W - M, 28.5, { align: 'right' });
  txt("Valable jusqu'au : " + fmtDate(validUntil(offer)), W - M, 33.5, { align: 'right' });

  // Bloc client + interlocuteur
  y = Math.max(cy, 40) + 4;
  const bw = (W - 2 * M - 6) / 2, bh = 30;
  doc.setDrawColor(...C.line); doc.setFillColor(...C.soft);
  doc.roundedRect(M, y, bw, bh, 2, 2, 'F');
  doc.roundedRect(M + bw + 6, y, bw, bh, 2, 2, 'S');
  const block = (x, title, lines) => {
    let yy = y + 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...C.muted);
    txt(title.toUpperCase(), x + 4, yy); yy += 5;
    lines.forEach((s, i) => {
      if (!s) return;
      doc.setFont('helvetica', i === 0 ? 'bold' : 'normal'); doc.setFontSize(i === 0 ? 10.5 : 9); doc.setTextColor(...C.ink);
      const parts = doc.splitTextToSize(clean(s), bw - 8);
      doc.text(parts[0], x + 4, yy); yy += i === 0 ? 5 : 4.2;
    });
  };
  const cl = client || {};
  block(M, 'Client', [cl.name || '—', cl.contact, cl.city, [cl.phone, cl.email].filter(Boolean).join(' · ')]);
  block(M + bw + 6, 'Votre interlocuteur', [se.name || '', se.title, se.phone && 'Tél. ' + se.phone, se.email]);
  y += bh + 7;

  // Tableau des lignes
  const anyDisc = offer.lines.some(l => +l.discount);
  const anyPublic = offer.lines.some(l => +l.publicPrice);
  const head = ['Réf.', 'Désignation', 'Cond.', 'Qté'];
  if (anyPublic) head.push('Prix public HT');
  head.push('PU HT'); if (anyDisc) head.push('Remise');
  head.push('PU net HT', 'Total HT');
  const body = t.lines.map(l => {
    const r = [clean(l.ref || ''), clean(l.name + (l.brand ? ' – ' + l.brand : '')), clean(l.unit || ''), num(l.qty, 0)];
    if (anyPublic) r.push(l.publicPrice ? money(l.publicPrice) : '');
    r.push(money(l.price)); if (anyDisc) r.push(l.discount ? pct(l.discount) : '');
    r.push(money(l.net), money(l.total));
    return r.map(clean);
  });
  const rightCols = {}; for (let i = 3; i < head.length; i++) rightCols[i] = { halign: 'right', cellWidth: 'wrap' };
  rightCols[1] = { cellWidth: 'auto' }; rightCols[0] = { cellWidth: 26 }; rightCols[2] = { cellWidth: 18 };
  doc.autoTable({
    startY: y, head: [head.map(clean)], body, margin: { left: M, right: M, bottom: 24 },
    styles: { font: 'helvetica', fontSize: 8.4, cellPadding: 1.8, textColor: C.ink, lineColor: C.line, lineWidth: 0.1, overflow: 'linebreak' },
    headStyles: { fillColor: C.primary, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: rightCols,
    didParseCell: d => { if (d.section === 'head' && d.column.index >= 3) d.cell.styles.halign = 'right'; },
    didDrawPage: () => drawFooter()
  });
  y = doc.lastAutoTable.finalY + 6;

  // Totaux
  const need = 60;
  if (y + need > 297 - 26) { doc.addPage(); drawFooter(); y = 20; }
  const tx = W - M - 78, tw = 78;
  const rows = [['Sous-total HT', money(t.subtotal)]];
  if (t.globalDiscount) rows.push(['Remise globale ' + pct(offer.globalDiscount), '- ' + money(t.globalDiscount)]);
  rows.push(['Total HT', money(t.totalHT)], ['TVA ' + pct(S.vat), money(t.vat)]);
  doc.setFontSize(9.5);
  rows.forEach(([a, b]) => {
    doc.setFont('helvetica', a === 'Total HT' ? 'bold' : 'normal'); doc.setTextColor(...C.ink);
    txt(a, tx, y); txt(b, tx + tw, y, { align: 'right' }); y += 5.4;
  });
  doc.setFillColor(...C.primary); doc.roundedRect(tx - 3, y - 4, tw + 6, 9, 1.5, 1.5, 'F');
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5);
  txt('Total TTC', tx, y + 2); txt(money(t.totalTTC), tx + tw, y + 2, { align: 'right' });
  let ly = doc.lastAutoTable.finalY + 6;
  y += 10;

  // Économie (colonne gauche)
  const lw = tx - M - 10;
  if (t.saving > 0.005) {
    doc.setFillColor(...C.okbg); doc.roundedRect(M, ly - 4.5, lw, 15, 2, 2, 'F');
    doc.setTextColor(...C.ok); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
    txt('Votre économie : ' + money(t.saving) + ' HT', M + 4, ly + 1.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    txt('soit ' + pct(t.savingPct) + ' par rapport au prix public (' + money(t.publicTotal) + ' HT)', M + 4, ly + 6.5);
    ly += 17;
  }
  // Conditions
  const cond = [];
  if (offer.franco) cond.push(['Port', offer.franco]);
  if (offer.delivery) cond.push(['Délai de livraison', offer.delivery]);
  cond.push(["Validité de l'offre", (offer.validityDays || 0) + ' jours, jusqu\'au ' + fmtDate(validUntil(offer))]);
  doc.setFontSize(8.8);
  ly += 1;
  doc.setTextColor(...C.muted); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); txt('CONDITIONS', M, ly); ly += 4.5;
  cond.forEach(([a, b]) => {
    doc.setFontSize(8.8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.ink); txt(a + ' : ', M, ly);
    const aw = doc.getTextWidth(clean(a + ' : '));
    doc.setFont('helvetica', 'normal');
    const parts = doc.splitTextToSize(clean(b), lw - aw);
    doc.text(parts, M + aw, ly); ly += 4.4 * parts.length;
  });
  y = Math.max(y, ly) + 4;

  // Message
  if (offer.message && offer.message.trim()) {
    const parts = doc.splitTextToSize(clean(offer.message.trim()), W - 2 * M - 8);
    const h = parts.length * 4.3 + 7;
    if (y + h > 297 - 26) { doc.addPage(); drawFooter(); y = 20; }
    doc.setDrawColor(...C.primary); doc.setLineWidth(0.6); doc.line(M, y, M, y + h - 2); doc.setLineWidth(0.2);
    doc.setTextColor(...C.ink); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.2);
    doc.text(parts, M + 4, y + 4); y += h + 2;
  }
  // Signature
  if (se.name) {
    if (y + 12 > 297 - 26) { doc.addPage(); drawFooter(); y = 20; }
    doc.setFontSize(9.2); doc.setTextColor(...C.ink); doc.setFont('helvetica', 'normal');
    txt('Bien cordialement,', M, y + 3);
    doc.setFont('helvetica', 'bold'); txt(se.name + (se.title ? ' – ' + se.title : ''), M, y + 8);
  }

  // Pagination
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(...C.muted); doc.setFont('helvetica', 'normal');
    txt('Page ' + i + '/' + n, W - M, 297 - 6, { align: 'right' });
  }
  return doc;

  function drawFooter() {
    const fy = 297 - 19;
    doc.setDrawColor(...C.line); doc.setLineWidth(0.2); doc.line(M, fy, W - M, fy);
    doc.setFontSize(7); doc.setTextColor(...C.muted); doc.setFont('helvetica', 'normal');
    const legal = [S.legal, [co.name, co.siret && 'SIRET ' + co.siret, co.vatNumber && 'TVA ' + co.vatNumber].filter(Boolean).join(' · ')]
      .filter(Boolean).join('\n');
    const parts = doc.splitTextToSize(clean(legal), W - 2 * M - 20).slice(0, 4);
    doc.text(parts, M, fy + 3.6);
  }
};
