/**
 * MITHRA AIR COOL - INVOICE GENERATOR APPLICATION
 * Core logic: State management, Auto-adjusting table, Indian Currency Words, GST toggle, Printing.
 */

// --- Default Data matching original invoice sample ---
const SAMPLE_DATA = {
  invoiceNo: 'MAC/11/25-26',
  invoiceDate: '2026-07-14',
  clientName: 'Prathyusha Engineering College',
  clientAddress1: 'Aranvoyalkuppam,Poonaamallee-TiruvallurRoad,Tiruvallur',
  clientAddress2: 'Tamil Nadu 602025',
  supplyState: 'Tamil Nadu',
  gstMode: 'without-gst', // 'without-gst', 'with-gst', 'igst'
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

  // Lakhs (>= 1,00,000)
  if (remaining >= 100000) {
    const lakhs = Math.floor(remaining / 100000);
    parts.push(convertTwoDigits(lakhs) + ' Lakh');
    remaining %= 100000;
  }

  // Thousands (>= 1,000)
  if (remaining >= 1000) {
    const thousands = Math.floor(remaining / 1000);
    // Matching sample style: "Seven thousand" (lowercase 'thousand' or capitalized)
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
// FORMATTING UTILITIES
// ==========================================================================
function formatCurrency(val) {
  const num = Number(val) || 0;
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]} / ${parts[1]} / ${parts[0]}`;
  }
  return dateStr;
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
      <div class="item-calc-grid">
        <div class="form-group">
          <label>Qty</label>
          <input type="number" class="item-qty-input" value="${item.qty}" min="1" step="1">
        </div>
        <div class="form-group">
          <label>Rate (₹)</label>
          <input type="number" class="item-rate-input" value="${item.rate}" min="0" step="0.01">
        </div>
        <div class="item-amount-display">
          <span class="amount-label">Amount</span>
          <span class="amount-value">${formatCurrency(rowAmount)}</span>
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

// Render the Live A4 Invoice Sheet preview
function updatePreview() {
  // 1. Header & Meta
  document.getElementById('previewInvoiceNo').textContent = appState.invoiceNo || '';
  document.getElementById('previewInvoiceDate').textContent = formatDateDisplay(appState.invoiceDate);

  // Tax Info
  document.getElementById('previewGstNo').textContent = appState.company.gstNo;
  document.getElementById('previewState').textContent = appState.company.state;
  document.getElementById('previewStateCode').textContent = appState.company.stateCode;

  // Client Info
  document.getElementById('previewClientName').textContent = appState.clientName || 'Valued Customer';
  document.getElementById('previewClientAddress1').textContent = appState.clientAddress1 || '';
  document.getElementById('previewClientAddress2').textContent = appState.clientAddress2 || '';
  document.getElementById('previewSupplyText').textContent = 'Supply: ' + (appState.supplyState || 'Tamil Nadu');

  // Bank Info
  document.getElementById('previewBankName').textContent = appState.company.bankName;
  document.getElementById('previewAccountNo').textContent = appState.company.accountNo;
  document.getElementById('previewBranch').textContent = appState.company.branch;
  document.getElementById('previewIfsc').textContent = appState.company.ifsc;
  document.getElementById('previewBeneficiary').textContent = appState.company.beneficiary;

  // Footer Contacts
  document.getElementById('previewPhone').textContent = appState.company.phone;
  document.getElementById('previewEmail').textContent = appState.company.email;

  // 2. Line Items Table (Auto Adjusting)
  const tbody = document.getElementById('previewTableBody');
  tbody.innerHTML = '';

  let subTotal = 0;

  appState.items.forEach((item, index) => {
    const amount = (Number(item.qty) || 0) * (Number(item.rate) || 0);
    subTotal += amount;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-sno">${index + 1}</td>
      <td class="col-desc">${escapeHtml(item.description) || '&nbsp;'}</td>
      <td class="col-qty">${item.qty}</td>
      <td class="col-rate">${Number(item.rate).toFixed(2)}</td>
      <td class="col-amount">${amount.toFixed(2)}</td>
    `;
    tbody.appendChild(tr);
  });

  // 3. Tax Calculations & Grand Total
  const rowCgst = document.getElementById('rowCgst');
  const rowSgst = document.getElementById('rowSgst');
  const rowIgst = document.getElementById('rowIgst');

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let grandTotal = subTotal;

  if (appState.gstMode === 'with-gst') {
    // Intra-State 18% (9% + 9%)
    cgstAmount = Math.round((subTotal * 0.09) * 100) / 100;
    sgstAmount = Math.round((subTotal * 0.09) * 100) / 100;
    grandTotal = subTotal + cgstAmount + sgstAmount;

    rowCgst.classList.remove('hide');
    rowSgst.classList.remove('hide');
    rowIgst.classList.add('hide');

    document.getElementById('previewCgst').textContent = formatCurrency(cgstAmount);
    document.getElementById('previewSgst').textContent = formatCurrency(sgstAmount);

  } else if (appState.gstMode === 'igst') {
    // Inter-State 18%
    igstAmount = Math.round((subTotal * 0.18) * 100) / 100;
    grandTotal = subTotal + igstAmount;

    rowCgst.classList.add('hide');
    rowSgst.classList.add('hide');
    rowIgst.classList.remove('hide');

    document.getElementById('previewIgst').textContent = formatCurrency(igstAmount);

  } else {
    // Without GST (Default as in sample: CGST ₹0, SGST ₹0)
    rowCgst.classList.remove('hide');
    rowSgst.classList.remove('hide');
    rowIgst.classList.add('hide');

    document.getElementById('previewCgst').textContent = '₹0';
    document.getElementById('previewSgst').textContent = '₹0';
    grandTotal = subTotal;
  }

  // Display Sub Total and Grand Total
  document.getElementById('previewSubTotal').textContent = formatCurrency(subTotal);
  document.getElementById('previewGrandTotal').textContent = formatCurrency(grandTotal);
  document.getElementById('sidebarGrandTotal').textContent = formatCurrency(grandTotal);

  // Amount in words
  const words = convertNumberToWords(grandTotal);
  document.getElementById('previewAmountWords').textContent = words;
}

// Helper to escape HTML tags
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

// ==========================================================================
// FORM SYNCHRONIZATION
// ==========================================================================
function bindFormInputs() {
  // Invoice Meta
  const inputInvoiceNo = document.getElementById('inputInvoiceNo');
  const inputInvoiceDate = document.getElementById('inputInvoiceDate');

  inputInvoiceNo.value = appState.invoiceNo;
  inputInvoiceDate.value = appState.invoiceDate;

  inputInvoiceNo.addEventListener('input', (e) => {
    appState.invoiceNo = e.target.value;
    updatePreview();
    saveState();
  });

  inputInvoiceDate.addEventListener('change', (e) => {
    appState.invoiceDate = e.target.value;
    updatePreview();
    saveState();
  });

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
  document.getElementById('btnPrintInvoice').addEventListener('click', () => {
    window.print();
  });

  document.getElementById('btnLoadSample').addEventListener('click', () => {
    if (confirm('Load original sample invoice data? Any unsaved edits will be replaced.')) {
      appState = JSON.parse(JSON.stringify(SAMPLE_DATA));
      syncFormValues();
      renderEditorItems();
      updatePreview();
      saveState();
    }
  });

  document.getElementById('btnNewInvoice').addEventListener('click', () => {
    if (confirm('Create new blank invoice?')) {
      // Auto-increment invoice number if possible
      let nextNo = 'MAC/12/25-26';
      const match = appState.invoiceNo.match(/MAC\/(\d+)\/(.*)/);
      if (match) {
        const num = parseInt(match[1], 10) + 1;
        nextNo = `MAC/${num}/${match[2]}`;
      }

      // Today's date YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];

      appState.invoiceNo = nextNo;
      appState.invoiceDate = today;
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
    }
  });

  // Zoom buttons
  setupZoomControls();
}

function syncFormValues() {
  document.getElementById('inputInvoiceNo').value = appState.invoiceNo;
  document.getElementById('inputInvoiceDate').value = appState.invoiceDate;
  document.getElementById('inputClientName').value = appState.clientName;
  document.getElementById('inputClientAddress1').value = appState.clientAddress1;
  document.getElementById('inputClientAddress2').value = appState.clientAddress2;
  document.getElementById('inputSupplyState').value = appState.supplyState;

  const gstRadio = document.querySelector(`input[name="gstMode"][value="${appState.gstMode}"]`);
  if (gstRadio) gstRadio.checked = true;
}

// ==========================================================================
// ZOOM CONTROLS
// ==========================================================================
function setupZoomControls() {
  const sheet = document.getElementById('invoiceSheet');
  const zoomDisplay = document.getElementById('zoomDisplay');

  const setZoom = (z) => {
    currentZoom = Math.min(Math.max(z, 0.45), 1.6);
    sheet.style.transform = `scale(${currentZoom})`;
    zoomDisplay.textContent = Math.round(currentZoom * 100) + '%';
  };

  document.getElementById('btnZoomIn').addEventListener('click', () => {
    setZoom(currentZoom + 0.1);
  });

  document.getElementById('btnZoomOut').addEventListener('click', () => {
    setZoom(currentZoom - 0.1);
  });

  document.getElementById('btnZoomReset').addEventListener('click', () => {
    // Auto-fit to viewport width
    const viewport = document.getElementById('previewViewport');
    const availableWidth = viewport.clientWidth - 48;
    const targetZoom = Math.min(1.0, availableWidth / 794);
    setZoom(targetZoom);
  });

  // Initial fit adjustment for smaller screens
  setTimeout(() => {
    const viewport = document.getElementById('previewViewport');
    if (viewport && viewport.clientWidth < 860) {
      const fit = (viewport.clientWidth - 40) / 794;
      setZoom(Math.max(0.65, fit));
    }
  }, 100);
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
  renderEditorItems();
  updatePreview();
});
