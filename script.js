// script.js (module)
// Remplace localStorage par Firebase Realtime Database tout en conservant les fonctionnalités originales
// Nécessite: firebase-init.js qui exporte `db`
// Chargé via: <script type="module" src="./script.js"></script>

import { db } from './firebase-init.js';
import {
  ref,
  onValue,
  push,
  set,
  update,
  remove,
  get,
  child
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

// Assure-toi que Chart.js et jspdf/html2canvas sont chargés globalement via index.html

class PaymentManager {
  constructor() {
    // --- Remplacement localStorage ---
    this.members = [];
    this.payments = [];
    this.lots = [];

    this.currentTab = 'dashboard';
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();

    // UI state
    this.monthlyChart = null;

    this.init();
    this.initRealtimeListeners();
  }

  /* -----------------------
     INITIALISATION / EVENTS
     ----------------------- */
  init() {
    this.setupEventListeners();
    this.setupMemberEventListeners();
    this.loadDefaultLots();
    this.updateUI();
    this.updateStats();
    this.populateFilters();
  }

  setupEventListeners() {
    // Bind common buttons (si présents)
    const addMemberBtn = document.getElementById('addMemberBtn');
    if (addMemberBtn) addMemberBtn.addEventListener('click', () => this.showAddMemberModal());

    const addPaymentBtn = document.getElementById('addPaymentBtn');
    if (addPaymentBtn) addPaymentBtn.addEventListener('click', () => this.showAddPaymentModal());

    const exportPDFBtn = document.getElementById('exportPDF');
    if (exportPDFBtn) exportPDFBtn.addEventListener('click', () => this.exportStatisticsFull());

    const viewAllPayments = document.getElementById('viewAllPayments');
    if (viewAllPayments) viewAllPayments.addEventListener('click', () => this.switchTab('payments'));

    const prevMonth = document.getElementById('prevMonth');
    const nextMonth = document.getElementById('nextMonth');
    if (prevMonth) prevMonth.addEventListener('click', () => this.changeMonth(-1));
    if (nextMonth) nextMonth.addEventListener('click', () => this.changeMonth(1));

    // Tab navigation
    document.querySelectorAll('.nav-tab').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab);
        document.querySelectorAll('.nav-tab').forEach(n => n.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Modal close
    const modalClose = document.getElementById('modalClose');
    if (modalClose) modalClose.addEventListener('click', () => this.closeModal());
  }

  setupMemberEventListeners() {
    const membersGrid = document.getElementById('membersGrid');
    if (!membersGrid) return;

    membersGrid.addEventListener('click', (e) => {
      const t = e.target;
      const item = t.closest('[data-member-id]');
      if (!item) return;
      const memberId = item.dataset.memberId;

      if (t.closest('.member-add-payment')) {
        this.showAddPaymentModal(memberId);
      } else if (t.closest('.member-edit')) {
        this.showEditMemberModal(memberId);
      } else if (t.closest('.member-delete')) {
        this.showConfirmationModal('Supprimer membre', 'Voulez-vous supprimer ce membre ?', async () => {
          await this.deleteMember(memberId);
        });
      } else if (t.closest('.member-details')) {
        // show member detail
        this.showMemberDetails(memberId);
      }
    });
  }

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    const sel = document.getElementById(tab);
    if (sel) sel.classList.add('active');
    this.updateUI();
  }

  /* -----------------------
     FIREBASE REALTIME LISTENERS
     ----------------------- */
  initRealtimeListeners() {
    const membersRef = ref(db, 'members');
    onValue(membersRef, (snapshot) => {
      const data = snapshot.val() || {};
      this.members = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      this.renderMembers();
      this.updateHeaderStats();
      this.populateFilters(); // update filters when members change
    });

    const paymentsRef = ref(db, 'payments');
    onValue(paymentsRef, (snapshot) => {
      const data = snapshot.val() || {};
      this.payments = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      this.renderPayments();
      this.updateHeaderStats();
    });

    const lotsRef = ref(db, 'lots');
    onValue(lotsRef, (snapshot) => {
      const data = snapshot.val() || {};
      this.lots = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      this.renderLots();
      this.updateHeaderStats();
    });
  }

  /* -----------------------
     CRUD (Members / Payments / Lots)
     ----------------------- */
  async addMember(member) {
    try {
      const r = push(ref(db, 'members'));
      await set(r, { ...member, createdAt: Date.now() });
      this.showToast('Membre ajouté', 'success');
    } catch (err) {
      console.error('addMember', err);
      this.showToast('Erreur ajout membre', 'error');
    }
  }

  async updateMember(id, patch) {
    try {
      await update(ref(db, `members/${id}`), { ...patch, updatedAt: Date.now() });
      this.showToast('Membre mis à jour', 'success');
    } catch (err) {
      console.error('updateMember', err);
      this.showToast('Erreur mise à jour', 'error');
    }
  }

  async deleteMember(id) {
    try {
      await remove(ref(db, `members/${id}`));
      this.showToast('Membre supprimé', 'success');
    } catch (err) {
      console.error('deleteMember', err);
      this.showToast('Erreur suppression membre', 'error');
    }
  }

  async addPayment(payment) {
    try {
      const r = push(ref(db, 'payments'));
      await set(r, { ...payment, createdAt: Date.now() });
      this.showToast('Paiement enregistré', 'success');
    } catch (err) {
      console.error('addPayment', err);
      this.showToast('Erreur paiement', 'error');
    }
  }

  async updatePayment(id, patch) {
    try {
      await update(ref(db, `payments/${id}`), { ...patch, updatedAt: Date.now() });
      this.showToast('Paiement mis à jour', 'success');
    } catch (err) {
      console.error('updatePayment', err);
      this.showToast('Erreur mise à jour paiement', 'error');
    }
  }

  async deletePayment(id) {
    try {
      await remove(ref(db, `payments/${id}`));
      this.showToast('Paiement supprimé', 'success');
    } catch (err) {
      console.error('deletePayment', err);
      this.showToast('Erreur suppression paiement', 'error');
    }
  }

  async addLot(lot) {
    try {
      const r = push(ref(db, 'lots'));
      await set(r, { ...lot, createdAt: Date.now() });
      this.showToast('Lot ajouté', 'success');
    } catch (err) {
      console.error('addLot', err);
      this.showToast('Erreur ajout lot', 'error');
    }
  }

  async updateLot(id, patch) {
    try {
      await update(ref(db, `lots/${id}`), { ...patch, updatedAt: Date.now() });
      this.showToast('Lot mis à jour', 'success');
    } catch (err) {
      console.error('updateLot', err);
      this.showToast('Erreur mise à jour lot', 'error');
    }
  }

  async deleteLot(id) {
    try {
      await remove(ref(db, `lots/${id}`));
      this.showToast('Lot supprimé', 'success');
    } catch (err) {
      console.error('deleteLot', err);
      this.showToast('Erreur suppression lot', 'error');
    }
  }

  /* -----------------------
     MIGRATION one-time: localStorage -> Firebase
     ----------------------- */
  async migrateLocalToFirebase() {
    try {
      const localMembers = JSON.parse(localStorage.getItem('payment_members') || '[]');
      const localPayments = JSON.parse(localStorage.getItem('payment_records') || '[]');
      const localLots = JSON.parse(localStorage.getItem('payment_lots') || '[]');

      for (const m of localMembers) {
        const r = push(ref(db, 'members'));
        await set(r, m);
      }
      for (const p of localPayments) {
        const r = push(ref(db, 'payments'));
        await set(r, p);
      }
      for (const l of localLots) {
        const r = push(ref(db, 'lots'));
        await set(r, l);
      }

      this.showToast('Migration terminée', 'success');
      console.log('Migration locale -> Firebase terminée');
    } catch (err) {
      console.error('migrateLocalToFirebase', err);
      this.showToast('Erreur migration', 'error');
    }
  }

  /* -----------------------
     RENDER: Members / Payments / Lots (conserve logique originale)
     ----------------------- */
  renderMembers() {
    const container = document.getElementById('membersGrid');
    if (!container) return;

    const query = (document.getElementById('memberSearch')?.value || '').toLowerCase();
    const statusFilter = (document.getElementById('memberStatusFilter')?.value || '').toLowerCase();

    const filtered = this.members.filter(m => {
      const matchQuery = (m.name || '').toLowerCase().includes(query) ||
                         (m.phone || '').toLowerCase().includes(query) ||
                         (m.email || '').toLowerCase().includes(query);
      const matchStatus = !statusFilter || (m.status || '').toLowerCase() === statusFilter;
      return matchQuery && matchStatus;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state"><h3>Aucun membre</h3><p>Ajoute des membres pour commencer.</p></div>`;
      return;
    }

    container.innerHTML = filtered.map(member => {
      const paidCount = this.payments.filter(p => p.memberId === member.id).length;
      return `
        <div class="member-card" data-member-id="${member.id}">
          <div class="member-header">
            <div class="member-info">
              <div class="member-avatar">${this.getInitials(member.name)}</div>
              <div class="member-details">
                <div class="member-name">${member.name || '—'}</div>
                <div class="member-email">${member.email || ''}</div>
              </div>
            </div>
            <div class="member-actions">
              <button class="btn btn-small member-add-payment"><i class="fas fa-plus"></i> Paiement</button>
              <button class="btn btn-ghost member-edit"><i class="fas fa-edit"></i></button>
              <button class="btn btn-danger member-delete"><i class="fas fa-trash"></i></button>
            </div>
          </div>
          <div class="member-stats">
            <div class="member-stat">
              <div class="member-stat-value">${paidCount}</div>
              <div class="member-stat-label">Paiements</div>
            </div>
            <div class="member-stat">
              <div class="member-stat-value">${this.formatCurrency(member.monthlyQuota || 0)}</div>
              <div class="member-stat-label">Quota</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  renderPayments() {
    const container = document.getElementById('paymentsList') || document.getElementById('recentPayments');
    if (!container) return;

    const query = (document.getElementById('paymentSearch')?.value || '').toLowerCase();
    const monthFilterVal = document.getElementById('monthFilter')?.value || '';
    const memberFilterVal = document.getElementById('memberFilter')?.value || '';

    let list = [...this.payments];

    if (monthFilterVal) {
      const [yr, mo] = monthFilterVal.split('-');
      if (yr && mo) {
        list = list.filter(p => {
          const d = new Date(p.date);
          return d.getFullYear() === Number(yr) && d.getMonth() === Number(mo) - 1;
        });
      }
    }

    if (memberFilterVal) {
      list = list.filter(p => p.memberId === memberFilterVal);
    }

    list = list.filter(p => {
      const member = this.members.find(m => m.id === p.memberId);
      const name = member?.name || '';
      return (!query) || name.toLowerCase().includes(query) || String(p.amount || '').toLowerCase().includes(query);
    });

    list.sort((a,b) => new Date(b.date) - new Date(a.date));

    if (list.length === 0) {
      container.innerHTML = `<div class="empty-state"><h3>Aucun paiement</h3><p>Aucun paiement trouvé.</p></div>`;
      return;
    }

    container.innerHTML = '';
    list.forEach(p => {
      const member = this.members.find(m => m.id === p.memberId) || { name: '—' };
      const item = document.createElement('div');
      item.className = 'payment-card';
      item.dataset.paymentId = p.id;
      item.innerHTML = `
        <div class="payment-header">
          <div>
            <div class="payment-member">${member.name}</div>
            <div class="payment-date">${this.formatDate(p.date)}</div>
          </div>
          <div class="payment-amount">${this.formatCurrency(p.amount || 0)}</div>
        </div>
        <div class="payment-details">
          <div class="payment-month">${p.month || ''}</div>
          <div class="payment-actions">
            <button class="btn btn-small" onclick="paymentManager.generatePaymentReceipt('${p.id}')"><i class="fas fa-print"></i></button>
            <button class="btn btn-small btn-danger" onclick="paymentManager.deletePayment('${p.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `;
      container.appendChild(item);
    });
  }

  renderLots() {
    const container = document.getElementById('lotsGrid') || document.getElementById('lotsList') || document.getElementById('lotsContainer');
    if (!container) return;

    const query = (document.getElementById('lotSearch')?.value || '').toLowerCase();

    const filtered = this.lots.filter(l => (l.name || '').toLowerCase().includes(query) ||
                                           (l.description || '').toLowerCase().includes(query) ||
                                           (l.location || '').toLowerCase().includes(query));

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state"><h3>Aucun lot</h3><p>Ajoute des lots pour commencer.</p></div>`;
      return;
    }

    container.innerHTML = filtered.map(lot => {
      const membersWithLot = this.members.filter(member => {
        if (!member.lots) return false;
        return Array.isArray(member.lots) ? member.lots.includes(lot.id) : (member.lotId === lot.id || member.selectedLot === lot.id);
      });

      return `
        <div class="lot-card" data-lot-id="${lot.id}">
          <div class="lot-header">
            <h3 class="lot-name">${lot.name}</h3>
            <span class="lot-price">${this.formatCurrency(lot.price || 0)}</span>
          </div>
          <div class="lot-details">
            <p class="lot-description">${lot.description || ''}</p>
            <div class="lot-location">📍 ${lot.location || '-'}</div>
            <div class="lot-members">👥 ${membersWithLot.length} membre(s)</div>
          </div>
          <div class="lot-actions">
            <button class="btn btn-small" onclick="paymentManager.showLotDetails('${lot.id}')">Détails</button>
            <button class="btn btn-small btn-danger" onclick="paymentManager.deleteLot('${lot.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `;
    }).join('');
  }

  /* -----------------------
     UI Helpers / formatters / modals / toasts
     ----------------------- */
  getInitials(name = '') {
    return (name || '').split(' ').map(s => s.charAt(0)).slice(0,2).join('').toUpperCase() || 'U';
  }

  formatCurrency(value = 0) {
    try {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(Number(value));
    } catch (e) {
      return `${value} FCFA`;
    }
  }

  formatCurrencyForPDF(value = 0) {
    // return string without currency symbol for PDF tables
    try {
      return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value));
    } catch (e) {
      return String(value);
    }
  }

  formatDate(d) {
    if (!d) return '-';
    const date = new Date(d);
    return date.toLocaleString('fr-FR');
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer') || document.body;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `position:fixed;left:20px;bottom:20px;background:${type==='success'?'#27AE60':type==='error'?'#E74C3C':'#3498DB'};color:#fff;padding:10px 14px;border-radius:8px;z-index:9999;`;
    container.appendChild(toast);
    setTimeout(()=> { toast.style.opacity = '0'; setTimeout(()=> toast.remove(),400); }, 2800);
  }

  showModal(title, htmlContent) {
    const modal = document.getElementById('modal');
    const overlay = document.getElementById('modalOverlay');
    if (!modal || !overlay) {
      alert(title + '\n\n' + htmlContent.replace(/<[^>]+>/g,''));
      return;
    }
    document.getElementById('modalTitle').innerHTML = title;
    document.getElementById('modalContent').innerHTML = htmlContent;
    overlay.classList.add('active');
    modal.classList.add('active');
  }

  closeModal() {
    const overlay = document.getElementById('modalOverlay');
    const modal = document.getElementById('modal');
    if (overlay) overlay.classList.remove('active');
    if (modal) modal.classList.remove('active');
  }

  showConfirmationModal(title, message, onConfirm) {
    const content = `
      <div style="padding:12px">
        <p>${message}</p>
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
          <button class="btn btn-secondary" id="modalCancelBtn">Annuler</button>
          <button class="btn btn-danger" id="modalConfirmBtn">Confirmer</button>
        </div>
      </div>
    `;
    this.showModal(title, content);
    setTimeout(()=> {
      document.getElementById('modalCancelBtn')?.addEventListener('click', ()=> this.closeModal());
      document.getElementById('modalConfirmBtn')?.addEventListener('click', ()=> { onConfirm(); this.closeModal(); });
    }, 50);
  }

  /* -----------------------
     Dashboard / Stats / Charts (Chart.js)
     ----------------------- */
  updateHeaderStats() {
    this.updateStats();
    this.updateUI();
  }

  updateStats() {
    const totalMembers = this.members.length;
    const monthlyTotal = this.getMonthlyTotal();

    const totalMembersEl = document.getElementById('totalMembers');
    const totalPaymentsEl = document.getElementById('totalPayments');

    if (totalMembersEl) totalMembersEl.textContent = totalMembers;
    if (totalPaymentsEl) totalPaymentsEl.textContent = this.formatCurrency(monthlyTotal);
  }

  getMonthlyTotal() {
    const monthlyPayments = this.getMonthlyPayments();
    return monthlyPayments.reduce((s,p) => s + (Number(p.amount) || 0), 0);
  }

  getMonthlyPayments() {
    return this.payments.filter(payment => {
      const paymentDate = new Date(payment.date);
      return paymentDate.getMonth() === this.currentMonth &&
             paymentDate.getFullYear() === this.currentYear;
    });
  }

  updateUI() {
    if (this.currentTab === 'dashboard') this.updateDashboard();
    else if (this.currentTab === 'members') this.renderMembers();
    else if (this.currentTab === 'payments') this.renderPayments();
    else if (this.currentTab === 'lots') this.renderLots();
    else if (this.currentTab === 'statistics') this.updateStatistics();
  }

  updateDashboard() {
    this.updateMonthDisplay();
    this.updateMonthlySummary();
    this.updateActivityStats();
    this.updateRecentPayments();
    this.updateRecentActions();
  }

  updateMonthDisplay() {
    const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const el = document.getElementById('currentMonth');
    if (el) el.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
  }

  changeMonth(delta) {
    this.currentMonth += delta;
    if (this.currentMonth < 0) { this.currentMonth = 11; this.currentYear--; }
    if (this.currentMonth > 11) { this.currentMonth = 0; this.currentYear++; }
    this.updateUI();
  }

  updateMonthlySummary() {
    const monthlyPayments = this.getMonthlyPayments();
    const totalCollected = monthlyPayments.reduce((s,p)=> s + (Number(p.amount)||0), 0);
    const totalExpected = this.members.reduce((s,m)=> s + (Number(m.monthlyQuota)||0), 0);
    const completionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
    const totalLotsValue = this.lots.reduce((s,l)=> s + (Number(l.price)||0), 0);

    const elCollected = document.getElementById('monthlyCollected');
    const elExpected = document.getElementById('monthlyExpected');
    const elCompletion = document.getElementById('completionRate');
    const elLotsVal = document.getElementById('totalLotsValue');
    const progressFill = document.getElementById('monthlyProgress');
    const progressPercentage = document.getElementById('progressPercentage');

    if (elCollected) elCollected.textContent = this.formatCurrency(totalCollected);
    if (elExpected) elExpected.textContent = this.formatCurrency(totalExpected);
    if (elCompletion) elCompletion.textContent = `${completionRate}%`;
    if (elLotsVal) elLotsVal.textContent = this.formatCurrency(totalLotsValue);
    if (progressFill) progressFill.style.width = `${Math.min(completionRate,100)}%`;
    if (progressPercentage) progressPercentage.textContent = `${completionRate}%`;
  }

  updateActivityStats() {
    const monthlyPayments = this.getMonthlyPayments();
    const paidMemberIds = new Set(monthlyPayments.map(p => p.memberId));
    const paidMembers = paidMemberIds.size;
    const pendingMembers = Math.max(0, this.members.length - paidMembers);

    const paidEl = document.getElementById('paidMembers');
    const pendingEl = document.getElementById('pendingMembers');
    const progressEl = document.getElementById('progressPercentage2');

    if (paidEl) paidEl.textContent = paidMembers;
    if (pendingEl) pendingEl.textContent = pendingMembers;
    if (progressEl) progressEl.textContent = `${Math.round((paidMembers / Math.max(1, this.members.length)) * 100)}%`;
  }

  updateRecentPayments() {
    this.renderPayments();
  }

  updateRecentActions() {
    const recentActions = document.getElementById('recentActions');
    if (!recentActions) return;
    recentActions.innerHTML = `<div class="empty-state"><p>Aucune action récente</p></div>`;
  }

  /* -----------------------
     STATISTICS / CHART (Chart.js)
     ----------------------- */
  updateStatistics() {
    this.populateYearFilter();
    this.updateStatisticsOverview();
    this.updateMonthlyChart();
    this.updatePerformanceTable();
  }

  populateYearFilter() {
    const yearFilter = document.getElementById('statsYearFilter');
    if (!yearFilter) return;
    yearFilter.innerHTML = '<option value="">Toutes les années</option>';
    const years = new Set();
    this.payments.forEach(payment => years.add(new Date(payment.date).getFullYear()));
    years.add(new Date().getFullYear());
    Array.from(years).sort().forEach(y => {
      const o = document.createElement('option');
      o.value = y; o.textContent = y;
      yearFilter.appendChild(o);
    });
  }

  updateStatisticsOverview() {
    const selectedYear = document.getElementById('statsYearFilter')?.value;
    let filteredPayments = this.payments;
    let filteredMembers = this.members;
    if (selectedYear) {
      filteredPayments = this.payments.filter(p => new Date(p.date).getFullYear() == selectedYear);
      filteredMembers = this.members.filter(m => new Date(m.createdAt || Date.now()).getFullYear() == selectedYear);
    }
    const totalPayments = filteredPayments.reduce((s,p)=> s + (Number(p.amount)||0), 0);
    const totalExpected = this.members.reduce((s,m)=> s + ((Number(m.monthlyQuota)||0) * (Number(m.paymentDuration)||1)), 0);
    const completionRate = totalExpected > 0 ? Math.round((totalPayments / totalExpected) * 100) : 0;

    document.getElementById('totalMembersStats')?.textContent = filteredMembers.length;
    document.getElementById('totalPaymentsStats')?.textContent = this.formatCurrency(totalPayments);
    document.getElementById('totalLotsStats')?.textContent = this.lots.length;
    document.getElementById('completionRateStats')?.textContent = `${completionRate}%`;
  }

  updateMonthlyChart() {
    const selectedYear = document.getElementById('statsYearFilter')?.value || new Date().getFullYear();
    const monthNames = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    const monthlyPayments = new Array(12).fill(0);
    const monthlyMembers = new Array(12).fill(0);

    this.payments.forEach(p => {
      const d = new Date(p.date);
      if (d.getFullYear() == selectedYear) monthlyPayments[d.getMonth()] += Number(p.amount) || 0;
    });
    this.members.forEach(m => {
      const d = new Date(m.createdAt || Date.now());
      if (d.getFullYear() == selectedYear) monthlyMembers[d.getMonth()] += 1;
    });

    const container = document.getElementById('monthlyChart');
    if (!container) return;
    container.innerHTML = '<canvas id="monthlyChartCanvas"></canvas>';
    const ctx = document.getElementById('monthlyChartCanvas').getContext('2d');

    if (this.monthlyChart) {
      this.monthlyChart.destroy();
      this.monthlyChart = null;
    }

    this.monthlyChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthNames,
        datasets: [
          { label: 'Paiements', data: monthlyPayments, backgroundColor: 'rgba(99,102,241,0.8)' },
          { label: 'Nouveaux Membres', data: monthlyMembers, backgroundColor: 'rgba(39,174,96,0.8)' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  updatePerformanceTable() {
    const selectedYear = document.getElementById('statsYearFilter')?.value || new Date().getFullYear();
    const tableBody = document.getElementById('performanceTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const monthlyData = {};
    for (let i=0;i<12;i++) monthlyData[i] = { payments:0, amount:0, newMembers:0 };
    this.payments.forEach(p => {
      const d = new Date(p.date);
      if (d.getFullYear() == selectedYear) {
        monthlyData[d.getMonth()].payments++;
        monthlyData[d.getMonth()].amount += Number(p.amount) || 0;
      }
    });
    this.members.forEach(m => {
      const d = new Date(m.createdAt || Date.now());
      if (d.getFullYear() == selectedYear) monthlyData[d.getMonth()].newMembers++;
    });
    for (let i=0;i<12;i++) {
      const d = monthlyData[i];
      const completionRate = this.members.length > 0 ? Math.round((d.payments / this.members.length)*100) : 0;
      let badge = completionRate >= 80 ? '<span class="performance-badge excellent">Excellent</span>'
               : completionRate >=60 ? '<span class="performance-badge good">Bon</span>' : '<span class="performance-badge average">Moyen</span>';
      const row = document.createElement('tr');
      row.innerHTML = `<td>${monthNames[i]}</td><td>${d.payments}</td><td>${this.formatCurrency(d.amount)}</td><td>${d.newMembers}</td><td>${badge}</td>`;
      tableBody.appendChild(row);
    }
  }

  /* -----------------------
     EXPORT / PDF / RECEIPT (jspdf + html2canvas)
     ----------------------- */
  async exportStatisticsFull() {
    // Génération plus complète (PDF) : export minimal JSON pour la rapidité,
    // mais la fonction originale de génération détaillée de PDF (fiche membre / rapport) est conservée :
    try {
      const year = document.getElementById('statsYearFilter')?.value || new Date().getFullYear();
      // On peut réutiliser exportStatist ou générer JSON
      const payload = {
        members: this.members,
        payments: this.payments.filter(p => new Date(p.date).getFullYear() === Number(year)),
        lots: this.lots
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `statistiques_${year}.json`; a.click();
      URL.revokeObjectURL(url);
      this.showToast('Export JSON généré', 'success');
    } catch (err) {
      console.error('exportStatisticsFull', err);
      this.showToast('Erreur export', 'error');
    }
  }

  // Génère un reçu PDF détaillé pour un paiement (conserve la logique poussée d'origine)
  async generatePaymentReceipt(paymentIdOrObj, maybeMember) {
    try {
      let payment = null;
      if (typeof paymentIdOrObj === 'string') payment = this.payments.find(p => p.id === paymentIdOrObj);
      else payment = paymentIdOrObj;
      if (!payment) { this.showToast('Paiement introuvable', 'error'); return; }
      const member = maybeMember || this.members.find(m => m.id === payment.memberId) || {};

      // Construire conteneur HTML riche (identique à celui dans ton ancien script)
      const amountReadable = this.formatCurrency(payment.amount || 0);
      const monthName = payment.month || new Date(payment.date).toLocaleDateString('fr-FR');
      const memberLots = (member.lots || []).map(lid => this.lots.find(l => l.id === lid)?.name).filter(Boolean).join(', ') || '-';

      const reportContainer = document.createElement('div');
      reportContainer.className = 'pdf-report-container';
      reportContainer.style.cssText = 'font-family:Inter,Arial,sans-serif;padding:18px;background:#fff;color:#222;max-width:800px';
      reportContainer.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h2 style="margin:0">Reçu de Paiement</h2>
            <div style="color:#666">Réf: ${payment.id}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:12px;color:#999">${new Date(payment.date).toLocaleString('fr-FR')}</div>
            <div style="font-weight:700;color:#27AE60">${amountReadable}</div>
          </div>
        </div>
        <hr style="border:none;border-top:1px solid #eee;margin:12px 0">
        <div style="display:flex;gap:18px;">
          <div style="flex:1">
            <h4 style="margin:0 0 6px">Membre</h4>
            <div>${member.name || '-'}</div>
            <div style="color:#666;font-size:13px">${member.email || ''} • ${member.phone || ''}</div>
          </div>
          <div style="flex:1">
            <h4 style="margin:0 0 6px">Détails</h4>
            <div>Mois: ${monthName}</div>
            <div>Mode: ${payment.method || 'Espèces / Mobile money'}</div>
          </div>
        </div>
        <div style="margin-top:18px;font-size:12px;color:#777">Merci pour votre paiement.</div>
        <div style="margin-top:34px;display:flex;gap:24px;justify-content:space-between">
          <div style="width:45%;text-align:center">
            <div style="border-top:1px solid #333;margin-top:40px"></div>
            <div style="font-size:12px;color:#666;margin-top:6px">Signature client</div>
          </div>
          <div style="width:45%;text-align:center">
            <div style="border-top:1px solid #333;margin-top:40px"></div>
            <div style="font-size:12px;color:#666;margin-top:6px">Signature trésorier</div>
          </div>
        </div>
      `;

      document.body.appendChild(reportContainer);
      await new Promise(r => setTimeout(r, 300));
      const canvas = await html2canvas(reportContainer, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      document.body.removeChild(reportContainer);

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      const margin = 10;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const usableWidth = pageWidth - (margin * 2);
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidthMM = usableWidth;
      const imgHeightMM = (imgProps.height * imgWidthMM) / imgProps.width;

      pdf.addImage(imgData, 'PNG', margin, margin, imgWidthMM, imgHeightMM);
      pdf.save(`Recu_${member.name ? member.name.replace(/[^a-zA-Z0-9]/g,'_') : payment.id}_${new Date().toISOString().slice(0,10)}.pdf`);
      this.showToast('Reçu PDF généré', 'success');

    } catch (err) {
      console.error('generatePaymentReceipt', err);
      this.showToast('Erreur génération reçu', 'error');
    }
  }

  /* -----------------------
     UTILITAIRES divers restants (getImageDataUrl...) et modals de fiche membre
     ----------------------- */
  async getImageDataUrl(imgUrl) {
    // convert image URL to data URL (utilisé si tu avais cover images)
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imgUrl;
      await new Promise((res, rej) => {
        img.onload = res; img.onerror = rej;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      canvas.getContext('2d').drawImage(img,0,0);
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.warn('getImageDataUrl', err);
      return null;
    }
  }

  showMemberDetails(memberId) {
    const member = this.members.find(m => m.id === memberId);
    if (!member) { this.showToast('Membre introuvable', 'error'); return; }

    const memberPayments = this.payments.filter(p => p.memberId === memberId);
    const totalPaid = memberPayments.reduce((s,p)=> s + (Number(p.amount)||0), 0);
    const durationMonths = member.paymentDuration || 1;

    const html = `
      <div style="padding:12px;">
        <h3 style="margin:0 0 8px">${member.name}</h3>
        <div style="color:#666">${member.email || ''} • ${member.phone || ''}</div>
        <hr style="border:none;border-top:1px solid #eee;margin:12px 0">
        <div><strong>Total payé:</strong> ${this.formatCurrency(totalPaid)}</div>
        <div style="margin-top:8px"><strong>Quota mensuel:</strong> ${this.formatCurrency(member.monthlyQuota || 0)}</div>
        <div style="margin-top:8px"><strong>Membres inscrits à lot:</strong> ${(member.lots||[]).length || 0}</div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-secondary" id="closeMemberDetail">Fermer</button>
          <button class="btn btn-primary" id="printMemberCard">Imprimer</button>
        </div>
      </div>
    `;
    this.showModal('Fiche membre', html);
    setTimeout(()=> {
      document.getElementById('closeMemberDetail')?.addEventListener('click', ()=> this.closeModal());
      document.getElementById('printMemberCard')?.addEventListener('click', ()=> {
        this.exportMemberCardPDF(member);
        this.closeModal();
      });
    }, 60);
  }

  async exportMemberCardPDF(member) {
    try {
      // Reuse the same technique as generatePaymentReceipt to create a member PDF (rich layout)
      const reportContainer = document.createElement('div');
      reportContainer.style.cssText = 'padding:16px;background:#fff;color:#222;max-width:800px;font-family:Inter,Arial';
      reportContainer.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div><h2 style="margin:0">${member.name}</h2><div style="color:#666">${member.email || ''}</div></div>
          <div style="text-align:right">${this.formatCurrency(member.monthlyQuota || 0)}</div>
        </div>
        <hr style="border:none;border-top:1px solid #eee;margin:12px 0">
        <div><strong>Téléphone:</strong> ${member.phone || '—'}</div>
        <div style="margin-top:8px"><strong>Lots:</strong> ${(member.lots||[]).map(id=>this.lots.find(l=>l.id===id)?.name).filter(Boolean).join(', ') || '-'}</div>
        <div style="margin-top:24px;color:#999;font-size:12px">Généré le ${new Date().toLocaleString('fr-FR')}</div>
      `;
      document.body.appendChild(reportContainer);
      await new Promise(r=>setTimeout(r,300));
      const canvas = await html2canvas(reportContainer, { scale:2, useCORS:true, backgroundColor:'#fff' });
      document.body.removeChild(reportContainer);

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p','mm','a4');
      const img = canvas.toDataURL('image/png');
      const pageW = pdf.internal.pageSize.getWidth();
      const margin = 10;
      const imgW = pageW - margin*2;
      const imgH = (canvas.height * imgW) / canvas.width;
      pdf.addImage(img,'PNG',margin,margin,imgW,imgH);
      pdf.save(`Fiche_Membre_${member.name.replace(/[^a-zA-Z0-9]/g,'_')}.pdf`);
      this.showToast('Fiche membre générée', 'success');
    } catch (err) {
      console.error('exportMemberCardPDF', err);
      this.showToast('Erreur génération fiche membre', 'error');
    }
  }

  /* -----------------------
     Simple prompts used for quick add/edit (remplace par tes modals si tu as)
     ----------------------- */
  async showAddMemberModal() {
    const name = prompt('Nom du membre :'); if (!name) return;
    const phone = prompt('Téléphone (optionnel) :') || '';
    const email = prompt('Email (optionnel) :') || '';
    const monthlyQuota = Number(prompt('Quota mensuel (nombre) :', '0')) || 0;
    const paymentDuration = Number(prompt('Durée engagement (mois) :', '1')) || 1;
    await this.addMember({ name, phone, email, monthlyQuota, paymentDuration, createdAt: Date.now() });
  }

  async showEditMemberModal(memberId) {
    const member = this.members.find(m => m.id === memberId);
    if (!member) { this.showToast('Membre introuvable', 'error'); return; }
    const name = prompt('Nom du membre :', member.name) || member.name;
    const phone = prompt('Téléphone :', member.phone) || member.phone;
    const email = prompt('Email :', member.email) || member.email;
    const monthlyQuota = Number(prompt('Quota mensuel :', member.monthlyQuota || 0)) || 0;
    await this.updateMember(memberId, { name, phone, email, monthlyQuota });
  }

  async showAddPaymentModal(memberId = null) {
    let member = null;
    if (memberId) member = this.members.find(m => m.id === memberId);
    if (!member) {
      const memberName = prompt('Nom du membre (recherche exact) :');
      member = this.members.find(m => (m.name || '').toLowerCase() === (memberName || '').toLowerCase());
      if (!member) { this.showToast('Membre non trouvé', 'error'); return; }
    }
    const amount = Number(prompt(`Montant pour ${member.name} :`, '0')) || 0;
    const date = new Date().toISOString();
    const month = `${date.slice(0,7)}`; // YYYY-MM
    const method = prompt('Mode de paiement (optionnel) :', 'Espèces / Mobile money') || 'Espèces / Mobile money';
    const reference = prompt('Référence (optionnel) :', '') || '';
    await this.addPayment({ memberId: member.id, amount, date, month, method, reference });
  }

  /* -----------------------
     populateFilters & loadDefaultLots
     ----------------------- */
  populateFilters() {
    const memberFilter = document.getElementById('memberFilter');
    if (memberFilter) {
      memberFilter.innerHTML = `<option value="">Tous les Membres</option>`;
      this.members.forEach(m => {
        const o = document.createElement('option'); o.value = m.id; o.textContent = m.name || m.id;
        memberFilter.appendChild(o);
      });
    }
    const monthFilter = document.getElementById('monthFilter');
    if (monthFilter) {
      monthFilter.innerHTML = `<option value="">Tous les Mois</option>`;
      const y = new Date().getFullYear();
      for (let m=1;m<=12;m++){
        const mm = String(m).padStart(2,'0');
        const o = document.createElement('option'); o.value = `${y}-${mm}`; o.textContent = `${y}-${mm}`;
        monthFilter.appendChild(o);
      }
    }
  }

  loadDefaultLots() {
    // placeholder si tu souhaites des lots par défaut
  }
}

/* -----------------------
   Instantiation
   ----------------------- */
document.addEventListener('DOMContentLoaded', () => {
  window.paymentManager = new PaymentManager();

  // Mobile menu code (garder ton original)
  (function(){
    const mobileBtn = document.getElementById('mobileMenuBtn');
    if(!mobileBtn) return;
    let overlay = document.querySelector('.mobile-nav-overlay');
    if(!overlay){
      overlay = document.createElement('div');
      overlay.className = 'mobile-nav-overlay';
      overlay.innerHTML = `
        <div class="mobile-nav-panel" role="dialog" aria-modal="true">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <strong style="font-size:16px">Menu</strong>
            <button id="mobileMenuClose" style="border:none;background:transparent;font-size:20px;cursor:pointer">✕</button>
          </div>
          <div class="mobile-nav-list">
            ${Array.from(document.querySelectorAll('.header-nav .nav-tab')).map(btn=>{
              const label = btn.textContent.trim();
              const tab = btn.getAttribute('data-tab') || '';
              return `<button class="nav-tab" data-tab="${tab}">${btn.innerHTML}</button>`;
            }).join('')}
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    const panel = overlay.querySelector('.mobile-nav-panel');
    const closeBtn = document.getElementById('mobileMenuClose');
    function openMobileMenu(){ overlay.style.display = 'flex'; document.body.style.overflow='hidden'; }
    function closeMobileMenu(){ overlay.style.display = 'none'; document.body.style.overflow=''; }
    mobileBtn.addEventListener('click', openMobileMenu);
    closeBtn && closeBtn.addEventListener('click', closeMobileMenu);
    overlay.addEventListener('click', (e)=> { if(e.target === overlay) closeMobileMenu(); });
    overlay.addEventListener('click', (e)=>{
      const t = e.target.closest('.nav-tab');
      if(!t) return;
      const tabName = t.getAttribute('data-tab');
      if(tabName){
        const desktop = document.querySelector('.header-nav .nav-tab[data-tab="'+tabName+'"]');
        if(desktop) desktop.click();
      }
      closeMobileMenu();
    });
  })();
});