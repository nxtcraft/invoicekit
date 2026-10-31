let items = [];

function getCur() { return document.getElementById('currency').value; }

function addItem(desc='', qty=1, rate=0) {
  const id = Date.now() + Math.random();
  items.push({ id, desc, qty, rate });
  renderItems();
}

function removeItem(id) {
  items = items.filter(i => i.id !== id);
  renderItems();
}

function renderItems() {
  const list = document.getElementById('items-list');
  list.innerHTML = items.map(item => `
    <div class="item-row" data-id="${item.id}">
      <input type="text" placeholder="Web design, consulting, etc." value="${escHtml(item.desc)}"
        oninput="updateItem(${item.id},'desc',this.value)" />
      <input type="number" min="0" step="0.01" value="${item.qty}"
        oninput="updateItem(${item.id},'qty',+this.value)" />
      <input type="number" min="0" step="0.01" value="${item.rate}"
        oninput="updateItem(${item.id},'rate',+this.value)" />
      <div class="item-total">${getCur()}${((item.qty||0)*(item.rate||0)).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      <button class="del-btn" onclick="removeItem(${item.id})">×</button>
    </div>
  `).join('');
  calcTotals();
}

function updateItem(id, field, val) {
  const item = items.find(i => i.id === id);
  if (item) { item[field] = val; calcTotals(); renderItemTotal(id); autosave(); }
}

function renderItemTotal(id) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  const row = document.querySelector(`[data-id="${id}"] .item-total`);
  if (row) row.textContent = getCur() + ((item.qty||0)*(item.rate||0)).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
}

function calcTotals() {
  const cur = getCur();
  const subtotal = items.reduce((s, i) => s + (i.qty||0)*(i.rate||0), 0);
  const taxPct = parseFloat(document.getElementById('tax_pct').value)||0;
  const discount = parseFloat(document.getElementById('discount').value)||0;
  const tax = subtotal * taxPct / 100;
  const total = subtotal + tax - discount;
  const fmt = n => cur + n.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
  document.getElementById('t_subtotal').textContent = fmt(subtotal);
  document.getElementById('t_tax').textContent = fmt(tax);
  document.getElementById('t_discount').textContent = discount > 0 ? '-' + fmt(discount) : fmt(0);
  document.getElementById('t_total').textContent = fmt(total);
}

function syncPreview() { autosave(); }

// ── PERSISTENCE ──
function autosave() {
  try {
    const d = {
      biz: { name: v('biz_name'), email: v('biz_email'), phone: v('biz_phone'), gstin: v('biz_gstin'), address: v('biz_address') },
      client: { name: v('client_name'), email: v('client_email'), address: v('client_address'), gstin: v('client_gstin') },
      inv: { number: v('inv_number'), date: v('inv_date'), due: v('due_date') },
      currency: v('currency'), tax_pct: v('tax_pct'), discount: v('discount'),
      notes: v('notes'), items
    };
    localStorage.setItem('ik_draft', JSON.stringify(d));
    showSaved();
  } catch(e) {}
}

function v(id) { const el = document.getElementById(id); return el ? el.value : ''; }

let _saveTimer;
function showSaved() {
  clearTimeout(_saveTimer);
  const el = document.getElementById('ik-saved');
  if (!el) return;
  el.style.opacity = '1';
  _saveTimer = setTimeout(() => { el.style.opacity = '0'; }, 2000);
}

function loadDraft() {
  try {
    const raw = localStorage.getItem('ik_draft');
    if (!raw) return;
    const d = JSON.parse(raw);
    const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined && val !== '') el.value = val; };
    set('biz_name', d.biz?.name); set('biz_email', d.biz?.email);
    set('biz_phone', d.biz?.phone); set('biz_gstin', d.biz?.gstin); set('biz_address', d.biz?.address);
    set('client_name', d.client?.name); set('client_email', d.client?.email);
    set('client_address', d.client?.address); set('client_gstin', d.client?.gstin);
    set('inv_number', d.inv?.number); set('inv_date', d.inv?.date); set('due_date', d.inv?.due);
    set('currency', d.currency); set('tax_pct', d.tax_pct); set('discount', d.discount);
    set('notes', d.notes);
    if (d.items?.length) {
      items = [];
      d.items.forEach(i => addItem(i.desc, i.qty, i.rate));
    }
    calcTotals();
  } catch(e) {}
}

function getData() {
  const cur = getCur();
  const subtotal = items.reduce((s, i) => s + (i.qty||0)*(i.rate||0), 0);
  const taxPct = parseFloat(document.getElementById('tax_pct').value)||0;
  const discount = parseFloat(document.getElementById('discount').value)||0;
  const tax = subtotal * taxPct / 100;
  const total = subtotal + tax - discount;
  return {
    biz: {
      name: val('biz_name'), email: val('biz_email'), phone: val('biz_phone'),
      gstin: val('biz_gstin'), address: val('biz_address')
    },
    client: {
      name: val('client_name'), email: val('client_email'),
      address: val('client_address'), gstin: val('client_gstin')
    },
    inv: {
      number: val('inv_number'), date: val('inv_date'), due: val('due_date'), notes: val('notes')
    },
    items, subtotal, tax, taxPct, discount, total, cur
  };
}

function val(id) { return document.getElementById(id).value.trim(); }
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function fmt(n, cur) {
  return cur + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showPreview() {
  const d = getData();
  const el = document.getElementById('preview-content');
  el.innerHTML = buildPreviewHTML(d);
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

function buildPreviewHTML(d) {
  const rows = d.items.map(i => `
    <tr>
      <td>${escHtml(i.desc||'')}</td>
      <td>${i.qty}</td>
      <td>${fmt(i.rate||0, d.cur)}</td>
      <td>${fmt((i.qty||0)*(i.rate||0), d.cur)}</td>
    </tr>
  `).join('');

  return `
    <div class="inv-header">
      <div class="inv-logo">${escHtml(d.biz.name||'Your Business')}</div>
      <div class="inv-title"><h1>INVOICE</h1><p>#${escHtml(d.inv.number)}</p></div>
    </div>
    <div class="inv-parties">
      <div class="inv-party">
        <h3>From</h3>
        <p><strong>${escHtml(d.biz.name)}</strong><br>
        ${d.biz.email ? escHtml(d.biz.email) + '<br>' : ''}
        ${d.biz.phone ? escHtml(d.biz.phone) + '<br>' : ''}
        ${d.biz.gstin ? 'GSTIN: ' + escHtml(d.biz.gstin) + '<br>' : ''}
        ${d.biz.address ? escHtml(d.biz.address).replace(/\n/g,'<br>') : ''}</p>
      </div>
      <div class="inv-party">
        <h3>Bill To</h3>
        <p><strong>${escHtml(d.client.name)}</strong><br>
        ${d.client.email ? escHtml(d.client.email) + '<br>' : ''}
        ${d.client.gstin ? 'GSTIN: ' + escHtml(d.client.gstin) + '<br>' : ''}
        ${d.client.address ? escHtml(d.client.address).replace(/\n/g,'<br>') : ''}</p>
      </div>
    </div>
    <div style="display:flex;gap:24px;margin-bottom:20px;font-size:13px">
      <div><span style="color:var(--muted)">Invoice Date: </span><strong>${escHtml(d.inv.date)}</strong></div>
      ${d.inv.due ? `<div><span style="color:var(--muted)">Due Date: </span><strong>${escHtml(d.inv.due)}</strong></div>` : ''}
    </div>
    <table class="inv-table">
      <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="inv-totals">
      <div class="inv-total-row"><span>Subtotal</span><span>${fmt(d.subtotal, d.cur)}</span></div>
      <div class="inv-total-row"><span>Tax (${d.taxPct}%)</span><span>${fmt(d.tax, d.cur)}</span></div>
      ${d.discount > 0 ? `<div class="inv-total-row"><span>Discount</span><span>-${fmt(d.discount, d.cur)}</span></div>` : ''}
      <div class="inv-total-row grand"><span>Total</span><span>${fmt(d.total, d.cur)}</span></div>
    </div>
    ${d.inv.notes ? `<div class="inv-notes"><strong>Notes / Payment Terms:</strong><br>${escHtml(d.inv.notes).replace(/\n/g,'<br>')}</div>` : ''}
    <div class="inv-footer">Created with InvoiceKit.in — Free Invoice Generator</div>
  `;
}

function downloadPDF() {
  const d = getData();
  if (!d.biz.name || !d.client.name) { alert('Please enter your business name and client name.'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(79, 70, 229); // accent
  doc.text(d.biz.name || 'Your Business', 15, y);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(22);
  doc.text('INVOICE', W - 15, y, { align: 'right' });
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('#' + d.inv.number, W - 15, y, { align: 'right' });
  y += 12;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y, W - 15, y);
  y += 8;

  // From / Bill To
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('FROM', 15, y);
  doc.text('BILL TO', W / 2 + 5, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  const fromLines = [d.biz.name, d.biz.email, d.biz.phone, d.biz.gstin ? 'GSTIN: ' + d.biz.gstin : '', ...(d.biz.address||'').split('\n')].filter(Boolean);
  const toLines = [d.client.name, d.client.email, d.client.gstin ? 'GSTIN: ' + d.client.gstin : '', ...(d.client.address||'').split('\n')].filter(Boolean);

  const maxLines = Math.max(fromLines.length, toLines.length);
  fromLines.forEach((l, i) => doc.text(String(l), 15, y + i * 5));
  toLines.forEach((l, i) => doc.text(String(l), W / 2 + 5, y + i * 5));
  y += maxLines * 5 + 8;

  // Dates
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Invoice Date: ', 15, y);
  doc.setTextColor(15, 23, 42);
  doc.text(d.inv.date, 42, y);
  if (d.inv.due) {
    doc.setTextColor(100, 116, 139);
    doc.text('Due Date: ', 80, y);
    doc.setTextColor(15, 23, 42);
    doc.text(d.inv.due, 103, y);
  }
  y += 10;

  // Items table
  const tableRows = d.items.map(i => [
    i.desc || '',
    String(i.qty || 0),
    d.cur + (i.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
    d.cur + ((i.qty || 0) * (i.rate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })
  ]);

  doc.autoTable({
    startY: y,
    head: [['Description', 'Qty', 'Rate', 'Amount']],
    body: tableRows,
    margin: { left: 15, right: 15 },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 20 }, 2: { halign: 'right', cellWidth: 35 }, 3: { halign: 'right', cellWidth: 35 } }
  });

  y = doc.lastAutoTable.finalY + 8;

  // Totals
  const totals = [
    ['Subtotal', fmt(d.subtotal, d.cur)],
    [`Tax (${d.taxPct}%)`, fmt(d.tax, d.cur)],
    ...(d.discount > 0 ? [['Discount', '-' + fmt(d.discount, d.cur)]] : []),
    ['TOTAL', fmt(d.total, d.cur)]
  ];
  totals.forEach(([label, value], idx) => {
    const isGrand = label === 'TOTAL';
    if (isGrand) {
      doc.setDrawColor(226, 232, 240);
      doc.line(W - 90, y - 2, W - 15, y - 2);
    }
    doc.setFontSize(isGrand ? 11 : 9);
    doc.setFont('helvetica', isGrand ? 'bold' : 'normal');
    doc.setTextColor(isGrand ? 79 : 100, isGrand ? 70 : 116, isGrand ? 229 : 139);
    doc.text(label, W - 90, y, { align: 'left' });
    doc.setTextColor(15, 23, 42);
    doc.text(value, W - 15, y, { align: 'right' });
    y += isGrand ? 7 : 5;
  });

  // Notes
  if (d.inv.notes) {
    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes / Payment Terms:', 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const noteLines = doc.splitTextToSize(d.inv.notes, W - 30);
    doc.text(noteLines, 15, y);
    y += noteLines.length * 5;
  }

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text('Created with InvoiceKit.in — Free Invoice Generator', W / 2, pageH - 10, { align: 'center' });

  doc.save(`Invoice-${d.inv.number || 'draft'}.pdf`);
}

function clearAll() {
  if (!confirm('Clear all fields and start fresh?')) return;
  localStorage.removeItem('ik_draft');
  ['biz_name','biz_email','biz_phone','biz_gstin','biz_address','client_name','client_email','client_address','client_gstin','notes'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('inv_number').value = 'INV-001';
  document.getElementById('inv_date').value = new Date().toISOString().slice(0,10);
  const due = new Date(); due.setDate(due.getDate()+30);
  document.getElementById('due_date').value = due.toISOString().slice(0,10);
  document.getElementById('tax_pct').value = 18;
  document.getElementById('discount').value = 0;
  items = [];
  addItem(); addItem();
}
