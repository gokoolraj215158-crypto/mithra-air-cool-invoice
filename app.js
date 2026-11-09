/**
 * MITHRA AIR COOL - INVOICE GENERATOR APPLICATION
 * Core logic: State management, Dynamic Multi-Page Pagination,
 * Mobile optimization, Indian Currency Words, GST toggle, and Printing.
 */

// --- Default Data matching original invoice sample ---
const SAMPLE_DATA = {
  docType: 'INVOICE', // 'INVOICE', 'QUOTATION', 'QUOTE'
  invoiceNo: 'MAC/11/25-26',
  invoiceDate: '2026-07-14',
  poNumber: '', // Optional Customer PO Number
  clientName: 'Prathyusha Engineering College',
  clientAddress1: 'Aranvoyalkuppam,Poonaamallee-TiruvallurRoad,Tiruvallur',
  clientAddress2: 'Tamil Nadu 602025',
  supplyState: 'Tamil Nadu',
  gstMode: 'without-gst', // 'without-gst', 'with-gst', 'igst'
  layoutDensity: 'multi', // 'multi', 'compact'
  items: [
    {
      id: 'item-1',
      description: 'Seminar Hall Ductable blower motor service',
      qty: 1,
      rate: 4200.00
    },
    {
      id: 'item-2',
      description: 'Seminar Hall Ductable blower motor labour',
      qty: 1,
      rate: 3000.00
    },
    {
      id: 'item-3',
      description: 'Transport',
      qty: 1,
      rate: 450.00
    }
  ],
  company: {
    name: 'MITHRA AIR COOL',
    address: '17,RajivGandhiStreet,AranvoyalVillage,Thiruvallur – 602025',
    gstNo: '33CRPPA9823D12V',
    state: 'Tamil Nadu',
    stateCode: '33',
    bankName: 'Indian Bank',
    accountNo: '6621884173',
    branch: 'Valarpuram',
    ifsc: 'IDIB000V060',
    beneficiary: 'R Ajith',
    phone: '(+91) 8610916412',
    email: 'mithraair@gmail.com'
  }
};

// Current application state
let appState = JSON.parse(JSON.stringify(SAMPLE_DATA));

// Zoom state
let currentZoom = 1.0;

// Mobile view state: 'edit' or 'preview'
let mobileActiveView = 'edit';

// ==========================================================================
// INDIAN NUMBER TO WORDS CONVERTER
// ==========================================================================
function convertNumberToWords(amount) {
  if (!amount || isNaN(amount) || amount === 0) {
    return 'Zero only';
  }

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  function convertTwoDigits(n) {
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const o = n % 10;
    return tens[t] + (o ? ' ' + ones[o] : '');
  }

  function convertThreeDigits(n) {
    let str = '';
    const h = Math.floor(n / 100);
    const r = n % 100;
    if (h > 0) {
      str += ones[h] + ' Hundred';
      if (r > 0) str += ' ';
    }
    if (r > 0) {
      str += convertTwoDigits(r);
    }
    return str;
  }

  const rounded = Math.round(amount * 100) / 100;
  const wholePart = Math.floor(rounded);
  const fraction = Math.round((rounded - wholePart) * 100);

  let remaining = wholePart;
  const parts = [];

  // Crores (>= 1,00,00,000)
  if (remaining >= 10000000) {
    const crores = Math.floor(remaining / 10000000);
    parts.push(convertThreeDigits(crores) + ' Crore');
    remaining %= 10000000;
  }

  // Lakhs (>= 1,00,00,000)
  if (remaining >= 100000) {
    const lakhs = Math.floor(remaining / 100000);
    parts.push(convertTwoDigits(lakhs) + ' Lakh');
    remaining %= 100000;
  }

  // Thousands (>= 1,000)
  if (remaining >= 1000) {
    const thousands = Math.floor(remaining / 1000);
    parts.push(convertTwoDigits(thousands) + ' thousand');
    remaining %= 1000;
  }

  // Remaining Hundreds, Tens, Ones (< 1,000)
  if (remaining > 0) {
    parts.push(convertThreeDigits(remaining));
  }

  let words = parts.join(' ').trim();
  if (!words) words = 'Zero';

  if (fraction > 0) {
    words += ' and ' + convertTwoDigits(fraction) + ' Paise';
  }

  return words + ' only';
}

// ==========================================================================
// FORMATTING UTILITIES (DD-MM-YYYY DATE FORMAT)
// ==========================================================================
function formatCurrency(val) {
  const num = Number(val) || 0;
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Formats any date input into DD-MM-YYYY format
 * Example: '2026-07-14' -> '14-07-2026'
 */
function formatDateDisplay(dateVal) {
  if (!dateVal) return '';
  const str = String(dateVal).trim();

  // If already in DD-MM-YYYY format (e.g. 14-07-2026)
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    return str;
  }

  // If YYYY-MM-DD format from <input type="date"> (e.g. 2026-07-14)
  const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${day}-${month}-${year}`;
  }

  // If DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${day}-${month}-${year}`;
  }

  // Fallback parsing via standard Date object
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return str;
}

/**
 * Normalizes any date string to YYYY-MM-DD for standard HTML <input type="date">
 */
function normalizeDateForInput(dateVal) {
  if (!dateVal) {
    return new Date().toISOString().split('T')[0];
  }
  const str = String(dateVal).trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().split('T')[0];
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ==========================================================================
// DYNAMIC MULTI-PAGE PAGINATION ENGINE
// ==========================================================================
function paginateItems(items, isCompact) {
  // Page 1 capacity with full header & metadata:
  // If all items fit on single page with bottom section:
  const singlePageMax = isCompact ? 11 : 8;
  if (items.length <= singlePageMax) {
    return [items.map((item, idx) => ({ ...item, globalIndex: idx + 1 }))];
  }

  // Multi-page scenario:
  // Page 1 has NO bottom section, so it comfortably holds 9 items (standard) or 12 items (compact)
  const page1Capacity = isCompact ? 12 : 9;
  // Continuation pages WITH bottom section can comfortably hold up to:
  const contPageWithBottom = isCompact ? 12 : 10;
  // Intermediate continuation pages WITHOUT bottom section can hold up to:
  const contPageWithoutBottom = isCompact ? 18 : 15;

  const pages = [];
  const itemsWithIndex = items.map((item, idx) => ({ ...item, globalIndex: idx + 1 }));

  // Page 1
  pages.push(itemsWithIndex.slice(0, page1Capacity));
  let remaining = itemsWithIndex.slice(page1Capacity);

  // Subsequent pages
  while (remaining.length > 0) {
    if (remaining.length <= contPageWithBottom) {
      // All remaining fit on this final page along with the bottom section
      pages.push(remaining);
      break;
    } else {
      // Fill this continuation page and continue to next
      pages.push(remaining.slice(0, contPageWithoutBottom));
      remaining = remaining.slice(contPageWithoutBottom);
    }
  }

  return pages;
}

// ==========================================================================
// RENDERING FUNCTIONS
// ==========================================================================

// Render the editor controls for line items
function renderEditorItems() {
  const container = document.getElementById('lineItemsEditor');
  container.innerHTML = '';

  appState.items.forEach((item, index) => {
    const rowCard = document.createElement('div');
    rowCard.className = 'item-row-card';
    rowCard.dataset.id = item.id;

    const rowAmount = (Number(item.qty) || 0) * (Number(item.rate) || 0);

    rowCard.innerHTML = `
      <div class="item-card-header">
        <span class="item-badge">#${index + 1} Line Item</span>
        ${appState.items.length > 1 ? `
          <button type="button" class="btn-remove-item" title="Delete line item" data-id="${item.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18m-2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        ` : ''}
      </div>
      <div class="form-group">
        <label>Item Description</label>
        <input type="text" class="item-desc-input" list="serviceSuggestions" value="${escapeHtml(item.description)}" placeholder="e.g. Ductable blower motor service">
      </div>
      <div class="item-calc-row">
        <div class="form-group qty-field">
          <label>Qty</label>
          <input type="number" class="item-qty-input" value="${item.qty}" min="1" step="1" inputmode="numeric">
        </div>
        <div class="form-group rate-field">
          <label>Unit Rate (₹)</label>
          <input type="number" class="item-rate-input" value="${item.rate}" min="0" step="0.01" inputmode="decimal" placeholder="0.00">
        </div>
        <div class="amount-field">
          <span class="amount-label">Line Total</span>
          <div class="amount-value">${formatCurrency(rowAmount)}</div>
        </div>
      </div>
    `;

    // Attach row events
    const descInput = rowCard.querySelector('.item-desc-input');
    const qtyInput = rowCard.querySelector('.item-qty-input');
    const rateInput = rowCard.querySelector('.item-rate-input');
    const removeBtn = rowCard.querySelector('.btn-remove-item');

    descInput.addEventListener('input', (e) => {
      item.description = e.target.value;
      updatePreview();
      saveState();
    });

    qtyInput.addEventListener('input', (e) => {
      item.qty = parseFloat(e.target.value) || 0;
      updateRowAmountDisplay(rowCard, item);
      updatePreview();
      saveState();
    });

    rateInput.addEventListener('input', (e) => {
      item.rate = parseFloat(e.target.value) || 0;
      updateRowAmountDisplay(rowCard, item);
      updatePreview();
      saveState();
    });

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        removeLineItem(item.id);
      });
    }

    container.appendChild(rowCard);
  });

  document.getElementById('itemsCountBadge').textContent = appState.items.length;
}

function updateRowAmountDisplay(card, item) {
  const amountVal = (Number(item.qty) || 0) * (Number(item.rate) || 0);
  const display = card.querySelector('.amount-value');
  if (display) {
    display.textContent = formatCurrency(amountVal);
  }
}

// Generate the HTML for an A4 invoice page
function buildPageHtml(pageIndex, totalPages, pageItems, isLastPage, subTotal, grandTotal, cgstAmount, sgstAmount, igstAmount, words) {
  const isFirstPage = (pageIndex === 0);
  const isCompact = (appState.layoutDensity === 'compact');

  const docTitle = appState.docType || 'INVOICE';
  const docName = docTitle === 'INVOICE' ? 'Invoice' : (docTitle === 'QUOTE' ? 'Quote' : 'Quotation');

  // 1. Header (Full on Page 1, Continuation bar on Page 2+)
  let headerHtml = '';
  if (isFirstPage) {
    headerHtml = `
      <header class="invoice-header">
        <div class="header-inner">
          <div class="header-brand">
            <div class="header-logo-container">
              <svg class="header-logo-svg" viewBox="0 0 100 100" width="60" height="60">
                <defs>
                  <linearGradient id="mLogoGrad1_${pageIndex}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#00ffff" />
                    <stop offset="50%" stop-color="#0096c7" />
                    <stop offset="100%" stop-color="#023e8a" />
                  </linearGradient>
                  <linearGradient id="mLogoGrad2_${pageIndex}" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#38bdf8" />
                    <stop offset="100%" stop-color="#1d4ed8" />
                  </linearGradient>
                  <linearGradient id="mHexGrad_${pageIndex}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#001845" />
                    <stop offset="100%" stop-color="#023e8a" />
                  </linearGradient>
                </defs>
                <polygon points="50,4 90,26 90,74 50,96 10,74 10,26" fill="url(#mHexGrad_${pageIndex})" stroke="#00b4d8" stroke-width="2"/>
                <polygon points="20,70 36,25 48,55 36,70" fill="url(#mLogoGrad1_${pageIndex})"/>
                <polygon points="80,70 64,25 52,55 64,70" fill="url(#mLogoGrad2_${pageIndex})"/>
                <polygon points="36,25 50,58 64,25 50,40" fill="#67e8f9" opacity="0.95"/>
                <polygon points="48,55 50,58 52,55 50,75" fill="#38bdf8"/>
              </svg>
            </div>
            <div class="header-titles">
              <h1 class="company-name">${escapeHtml(appState.company.name)}</h1>
              <p class="company-address">${escapeHtml(appState.company.address)}</p>
            </div>
          </div>
          <div class="header-title-box">
            <h2 class="invoice-title">${escapeHtml(docTitle)}</h2>
          </div>
        </div>
        <div class="header-wave">
          <svg viewBox="0 0 1000 36" preserveAspectRatio="none">
            <path d="M0,0 C320,32 680,32 1000,0 L1000,36 L0,36 Z" fill="#ffffff"></path>
            <path d="M0,0 C320,32 680,32 1000,0" fill="none" stroke="#38bdf8" stroke-width="3.5" opacity="0.85"></path>
          </svg>
        </div>
      </header>

      <!-- INVOICE / QUOTE INFO & TAX INFORMATION -->
      <section class="invoice-meta-section">
        <div class="meta-card">
          <div class="cyan-accent-bar"></div>
          <div class="meta-content">
            <h4 class="meta-heading">${escapeHtml(docTitle)} DETAILS</h4>
            <div class="meta-row">
              <span class="meta-label">${escapeHtml(docName)} No.</span>
              <span class="meta-value">${escapeHtml(appState.invoiceNo)}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">${escapeHtml(docName)} Date</span>
              <span class="meta-value">${escapeHtml(formatDateDisplay(appState.invoiceDate))}</span>
            </div>
            ${appState.poNumber && appState.poNumber.trim() ? `
            <div class="meta-row">
              <span class="meta-label">Customer PO</span>
              <span class="meta-value">${escapeHtml(appState.poNumber.trim())}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="meta-card">
          <div class="cyan-accent-bar"></div>
          <div class="meta-content">
            <h4 class="meta-heading">TAX INFORMATION</h4>
            <div class="meta-row">
              <span class="meta-label">GST No.</span>
              <span class="meta-value">${escapeHtml(appState.company.gstNo)}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">State</span>
              <span class="meta-value">${escapeHtml(appState.company.state)}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">State Code</span>
              <span class="meta-value">${escapeHtml(appState.company.stateCode)}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- INVOICE / QUOTE TO & PLACE OF SUPPLY -->
      <section class="invoice-to-section">
        <div class="client-details">
          <span class="client-label">${escapeHtml(docTitle.split('').join(' '))} &nbsp; T O</span>
          <h3 class="client-name">${escapeHtml(appState.clientName || 'Valued Customer')}</h3>
          <p class="client-address-line">${escapeHtml(appState.clientAddress1 || '')}</p>
          <p class="client-address-line">${escapeHtml(appState.clientAddress2 || '')}</p>
        </div>
        <div class="supply-badge">
          <span class="target-icon">
            <svg viewBox="0 0 20 20" width="14" height="14" fill="none">
              <circle cx="10" cy="10" r="8" stroke="#0284c7" stroke-width="1.8"/>
              <circle cx="10" cy="10" r="3.5" fill="#0284c7"/>
            </svg>
          </span>
          <span class="supply-text">Supply: ${escapeHtml(appState.supplyState || 'Tamil Nadu')}</span>
        </div>
      </section>
    `;
  } else {
    // Continuation Header for Page 2+
    headerHtml = `
      <div class="continuation-header">
        <div class="continuation-brand">
          <h3>${escapeHtml(appState.company.name)}</h3>
          <span class="continuation-badge-text">${escapeHtml(docTitle)} Continuation</span>
        </div>
        <div class="continuation-meta">
          <span>${escapeHtml(docName)} No: <strong>${escapeHtml(appState.invoiceNo)}</strong></span>
          ${appState.poNumber && appState.poNumber.trim() ? `<span>PO: <strong>${escapeHtml(appState.poNumber.trim())}</strong></span>` : ''}
          <span>Date: <strong>${escapeHtml(formatDateDisplay(appState.invoiceDate))}</strong></span>
          <span>Page <strong>${pageIndex + 1} of ${totalPages}</strong></span>
        </div>
      </div>
    `;
  }

  // 2. Table Rows for this page
  let rowsHtml = '';
  pageItems.forEach((item) => {
    const itemAmount = (Number(item.qty) || 0) * (Number(item.rate) || 0);
    rowsHtml += `
      <tr>
        <td class="col-sno">${item.globalIndex}</td>
        <td class="col-desc">${escapeHtml(item.description) || '&nbsp;'}</td>
        <td class="col-qty">${item.qty}</td>
        <td class="col-rate">${Number(item.rate).toFixed(2)}</td>
        <td class="col-amount">${itemAmount.toFixed(2)}</td>
      </tr>
    `;
  });

  const tableHtml = `
    <section class="table-section">
      <table class="items-table">
        <thead>
          <tr>
            <th class="col-sno">S.No</th>
            <th class="col-desc">ITEM DESCRIPTION</th>
            <th class="col-qty">QTY</th>
            <th class="col-rate">RATE(₹)</th>
            <th class="col-amount">AMOUNT(₹)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      ${!isLastPage ? `
        <div class="continuation-bar">
          <span>Continued on Page ${pageIndex + 2} &nbsp;▾</span>
        </div>
      ` : ''}
    </section>
  `;

  // 3. Bottom Totals, Bank Details & Signatory (Rendered ONLY on the Final Page)
  let bottomHtml = '';
  if (isLastPage) {
    let taxRowsHtml = '';
    if (appState.gstMode === 'with-gst') {
      taxRowsHtml = `
        <div class="calc-row">
          <span class="calc-label">CGST@9%</span>
          <span class="calc-val">${formatCurrency(cgstAmount)}</span>
        </div>
        <div class="calc-row">
          <span class="calc-label">SGST@9%</span>
          <span class="calc-val">${formatCurrency(sgstAmount)}</span>
        </div>
      `;
    } else if (appState.gstMode === 'igst') {
      taxRowsHtml = `
        <div class="calc-row">
          <span class="calc-label">IGST@18%</span>
          <span class="calc-val">${formatCurrency(igstAmount)}</span>
        </div>
      `;
    } else {
      // Without GST (Default as in sample)
      taxRowsHtml = `
        <div class="calc-row">
          <span class="calc-label">CGST@9%</span>
          <span class="calc-val">₹0</span>
        </div>
        <div class="calc-row">
          <span class="calc-label">SGST@9%</span>
          <span class="calc-val">₹0</span>
        </div>
      `;
    }

    bottomHtml = `
      <section class="invoice-bottom-section">
        <!-- Left Side: Amount in Words & Bank Details -->
        <div class="bottom-left">
          <div class="amount-in-words-box">
            <div class="words-label">AMOUNT IN WORDS</div>
            <div class="words-value">${escapeHtml(words)}</div>
          </div>

          <div class="bank-details-box">
            <div class="bank-header">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#0284c7" stroke-width="2">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
              <span class="bank-title">BANK DETAILS</span>
            </div>
            <div class="bank-grid">
              <span class="bank-label">Bank Name</span>
              <span class="bank-val">${escapeHtml(appState.company.bankName)}</span>

              <span class="bank-label">Account No.</span>
              <span class="bank-val">${escapeHtml(appState.company.accountNo)}</span>

              <span class="bank-label">Branch</span>
              <span class="bank-val">${escapeHtml(appState.company.branch)}</span>

              <span class="bank-label">IFSC Code</span>
              <span class="bank-val">${escapeHtml(appState.company.ifsc)}</span>

              <span class="bank-label">Beneficiary</span>
              <span class="bank-val">${escapeHtml(appState.company.beneficiary)}</span>
            </div>
          </div>
        </div>

        <!-- Right Side: Sub Total, Taxes, Grand Total, Signatory -->
        <div class="bottom-right">
          <div class="calculations-box">
            <div class="calc-row">
              <span class="calc-label">Sub &nbsp; Total</span>
              <span class="calc-val">${formatCurrency(subTotal)}</span>
            </div>
            ${taxRowsHtml}
          </div>

          <!-- Grand Total Banner -->
          <div class="grand-total-banner">
            <span class="grand-total-label">Grand Total</span>
            <span class="grand-total-val">${formatCurrency(grandTotal)}</span>
          </div>

          <!-- Authorized Signatory -->
          <div class="signatory-box">
            <div class="signatory-space"></div>
            <div class="signatory-label">AUTHORIZED SIGNATORY</div>
          </div>
        </div>
      </section>
    `;
  }

  // 4. Footer
  const footerHtml = `
    <footer class="invoice-footer">
      <div class="footer-divider"></div>
      <div class="footer-contacts">
        <div class="contact-item">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0096c7" stroke-width="2">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
            <line x1="12" y1="18" x2="12.01" y2="18"/>
          </svg>
          <span>${escapeHtml(appState.company.phone)}</span>
        </div>
        <div class="contact-item">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0096c7" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <span>${escapeHtml(appState.company.email)}</span>
        </div>
        <div class="contact-item">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#0096c7" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <span>Thiruvallur, Tamil Nadu</span>
        </div>
      </div>
      <div class="footer-bottom-row">
        <div class="footer-thankyou">
          <p>Thank you for your business</p>
          <div class="thankyou-accent-bar"></div>
        </div>
        <div class="page-indicator-badge">Page ${pageIndex + 1} of ${totalPages}</div>
      </div>
    </footer>
  `;

  return `
    <div class="invoice-page ${isCompact ? 'compact-mode' : ''}" id="page-${pageIndex + 1}">
      ${headerHtml}
      ${tableHtml}
      ${bottomHtml}
      ${footerHtml}
    </div>
  `;
}

// Render the entire multi-page preview
function updatePreview() {
  // 1. Calculate Totals
  let subTotal = 0;
  appState.items.forEach((item) => {
    subTotal += (Number(item.qty) || 0) * (Number(item.rate) || 0);
  });

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let grandTotal = subTotal;

  if (appState.gstMode === 'with-gst') {
    cgstAmount = Math.round((subTotal * 0.09) * 100) / 100;
    sgstAmount = Math.round((subTotal * 0.09) * 100) / 100;
    grandTotal = subTotal + cgstAmount + sgstAmount;
  } else if (appState.gstMode === 'igst') {
    igstAmount = Math.round((subTotal * 0.18) * 100) / 100;
    grandTotal = subTotal + igstAmount;
  } else {
    grandTotal = subTotal;
  }

  const words = convertNumberToWords(grandTotal);

  // Update Sidebar & Mobile Header totals
  document.getElementById('sidebarGrandTotal').textContent = formatCurrency(grandTotal);
  const mobileTotalBadge = document.getElementById('mobileTotalBadge');
  if (mobileTotalBadge) {
    mobileTotalBadge.textContent = formatCurrency(grandTotal);
  }

  // 2. Perform Dynamic Multi-Page Pagination
  const isCompact = (appState.layoutDensity === 'compact');
  const pages = paginateItems(appState.items, isCompact);
  const totalPages = pages.length;

  // Update Page Count Tag
  const pageCountTag = document.getElementById('pageCountTag');
  if (pageCountTag) {
    pageCountTag.textContent = totalPages === 1 ? '1 Page (A4)' : `${totalPages} Pages (A4 Multi-Page)`;
  }

  // 3. Render all pages into the container
  const container = document.getElementById('invoicePagesContainer');
  let fullPagesHtml = '';

  pages.forEach((pageItems, pageIndex) => {
    const isLastPage = (pageIndex === totalPages - 1);
    fullPagesHtml += buildPageHtml(
      pageIndex,
      totalPages,
      pageItems,
      isLastPage,
      subTotal,
      grandTotal,
      cgstAmount,
      sgstAmount,
      igstAmount,
      words
    );
  });

  container.innerHTML = fullPagesHtml;
}

// ==========================================================================
// ITEM ACTIONS
// ==========================================================================
function addLineItem() {
  const newItem = {
    id: 'item-' + Date.now(),
    description: '',
    qty: 1,
    rate: 0
  };
  appState.items.push(newItem);
  renderEditorItems();
  updatePreview();
  saveState();

  // Scroll to bottom of line items and focus
  setTimeout(() => {
    const editor = document.getElementById('lineItemsEditor');
    const lastCard = editor.lastElementChild;
    if (lastCard) {
      lastCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const descInput = lastCard.querySelector('.item-desc-input');
      if (descInput) descInput.focus();
    }
  }, 50);
}

function removeLineItem(id) {
  if (appState.items.length <= 1) {
    alert('Invoice must have at least one line item.');
    return;
  }
  appState.items = appState.items.filter(item => item.id !== id);
  renderEditorItems();
  updatePreview();
  saveState();
}

function updateDocLabels() {
  const docTitle = appState.docType || 'INVOICE';
  const isInv = docTitle === 'INVOICE';
  const isQuote = docTitle === 'QUOTE';
  const docName = isInv ? 'Invoice' : (isQuote ? 'Quote' : 'Quotation');

  const sectionTitle = document.getElementById('sectionTitleDoc');
  if (sectionTitle) sectionTitle.textContent = `${docName} Details`;

  const labelDocNo = document.getElementById('labelDocNo');
  if (labelDocNo) labelDocNo.textContent = `${docName} Number`;

  const labelDocDate = document.getElementById('labelDocDate');
  if (labelDocDate) labelDocDate.textContent = `${docName} Date`;

  const labelPoNumber = document.getElementById('labelPoNumber');
  if (labelPoNumber) {
    labelPoNumber.textContent = isInv ? 'Customer PO Number' : 'Customer PO / Ref Number';
  }
}

function updateDateHint() {
  const hintEl = document.getElementById('hintInvoiceDateDisplay');
  if (hintEl) {
    hintEl.textContent = formatDateDisplay(appState.invoiceDate);
  }
}

// Toast notification helper
let toastTimeout = null;
function showToast(message, type = 'info') {
  const toast = document.getElementById('appToast');
  if (!toast) return;

  const iconSvg = type === 'success'
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
    : (type === 'error'
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`);

  toast.innerHTML = `${iconSvg}<span>${message}</span>`;
  toast.className = `app-toast toast-${type} show`;

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3800);
}

// ==========================================================================
// FILE IMPORT & EXPORT ENGINE (LOCAL FILE EDITING)
// ==========================================================================

/**
 * Handles file reading for uploaded local file (.pdf, .json, .csv)
 */
function handleFiles(files) {
  if (!files || files.length === 0) return;
  const file = files[0];
  const lowerName = file.name.toLowerCase();

  // 1. PDF File Upload
  if (lowerName.endsWith('.pdf') || file.type === 'application/pdf') {
    showToast(`Reading invoice PDF "${file.name}"...`, 'info');
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        await loadInvoiceFromPdf(e.target.result, file.name);
      } catch (err) {
        console.error('PDF parsing error:', err);
        showToast('Error reading invoice PDF: ' + err.message, 'error');
      }
    };
    reader.onerror = () => {
      showToast('Failed to read local PDF file.', 'error');
    };
    reader.readAsArrayBuffer(file);
    return;
  }

  // 2. Text-based files (.json, .csv)
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target.result;
      if (lowerName.endsWith('.csv')) {
        loadInvoiceFromCsv(content, file.name);
      } else {
        // Try JSON first (handles .json or any text JSON)
        loadInvoiceFromJson(content, file.name);
      }
    } catch (err) {
      console.error('File load error:', err);
      showToast('Error reading file: ' + err.message, 'error');
    }
  };

  reader.onerror = () => {
    showToast('Failed to read local file.', 'error');
  };

  reader.readAsText(file);
}

/**
 * Parses and populates invoice/quote data from an uploaded PDF file
 */
async function loadInvoiceFromPdf(arrayBuffer, fileName) {
  if (!window.pdfjsLib) {
    throw new Error('PDF parsing engine not initialized. Please ensure pdf.js is loaded.');
  }

  const loadingTask = window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const doc = await loadingTask.promise;

  const allLines = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Sort items top-to-bottom (Y desc) then left-to-right (X asc)
    const sorted = textContent.items
      .filter(it => it.str && it.str.trim())
      .sort((a, b) => {
        const diffY = b.transform[5] - a.transform[5];
        if (Math.abs(diffY) > 3.5) return diffY;
        return a.transform[4] - b.transform[4];
      });

    let currentY = null;
    let currentLine = [];
    sorted.forEach(item => {
      if (currentY === null || Math.abs(item.transform[5] - currentY) > 4.5) {
        if (currentLine.length > 0) allLines.push(currentLine);
        currentLine = [item.str.trim()];
        currentY = item.transform[5];
      } else {
        currentLine.push(item.str.trim());
      }
    });
    if (currentLine.length > 0) allLines.push(currentLine);
  }

  let docType = 'INVOICE';
  let invoiceNo = '';
  let invoiceDate = '';
  let poNumber = '';
  let clientName = '';
  let clientAddress1 = '';
  let clientAddress2 = '';
  let supplyState = 'Tamil Nadu';
  let gstMode = 'without-gst';
  const items = [];

  const lineStrings = allLines.map(l => l.join(' '));

  let inClientSection = false;
  let clientLinesRead = 0;
  let inTableSection = false;

  for (let idx = 0; idx < lineStrings.length; idx++) {
    const line = lineStrings[idx];
    const upper = line.toUpperCase();

    // 1. Document Type (INVOICE, QUOTATION, QUOTE)
    if (upper.includes('QUOTATION') && !upper.includes('DETAILS')) {
      docType = 'QUOTATION';
    } else if (upper.includes('QUOTE') && !upper.includes('DETAILS') && !upper.includes('QUOTATION')) {
      docType = 'QUOTE';
    } else if (upper.includes('INVOICE') && !upper.includes('DETAILS') && !upper.includes('TO')) {
      docType = 'INVOICE';
    }

    // 2. Document Number
    const invMatch = line.match(/(?:Invoice|Quote|Quotation)\s*No\s*[.:]?\s*([A-Za-z0-9\/\s-]+?)(?=\s*GST|\s*Date|\s*State|\s*$)/i)
      || line.match(/MAC\s*\/\s*\d+\s*\/\s*[\w-]+/i);
    if (invMatch && !invoiceNo) {
      invoiceNo = (invMatch[1] || invMatch[0]).replace(/\s+/g, '');
    }

    // 3. Document Date
    const dateMatch = line.match(/(?:Date\s*[.:]?\s*)?(\d{1,2}[-/\.]\d{1,2}[-/\.]\d{4})/i)
      || line.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch && !invoiceDate && (line.toLowerCase().includes('date') || dateMatch[0].length >= 10)) {
      invoiceDate = normalizeDateForInput(dateMatch[1] || dateMatch[0]);
    }

    // 4. Customer PO Number (Optional)
    const poMatch = line.match(/Customer\s*PO\s*[:.]?\s*([A-Za-z0-9\/\s-]+?)(?=\s*State|\s*Code|\s*$)/i)
      || line.match(/PO\s*No[.:\s]*([^\s|]+)/i);
    if (poMatch && !poNumber) {
      poNumber = (poMatch[1] || poMatch[0]).replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim();
    }

    // 5. Client Section
    if (upper.includes('INVOICE TO') || upper.includes('I N V O I C E T O') || upper.includes('QUOTE TO') || upper.includes('QUOTATION TO') || upper.includes('CLIENT DETAILS')) {
      inClientSection = true;
      clientLinesRead = 0;
      continue;
    }

    if (inClientSection) {
      if (upper.includes('SUPPLY') || line.includes('Supply:')) {
        const sMatch = line.match(/Supply\s*:\s*([^|\n]+)/i);
        if (sMatch) supplyState = sMatch[1].trim();
      } else if (upper.includes('S.NO') || upper.includes('ITEM DESCRIPTION') || upper.includes('S . NO')) {
        inClientSection = false;
        inTableSection = true;
      } else if (clientLinesRead === 0 && line.trim()) {
        clientName = line.trim();
        clientLinesRead++;
      } else if (clientLinesRead === 1 && line.trim()) {
        clientAddress1 = line.replace(/\s*,\s*/g, ',').replace(/\s*-\s*/g, '-').trim();
        clientLinesRead++;
      } else if (clientLinesRead === 2 && line.trim()) {
        clientAddress2 = line.replace(/\s*,\s*/g, ',').replace(/\s*-\s*/g, '-').trim();
        clientLinesRead++;
      }
    }

    // 6. Table Header Detection
    if (upper.includes('ITEM DESCRIPTION') && (upper.includes('QTY') || upper.includes('RATE'))) {
      inTableSection = true;
      continue;
    }

    // Stop table when bottom section begins
    if (upper.includes('AMOUNT IN WORDS') || upper.includes('SUB TOTAL') || upper.includes('BANK DETAILS') || upper.includes('GRAND TOTAL')) {
      inTableSection = false;
    }

    // 7. Table Line Items Extraction
    const itemMatch = line.match(/^(\d+)\s+(.+?)\s+(\d+(?:\.\d+)?)\s+([\d,]+(?:\.\d{2})?)\s+([\d,]+(?:\.\d{2})?)$/);
    if (itemMatch) {
      items.push({
        id: 'item-' + Date.now() + '-' + itemMatch[1],
        description: itemMatch[2].trim(),
        qty: parseFloat(itemMatch[3]) || 1,
        rate: parseFloat(itemMatch[4].replace(/,/g, '')) || 0
      });
    }

    // 8. GST Mode Detection
    if (line.includes('CGST') || line.includes('SGST')) {
      if (line.includes('₹ 0') || line.includes('₹0') || line.endsWith(' 0')) {
        gstMode = 'without-gst';
      } else {
        gstMode = 'with-gst';
      }
    } else if (line.includes('IGST') && !line.includes('₹ 0') && !line.includes('₹0')) {
      gstMode = 'igst';
    }
  }

  // Populate application state
  appState.docType = docType;
  if (invoiceNo) appState.invoiceNo = invoiceNo;
  if (invoiceDate) appState.invoiceDate = invoiceDate;
  appState.poNumber = poNumber || '';
  if (clientName) appState.clientName = clientName;
  if (clientAddress1) appState.clientAddress1 = clientAddress1;
  if (clientAddress2) appState.clientAddress2 = clientAddress2;
  if (supplyState) appState.supplyState = supplyState;
  appState.gstMode = gstMode;

  if (items.length > 0) {
    appState.items = items;
  }

  // Sync editor controls & preview
  syncFormValues();
  renderEditorItems();
  updatePreview();
  saveState();

  // If on mobile, switch to Edit view
  const appLayout = document.getElementById('appLayout');
  const tabBtnEdit = document.getElementById('tabBtnEdit');
  const tabBtnPreview = document.getElementById('tabBtnPreview');
  if (appLayout && window.innerWidth <= 850) {
    appLayout.classList.remove('view-preview');
    appLayout.classList.add('view-edit');
    if (tabBtnEdit) tabBtnEdit.classList.add('active');
    if (tabBtnPreview) tabBtnPreview.classList.remove('active');
  }

  showToast(`Loaded ${items.length} items from PDF "${fileName}"! Ready to edit.`, 'success');
}

/**
 * Parses and populates invoice/quote data from JSON
 */
function loadInvoiceFromJson(jsonText, fileName) {
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch (err) {
    // If not valid JSON, check if it might be CSV
    if (jsonText.includes(',')) {
      loadInvoiceFromCsv(jsonText, fileName);
      return;
    }
    showToast('Invalid JSON file format. Please check the file.', 'error');
    return;
  }

  // Handle nested object wrappers if present (e.g. { invoice: { ... } })
  const root = data.invoice || data.data || data;

  // 1. Document Type
  const rawType = (root.docType || root.doc_type || root.type || '').toUpperCase();
  if (['INVOICE', 'QUOTATION', 'QUOTE'].includes(rawType)) {
    appState.docType = rawType;
  }

  // 2. Document Number
  if (root.invoiceNo !== undefined || root.invoice_no !== undefined || root.docNo !== undefined || root.number !== undefined) {
    appState.invoiceNo = String(root.invoiceNo || root.invoice_no || root.docNo || root.number || '');
  }

  // 3. Document Date (normalize to YYYY-MM-DD for picker)
  const rawDate = root.invoiceDate || root.invoice_date || root.date || root.docDate || root.formattedDate;
  if (rawDate) {
    appState.invoiceDate = normalizeDateForInput(rawDate);
  }

  // 4. Customer PO Number (Optional)
  if (root.poNumber !== undefined || root.po_number !== undefined || root.poNo !== undefined || root.customerPo !== undefined || root.po !== undefined) {
    appState.poNumber = String(root.poNumber || root.po_number || root.poNo || root.customerPo || root.po || '').trim();
  }

  // 5. Client details
  if (root.clientName !== undefined || root.client_name !== undefined || root.customerName !== undefined || root.client !== undefined) {
    appState.clientName = String(root.clientName || root.client_name || root.customerName || root.client || '');
  }
  if (root.clientAddress1 !== undefined || root.client_address1 !== undefined || root.address1 !== undefined) {
    appState.clientAddress1 = String(root.clientAddress1 || root.client_address1 || root.address1 || '');
  }
  if (root.clientAddress2 !== undefined || root.client_address2 !== undefined || root.address2 !== undefined) {
    appState.clientAddress2 = String(root.clientAddress2 || root.client_address2 || root.address2 || '');
  }
  if (root.supplyState !== undefined || root.supply_state !== undefined || root.state !== undefined) {
    appState.supplyState = String(root.supplyState || root.supply_state || root.state || 'Tamil Nadu');
  }

  // 6. GST Mode & Layout Density
  const rawGst = root.gstMode || root.gst_mode;
  if (['without-gst', 'with-gst', 'igst'].includes(rawGst)) {
    appState.gstMode = rawGst;
  }
  const rawDensity = root.layoutDensity || root.layout_density;
  if (['multi', 'compact'].includes(rawDensity)) {
    appState.layoutDensity = rawDensity;
  }

  // 7. Line Items
  const rawItems = root.items || root.lineItems || root.line_items || root.products || root.services;
  if (Array.isArray(rawItems) && rawItems.length > 0) {
    appState.items = rawItems.map((item, idx) => ({
      id: 'item-' + Date.now() + '-' + idx,
      description: item.description || item.desc || item.name || item.title || '',
      qty: parseFloat(item.qty || item.quantity || item.count || 1) || 1,
      rate: parseFloat(item.rate || item.price || item.unitPrice || item.unit_rate || 0) || 0
    }));
  }

  // 8. Company defaults (if present)
  if (root.company && typeof root.company === 'object') {
    appState.company = { ...appState.company, ...root.company };
  }

  // Sync editor & preview
  syncFormValues();
  renderEditorItems();
  updatePreview();
  saveState();

  // If on mobile, switch to Edit view
  const appLayout = document.getElementById('appLayout');
  const tabBtnEdit = document.getElementById('tabBtnEdit');
  const tabBtnPreview = document.getElementById('tabBtnPreview');
  if (appLayout && window.innerWidth <= 850) {
    appLayout.classList.remove('view-preview');
    appLayout.classList.add('view-edit');
    if (tabBtnEdit) tabBtnEdit.classList.add('active');
    if (tabBtnPreview) tabBtnPreview.classList.remove('active');
  }

  showToast(`Loaded "${appState.invoiceNo || 'Document'}" from ${fileName}! Ready to edit.`, 'success');
}

/**
 * Parses and populates invoice data from CSV file
 */
function loadInvoiceFromCsv(csvText, fileName) {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    showToast('The CSV file is empty.', 'error');
    return;
  }

  const items = [];
  let isItemSection = false;

  for (let line of lines) {
    // Simple CSV parser supporting quotes
    const cells = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cells.length < 2) continue;

    const key = cells[0].toLowerCase();
    const val = cells[1];

    if (key.includes('description') || key.includes('item') || key.includes('s.no')) {
      isItemSection = true;
      continue;
    }

    if (!isItemSection) {
      if (key.includes('invoice no') || key.includes('doc no') || key === 'number') {
        appState.invoiceNo = val;
      } else if (key.includes('po') || key.includes('purchase order')) {
        appState.poNumber = val;
      } else if (key.includes('date')) {
        appState.invoiceDate = normalizeDateForInput(val);
      } else if (key.includes('client') || key.includes('customer')) {
        appState.clientName = val;
      } else if (key.includes('address 1') || key.includes('address1')) {
        appState.clientAddress1 = val;
      } else if (key.includes('address 2') || key.includes('address2')) {
        appState.clientAddress2 = val;
      } else if (key.includes('supply') || key.includes('place')) {
        appState.supplyState = val;
      }
    } else {
      // Line item row: [Description, Qty, Rate] or [S.No, Description, Qty, Rate, Amount]
      let desc = '';
      let qty = 1;
      let rate = 0;

      if (cells.length >= 3 && !isNaN(parseFloat(cells[1]))) {
        desc = cells[0];
        qty = parseFloat(cells[1]) || 1;
        rate = parseFloat(cells[2]) || 0;
      } else if (cells.length >= 4 && !isNaN(parseFloat(cells[2]))) {
        desc = cells[1];
        qty = parseFloat(cells[2]) || 1;
        rate = parseFloat(cells[3]) || 0;
      }

      if (desc) {
        items.push({
          id: 'item-' + Date.now() + '-' + items.length,
          description: desc,
          qty: qty,
          rate: rate
        });
      }
    }
  }

  if (items.length > 0) {
    appState.items = items;
  }

  syncFormValues();
  renderEditorItems();
  updatePreview();
  saveState();

  showToast(`Loaded ${items.length} items from CSV "${fileName}"! Ready to edit.`, 'success');
}

/**
 * Exports current invoice state to a local JSON file
 */
function exportInvoiceToFile() {
  const safeDocNo = (appState.invoiceNo || 'DRAFT').replace(/[^a-zA-Z0-9_-]/g, '_');
  const formattedDate = formatDateDisplay(appState.invoiceDate);
  const docType = appState.docType || 'INVOICE';
  const filename = `${docType}_${safeDocNo}_${formattedDate}.json`;

  const exportPayload = {
    app: 'Mithra Air Cool Invoice Suite',
    version: '1.0',
    exportDate: formatDateDisplay(new Date()),
    docType: appState.docType,
    invoiceNo: appState.invoiceNo,
    invoiceDate: appState.invoiceDate,
    formattedDate: formattedDate,
    poNumber: appState.poNumber || '',
    clientName: appState.clientName,
    clientAddress1: appState.clientAddress1,
    clientAddress2: appState.clientAddress2,
    supplyState: appState.supplyState,
    gstMode: appState.gstMode,
    layoutDensity: appState.layoutDensity,
    items: appState.items.map(item => ({
      description: item.description,
      qty: Number(item.qty) || 0,
      rate: Number(item.rate) || 0
    })),
    company: appState.company
  };

  const jsonBlob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const downloadUrl = URL.createObjectURL(jsonBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);

  showToast(`Saved "${filename}" to your computer!`, 'success');
}

// ==========================================================================
// FORM SYNCHRONIZATION & EVENT BINDINGS
// ==========================================================================
function bindFormInputs() {
  // Document Type Selector (Invoice / Quotation / Quote)
  const docTypeBtns = document.querySelectorAll('#docTypeSelector button[data-doctype]');
  docTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.doctype;
      appState.docType = type;
      docTypeBtns.forEach(b => b.classList.toggle('active', b.dataset.doctype === type));
      updateDocLabels();
      updatePreview();
      saveState();
    });
  });

  // Invoice / Document Meta
  const inputInvoiceNo = document.getElementById('inputInvoiceNo');
  const inputInvoiceDate = document.getElementById('inputInvoiceDate');
  const inputPoNumber = document.getElementById('inputPoNumber');

  inputInvoiceNo.value = appState.invoiceNo;
  inputInvoiceDate.value = normalizeDateForInput(appState.invoiceDate);
  updateDateHint();

  inputInvoiceNo.addEventListener('input', (e) => {
    appState.invoiceNo = e.target.value;
    updatePreview();
    saveState();
  });

  inputInvoiceDate.addEventListener('change', (e) => {
    appState.invoiceDate = e.target.value;
    updateDateHint();
    updatePreview();
    saveState();
  });

  // Customer PO Number (Optional)
  if (inputPoNumber) {
    inputPoNumber.value = appState.poNumber || '';
    inputPoNumber.addEventListener('input', (e) => {
      appState.poNumber = e.target.value;
      updatePreview();
      saveState();
    });
  }

  // Client Info
  const inputClientName = document.getElementById('inputClientName');
  const inputClientAddress1 = document.getElementById('inputClientAddress1');
  const inputClientAddress2 = document.getElementById('inputClientAddress2');
  const inputSupplyState = document.getElementById('inputSupplyState');

  inputClientName.value = appState.clientName;
  inputClientAddress1.value = appState.clientAddress1;
  inputClientAddress2.value = appState.clientAddress2;
  inputSupplyState.value = appState.supplyState;

  inputClientName.addEventListener('input', (e) => {
    appState.clientName = e.target.value;
    updatePreview();
    saveState();
  });

  inputClientAddress1.addEventListener('input', (e) => {
    appState.clientAddress1 = e.target.value;
    updatePreview();
    saveState();
  });

  inputClientAddress2.addEventListener('input', (e) => {
    appState.clientAddress2 = e.target.value;
    updatePreview();
    saveState();
  });

  inputSupplyState.addEventListener('input', (e) => {
    appState.supplyState = e.target.value;
    updatePreview();
    saveState();
  });

  // GST Radios
  const gstRadios = document.querySelectorAll('input[name="gstMode"]');
  gstRadios.forEach(radio => {
    if (radio.value === appState.gstMode) {
      radio.checked = true;
    }
    radio.addEventListener('change', (e) => {
      appState.gstMode = e.target.value;
      updatePreview();
      saveState();
    });
  });

  // Page Density / Splitting Selector
  const btnMulti = document.getElementById('btnModeMultiPage');
  const btnCompact = document.getElementById('btnModeCompact');

  if (appState.layoutDensity === 'compact') {
    btnCompact.classList.add('active');
    btnMulti.classList.remove('active');
  } else {
    btnMulti.classList.add('active');
    btnCompact.classList.remove('active');
  }

  btnMulti.addEventListener('click', () => {
    appState.layoutDensity = 'multi';
    btnMulti.classList.add('active');
    btnCompact.classList.remove('active');
    updatePreview();
    saveState();
  });

  btnCompact.addEventListener('click', () => {
    appState.layoutDensity = 'compact';
    btnCompact.classList.add('active');
    btnMulti.classList.remove('active');
    updatePreview();
    saveState();
  });

  // Collapsible Company Inputs
  const bindCompanyInput = (id, key) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = appState.company[key] || '';
    el.addEventListener('input', (e) => {
      appState.company[key] = e.target.value;
      updatePreview();
      saveState();
    });
  };

  bindCompanyInput('inputGstNo', 'gstNo');
  bindCompanyInput('inputBankName', 'bankName');
  bindCompanyInput('inputAccountNo', 'accountNo');
  bindCompanyInput('inputIfsc', 'ifsc');
  bindCompanyInput('inputBranch', 'branch');
  bindCompanyInput('inputBeneficiary', 'beneficiary');
  bindCompanyInput('inputPhone', 'phone');
  bindCompanyInput('inputEmail', 'email');

  // Top Buttons
  document.getElementById('btnAddItem').addEventListener('click', addLineItem);
  document.getElementById('btnPrintInvoice').addEventListener('click', () => window.print());

  // Save / Export File Button
  const btnSaveFile = document.getElementById('btnSaveFile');
  if (btnSaveFile) {
    btnSaveFile.addEventListener('click', exportInvoiceToFile);
  }

  // Upload / Import File (Local File Editing)
  const fileUploadInput = document.getElementById('fileUploadInput');
  const btnUploadFile = document.getElementById('btnUploadFile');
  const btnUploadCardAction = document.getElementById('btnUploadCardAction');
  const fileDropZone = document.getElementById('fileDropZone');

  if (fileUploadInput) {
    fileUploadInput.addEventListener('change', (e) => {
      handleFiles(e.target.files);
      // Reset input so re-uploading the same file still triggers change
      e.target.value = '';
    });
  }

  if (btnUploadFile && fileUploadInput) {
    btnUploadFile.addEventListener('click', () => fileUploadInput.click());
  }

  if (btnUploadCardAction && fileUploadInput) {
    btnUploadCardAction.addEventListener('click', (e) => {
      e.stopPropagation();
      fileUploadInput.click();
    });
  }

  if (fileDropZone && fileUploadInput) {
    fileDropZone.addEventListener('click', () => fileUploadInput.click());

    fileDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileDropZone.classList.add('drag-over');
    });

    fileDropZone.addEventListener('dragleave', () => {
      fileDropZone.classList.remove('drag-over');
    });

    fileDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      fileDropZone.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    });
  }

  document.getElementById('btnLoadSample').addEventListener('click', () => {
    if (confirm('Load original sample invoice data? Any unsaved edits will be replaced.')) {
      appState = JSON.parse(JSON.stringify(SAMPLE_DATA));
      syncFormValues();
      renderEditorItems();
      updatePreview();
      saveState();
      showToast('Sample invoice data loaded.', 'info');
    }
  });

  document.getElementById('btnNewInvoice').addEventListener('click', () => {
    if (confirm('Create new blank invoice?')) {
      let nextNo = 'MAC/12/25-26';
      const match = appState.invoiceNo.match(/MAC\/(\d+)\/(.*)/);
      if (match) {
        const num = parseInt(match[1], 10) + 1;
        nextNo = `MAC/${num}/${match[2]}`;
      }

      const today = new Date().toISOString().split('T')[0];

      appState.invoiceNo = nextNo;
      appState.invoiceDate = today;
      appState.poNumber = '';
      appState.clientName = '';
      appState.clientAddress1 = '';
      appState.clientAddress2 = '';
      appState.gstMode = 'without-gst';
      appState.items = [
        {
          id: 'item-' + Date.now(),
          description: '',
          qty: 1,
          rate: 0
        }
      ];

      syncFormValues();
      renderEditorItems();
      updatePreview();
      saveState();
      showToast('Created new blank invoice MAC/' + nextNo, 'info');
    }
  });

  // Mobile Navigation Setup
  setupMobileNavigation();

  // Zoom Controls
  setupZoomControls();
}

function syncFormValues() {
  const docType = appState.docType || 'INVOICE';
  const docTypeBtns = document.querySelectorAll('#docTypeSelector button[data-doctype]');
  docTypeBtns.forEach(b => b.classList.toggle('active', b.dataset.doctype === docType));
  updateDocLabels();

  document.getElementById('inputInvoiceNo').value = appState.invoiceNo || '';
  document.getElementById('inputInvoiceDate').value = normalizeDateForInput(appState.invoiceDate);
  updateDateHint();

  const inputPoNumber = document.getElementById('inputPoNumber');
  if (inputPoNumber) {
    inputPoNumber.value = appState.poNumber || '';
  }

  document.getElementById('inputClientName').value = appState.clientName || '';
  document.getElementById('inputClientAddress1').value = appState.clientAddress1 || '';
  document.getElementById('inputClientAddress2').value = appState.clientAddress2 || '';
  document.getElementById('inputSupplyState').value = appState.supplyState || '';

  const gstRadio = document.querySelector(`input[name="gstMode"][value="${appState.gstMode}"]`);
  if (gstRadio) gstRadio.checked = true;
}

// ==========================================================================
// MOBILE NAVIGATION CONTROLS
// ==========================================================================
function setupMobileNavigation() {
  const appLayout = document.getElementById('appLayout');
  const tabBtnEdit = document.getElementById('tabBtnEdit');
  const tabBtnPreview = document.getElementById('tabBtnPreview');
  const btnFloatingPrint = document.getElementById('btnFloatingPrint');
  const btnFloatingBack = document.getElementById('btnFloatingBack');

  appLayout.classList.add('view-edit');

  const switchView = (view) => {
    mobileActiveView = view;
    if (view === 'edit') {
      appLayout.classList.remove('view-preview');
      appLayout.classList.add('view-edit');
      tabBtnEdit.classList.add('active');
      tabBtnPreview.classList.remove('active');
    } else {
      appLayout.classList.remove('view-edit');
      appLayout.classList.add('view-preview');
      tabBtnPreview.classList.add('active');
      tabBtnEdit.classList.remove('active');
      // Auto-fit invoice to mobile screen width
      autoFitMobileZoom();
    }
  };

  tabBtnEdit.addEventListener('click', () => switchView('edit'));
  tabBtnPreview.addEventListener('click', () => switchView('preview'));
  if (btnFloatingPrint) {
    btnFloatingPrint.addEventListener('click', () => window.print());
  }
  if (btnFloatingBack) {
    btnFloatingBack.addEventListener('click', () => switchView('edit'));
  }
}

function autoFitMobileZoom() {
  const viewport = document.getElementById('previewViewport');
  if (viewport && window.innerWidth <= 850) {
    const availableWidth = window.innerWidth - 32;
    const targetScale = Math.min(1.0, Math.max(0.4, availableWidth / 794));
    const container = document.getElementById('invoicePagesContainer');
    if (container) {
      container.style.transform = `scale(${targetScale})`;
      document.getElementById('zoomDisplay').textContent = Math.round(targetScale * 100) + '%';
    }
  }
}

// ==========================================================================
// ZOOM CONTROLS
// ==========================================================================
function setupZoomControls() {
  const container = document.getElementById('invoicePagesContainer');
  const zoomDisplay = document.getElementById('zoomDisplay');

  const setZoom = (z) => {
    currentZoom = Math.min(Math.max(z, 0.4), 1.6);
    container.style.transform = `scale(${currentZoom})`;
    zoomDisplay.textContent = Math.round(currentZoom * 100) + '%';
  };

  document.getElementById('btnZoomIn').addEventListener('click', () => {
    setZoom(currentZoom + 0.1);
  });

  document.getElementById('btnZoomOut').addEventListener('click', () => {
    setZoom(currentZoom - 0.1);
  });

  document.getElementById('btnZoomReset').addEventListener('click', () => {
    const viewport = document.getElementById('previewViewport');
    const availableWidth = viewport.clientWidth - 48;
    const targetZoom = Math.min(1.0, availableWidth / 794);
    setZoom(targetZoom);
  });

  // Handle window resize
  window.addEventListener('resize', () => {
    if (window.innerWidth <= 850 && mobileActiveView === 'preview') {
      autoFitMobileZoom();
    }
  });
}

// ==========================================================================
// PERSISTENCE (LOCAL STORAGE)
// ==========================================================================
function saveState() {
  try {
    localStorage.setItem('mithra_invoice_app_state', JSON.stringify(appState));
  } catch (e) {
    console.warn('LocalStorage save failed:', e);
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem('mithra_invoice_app_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.items && parsed.items.length > 0) {
        appState = parsed;
      }
    }
  } catch (e) {
    console.warn('LocalStorage load failed:', e);
  }
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  bindFormInputs();
  syncFormValues();
  renderEditorItems();
  updatePreview();
});
