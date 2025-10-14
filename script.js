// script.js (module)
// Remplace localStorage par Firebase Realtime Database.
// Nécessite : firebase-init.js qui exporte `db`
// Chargé en <script type="module" src="./script.js"></script>

import { db } from './firebase-init.js';
import {
  ref,
  onValue,
  push,
  set,
  update,
  remove,
  get
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

class PaymentManager {
  constructor() {
    // Remplacement du localStorage: on attend les listeners Firebase
    this.members = [];
    this.payments = [];
    this.lots = [];

    this.currentTab = 'dashboard';
    this.currentMonth = new Date().getMonth();
    this.currentYear = new Date().getFullYear();

    // initialisation UI et listeners
    this.init();
    // Initialise l'écoute realtime Firebase
    this.initRealtimeListeners();
  }

  /* -------------------
     Initialisation UI
     ------------------- */
  init() {
    this.setupEventListeners();
    this.setupMemberEventListeners();
    this.loadDefaultLots(); // si besoin de lots par défaut
    this.updateUI();
    this.updateStats();
    this.populateFilters();
  }

  setupEventListeners() {
    // boutons globaux
    const addMemberBtn = document.getElementById('addMemberBtn');
    if (addMemberBtn) addMemberBtn.addEventListener('click', () => this.showAddMemberModal());

    const addPaymentBtn = document.getElementById('addPaymentBtn');
    if (addPaymentBtn) addPaymentBtn.addEventListener('click', () => this.showAddPaymentModal());

    const exportPDFBtn = document.getElementById('exportPDF');
    if (exportPDFBtn) exportPDFBtn.addEventListener('click', () => this.exportStatistics());

    const memberSearch = document.getElementById('memberSearch');
    if (memberSearch) memberSearch.addEventListener('input', () => this.renderMembers());

    const paymentSearch = document.getElementById('paymentSearch');
    if (paymentSearch) paymentSearch.addEventListener('input', () => this.renderPayments());

    const lotSearch = document.getElementById('lotSearch');
    if (lotSearch) lotSearch.addEventListener('input', () => this.renderLots());

    const prevMonth = document.getElementById('prevMonth');
    const nextMonth = document.getElementById('nextMonth');
    if (prevMonth) prevMonth.addEventListener('click', () => { this.changeMonth(-1); });
    if (nextMonth) nextMonth.addEventListener('click', () => { this.changeMonth(1); });

    // Filtre mois / membre pour paiements
    const monthFilter = document.getElementById('monthFilter');
    if (monthFilter) monthFilter.addEventListener('change', () => this.renderPayments());

    const memberFilter = document.getElementById('memberFilter');
    if (memberFilter) memberFilter.addEventListener('change', () => this.renderPayments());
  }

  setupMemberEventListeners() {
    const membersGrid = document.getElementById('membersGrid');
    if (!membersGrid) return;

    membersGrid.addEventListener('click', (e) => {
      e.preventDefault();
      const t = e.target;

      // Ajouter paiement
      if (t.matches('.member-add-payment, .member-add-payment *')) {
        const el = t.closest('[data-member-id]');
        const memberId = el?.dataset?.memberId;
        if (memberId) this.showAddPaymentModal(memberId);
      }

      // Editer
      if (t.matches('.member-edit, .member-edit *')) {
        const el = t.closest('[data-member-id]');
        const memberId = el?.dataset?.memberId;
        if (memberId) this.showEditMemberModal(memberId);
      }

      // Supprimer
      if (t.matches('.member-delete, .member-delete *')) {
        const el = t.closest('[data-member-id]');
        const memberId = el?.dataset?.memberId;
        if (memberId && confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) {
          this.deleteMember(memberId);
        }
      }
    });
  }

  /* -------------------
     Firebase realtime listeners
     ------------------- */
  initRealtimeListeners() {
    // Members
    const membersRef = ref(db, 'members');
    onValue(membersRef, (snapshot) => {
      const data = snapshot.val() || {};
      this.members = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      this.renderMembers();
      this.updateHeaderStats();
    });

    // Payments
    const paymentsRef = ref(db, 'payments');
    onValue(paymentsRef, (snapshot) => {
      const data = snapshot.val() || {};
      this.payments = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      this.renderPayments();
      this.updateHeaderStats();
    });

    // Lots
    const lotsRef = ref(db, 'lots');
    onValue(lotsRef, (snapshot) => {
      const data = snapshot.val() || {};
      this.lots = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      this.renderLots();
      this.updateHeaderStats();
    });
  }

  /* -------------------
     CRUD: Members
     ------------------- */
  async addMember(member) {
    try {
      const r = push(ref(db, 'members'));
      await set(r, { ...member, createdAt: Date.now() });
      this.showToast('Membre ajouté', 'success');
    } catch (err) {
      console.error(err);
      this.showToast('Erreur ajout membre', 'error');
    }
  }

  async updateMember(id, patch) {
    try {
      await update(ref(db, `members/${id}`), { ...patch, updatedAt: Date.now() });
      this.showToast('Membre mis à jour', 'success');
    } catch (err) {
      console.error(err);
      this.showToast('Erreur mise à jour membre', 'error');
    }
  }

  async deleteMember(id) {
    try {
      // Optionnel : supprimer les paiements liés ? (non fait automatiquement ici)
      await remove(ref(db, `members/${id}`));
      this.showToast('Membre supprimé', 'success');
    } catch (err) {
      console.error(err);
      this.showToast('Erreur suppression membre', 'error');
    }
  }

  /* -------------------
     CRUD: Payments
     ------------------- */
  async addPayment(payment) {
    try {
      const r = push(ref(db, 'payments'));
      await set(r, { ...payment, createdAt: Date.now() });
      this.showToast('Paiement ajouté', 'success');
    } catch (err) {
      console.error(err);
      this.showToast('Erreur ajout paiement', 'error');
    }
  }

  async updatePayment(id, patch) {
    try {
      await update(ref(db, `payments/${id}`), { ...patch, updatedAt: Date.now() });
      this.showToast('Paiement mis à jour', 'success');
    } catch (err) {
      console.error(err);
      this.showToast('Erreur mise à jour paiement', 'error');
    }
  }

  async deletePayment(id) {
    try {
      await remove(ref(db, `payments/${id}`));
      this.showToast('Paiement supprimé', 'success');
    } catch (err) {
      console.error(err);
      this.showToast('Erreur suppression paiement', 'error');
    }
  }

  /* -------------------
     CRUD: Lots
     ------------------- */
  async addLot(lot) {
    try {
      const r = push(ref(db, 'lots'));
      await set(r, { ...lot, createdAt: Date.now() });
      this.showToast('Lot ajouté', 'success');
    } catch (err) {
      console.error(err);
      this.showToast('Erreur ajout lot', 'error');
    }
  }

  async updateLot(id, patch) {
    try {
      await update(ref(db, `lots/${id}`), { ...patch, updatedAt: Date.now() });
      this.showToast('Lot mis à jour', 'success');
    } catch (err) {
      console.error(err);
      this.showToast('Erreur mise à jour lot', 'error');
    }
  }

  async deleteLot(id) {
    try {
      await remove(ref(db, `lots/${id}`));
      this.showToast('Lot supprimé', 'success');
    } catch (err) {
      console.error(err);
      this.showToast('Erreur suppression lot', 'error');
    }
  }

  /* -------------------
     Migration (OPTIONNEL) : localStorage -> Firebase
     Lance une seule fois si tu veux transférer l'existant
     ------------------- */
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

      console.log('Migration locale -> Firebase terminée');
      this.showToast('Migration terminée', 'success');
    } catch (err) {
      console.error('Erreur migration', err);
      this.showToast('Erreur migration', 'error');
    }
  }

  /* -------------------
     Render / UI helpers
     ------------------- */
  renderMembers() {
    const container = document.getElementById('membersGrid');
    if (!container) return;

    const query = (document.getElementById('memberSearch')?.value || '').toLowerCase();
    const statusFilter = (document.getElementById('memberStatusFilter')?.value || '').toLowerCase();

    const filtered = this.members.filter(m => {
      const matchQuery = m.name?.toLowerCase().includes(query) || m.phone?.toLowerCase()?.includes(query) || m.email?.toLowerCase()?.includes(query);
      const matchStatus = !statusFilter || (m.status || '').toLowerCase() === statusFilter;
      return matchQuery && matchStatus;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state"><h3>Aucun membre</h3><p>Ajoute des membres pour commencer.</p></div>`;
      return;
    }

    container.innerHTML = '';
    filtered.forEach(member => {
      const paidCount = this.payments.filter(p => p.memberId === member.id).length;
      const card = document.createElement('div');
      card.className = 'member-card';
      card.dataset.memberId = member.id;
      card.innerHTML = `
        <div class="member-header">
          <div class="member-info">
            <div class="member-avatar">${this.getInitials(member.name)}</div>
            <div class="member-details">
              <div class="member-name">${member.name || '—'}</div>
              <div class="member-email">${member.email || ''}</div>
            </div>
          </div>
          <div class="member-actions">
            <button class="btn btn-small member-add-payment" data-member-id="${member.id}"><i class="fas fa-plus"></i> Paiement</button>
            <button class="btn btn-ghost member-edit" data-member-id="${member.id}"><i class="fas fa-edit"></i></button>
            <button class="btn btn-danger member-delete" data-member-id="${member.id}"><i class="fas fa-trash"></i></button>
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
      `;
      container.appendChild(card);
    });
  }

  renderPayments() {
    const container = document.getElementById('paymentsList') || document.getElementById('recentPayments');
    if (!container) return;

    const query = (document.getElementById('paymentSearch')?.value || '').toLowerCase();
    const monthFilterVal = document.getElementById('monthFilter')?.value || '';
    const memberFilterVal = document.getElementById('memberFilter')?.value || '';

    let list = [...this.payments];
    if (monthFilterVal) {
      // monthFilterVal expected format 'YYYY-MM' or similar; we'll compare month index if it's numeric
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
      return (
        (!query) ||
        (name.toLowerCase().includes(query)) ||
        (String(p.amount || '').toLowerCase().includes(query))
      );
    });

    // Trier par date desc
    list.sort((a, b) => new Date(b.date) - new Date(a.date));

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
            <div class="payment-date">${new Date(p.date).toLocaleString()}</div>
          </div>
          <div class="payment-amount">${this.formatCurrency(p.amount || 0)}</div>
        </div>
        <div class="payment-details">
          <div class="payment-month">${p.month || ''}</div>
          <div class="payment-actions">
            <button class="btn btn-small" onclick="paymentManager.printReceipt('${p.id}')"><i class="fas fa-print"></i></button>
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
    const filtered = this.lots.filter(l => (l.name || '').toLowerCase().includes(query) || (l.location || '').toLowerCase().includes(query));

    if (filtered.length === 0) {
      container.innerHTML = `<div class="empty-state"><h3>Aucun lot</h3><p>Ajoute des lots ici.</p></div>`;
      return;
    }

    container.innerHTML = '';
    filtered.forEach(lot => {
      const item = document.createElement('div');
      item.className = 'lot-card';
      item.dataset.lotId = lot.id;
      item.innerHTML = `
        <div class="lot-card-header">
          <div class="lot-title-row">
            <h4 class="lot-title">${lot.name}</h4>
            <span class="lot-price">${this.formatCurrency(lot.price || 0)}</span>
          </div>
          <div class="lot-location">📍 ${lot.location || '-'}</div>
        </div>
        <div class="lot-body">
          <p class="lot-description">${lot.description || ''}</p>
          <div class="lot-actions">
            <button class="btn btn-small" onclick="paymentManager.showLotDetails('${lot.id}')">Détails</button>
            <button class="btn btn-small btn-danger" onclick="paymentManager.deleteLot('${lot.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `;
      container.appendChild(item);
    });
  }

  /* -------------------
     Utilitaires / UI small helpers
     ------------------- */
  getInitials(name = '') {
    return name.split(' ').map(s => s.charAt(0)).slice(0,2).join('').toUpperCase() || 'U';
  }

  formatCurrency(value = 0) {
    try {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(Number(value));
    } catch (e) {
      return `${value} FCFA`;
    }
  }

  showToast(message, type = 'info') {
    // simple toast
    const container = document.getElementById('toastContainer') || document.body;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      position: fixed; left: 20px; bottom: 20px;
      background: ${type === 'success' ? '#27AE60' : type === 'error' ? '#E74C3C' : '#3498DB'};
      color: white; padding: 12px 16px; border-radius: 8px; z-index: 9999;
      box-shadow: 0 6px 18px rgba(0,0,0,0.12);
    `;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 400); }, 3000);
  }

  showNotification(message, type = 'info') {
    // plus visible (utilisé ailleurs dans ton ancien code)
    this.showToast(message, type);
  }

  /* -------------------
     Dashboard / Stats / Helpers
     ------------------- */
  updateHeaderStats() {
    // appelé quand members/payments/lots change
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
    return monthlyPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  }

  getMonthlyPayments() {
    return this.payments.filter(payment => {
      const paymentDate = new Date(payment.date);
      return paymentDate.getMonth() === this.currentMonth &&
             paymentDate.getFullYear() === this.currentYear;
    });
  }

  updateUI() {
    switch (this.currentTab) {
      case 'dashboard': this.updateDashboard(); break;
      case 'members': this.renderMembers(); break;
      case 'payments': this.renderPayments(); break;
      case 'lots': this.renderLots(); break;
      case 'statistics': this.updateStatistics(); break;
      default: this.renderMembers();
    }
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
    const totalCollected = monthlyPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalExpected = this.members.reduce((sum, m) => sum + (Number(m.monthlyQuota) || 0), 0);
    const completionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
    const totalLotsValue = this.lots.reduce((s, l) => s + (Number(l.price) || 0), 0);

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
    if (progressFill) progressFill.style.width = `${Math.min(completionRate, 100)}%`;
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
    const recentContainer = document.getElementById('recentPayments');
    if (!recentContainer) return;
    // renderPayments already handles recentPayments if container id matches
    this.renderPayments();
  }

  updateRecentActions() {
    const recentActions = document.getElementById('recentActions');
    if (!recentActions) return;
    recentActions.innerHTML = `<div class="empty-state"><p>Aucune action récente</p></div>`;
  }

  /* -------------------
     Simple modals / prompts pour Ajouter / Editer (tu peux remplacer par tes modals existants)
     ------------------- */
  async showAddMemberModal() {
    const name = prompt('Nom du membre :');
    if (!name) return;
    const phone = prompt('Téléphone (optionnel) :') || '';
    const email = prompt('Email (optionnel) :') || '';
    const monthlyQuotaRaw = prompt('Quota mensuel (nombre) :', '0') || '0';
    const monthlyQuota = Number(monthlyQuotaRaw) || 0;
    await this.addMember({ name, phone, email, monthlyQuota });
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
      // demander le membre
      const memberName = prompt('Nom du membre (recherche) :');
      member = this.members.find(m => (m.name || '').toLowerCase() === (memberName || '').toLowerCase());
      if (!member) { this.showToast('Membre non trouvé', 'error'); return; }
    }

    const amount = Number(prompt(`Montant de paiement pour ${member.name} :`, '0')) || 0;
    const date = new Date().toISOString();
    const month = `${date.slice(0,7)}`; // YYYY-MM
    await this.addPayment({ memberId: member.id, amount, date, month });
  }

  showLotDetails(lotId) {
    const lot = this.lots.find(l => l.id === lotId);
    if (!lot) { this.showToast('Lot introuvable', 'error'); return; }
    alert(`Lot: ${lot.name}\nPrix: ${this.formatCurrency(lot.price)}\nLocalisation: ${lot.location || '-'}\n\n${lot.description || ''}`);
  }

  /* -------------------
     Statistiques / Export minimal
     ------------------- */
  exportStatistics() {
    const year = this.currentYear;
    // Minimal: on télécharge JSON
    const payload = {
      members: this.members,
      payments: this.payments.filter(p => new Date(p.date).getFullYear() === Number(year)),
      lots: this.lots
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistiques_${year}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Export JSON généré', 'success');
  }

  printReceipt(paymentId) {
    const payment = this.payments.find(p => p.id === paymentId);
    if (!payment) { this.showToast('Paiement introuvable', 'error'); return; }
    const member = this.members.find(m => m.id === payment.memberId) || {};
    // Génération simple de reçu : nouvelle fenêtre
    const html = `
      <h2>Reçu de paiement</h2>
      <p>Membre: ${member.name || '-'}</p>
      <p>Montant: ${this.formatCurrency(payment.amount)}</p>
      <p>Date: ${new Date(payment.date).toLocaleString()}</p>
      <p>Référence: ${payment.id}</p>
    `;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.print();
    w.close();
  }

  /* -------------------
     Utilitaires divers
     ------------------- */
  populateFilters() {
    // remplit le select memberFilter
    const memberFilter = document.getElementById('memberFilter');
    if (!memberFilter) return;
    memberFilter.innerHTML = `<option value="">Tous les Membres</option>`;
    this.members.forEach(m => {
      const o = document.createElement('option');
      o.value = m.id;
      o.textContent = m.name || m.id;
      memberFilter.appendChild(o);
    });

    // remplir monthFilter (ex simple : les 12 mois de l'année courante)
    const monthFilter = document.getElementById('monthFilter');
    if (!monthFilter) return;
    const y = new Date().getFullYear();
    monthFilter.innerHTML = `<option value="">Tous les Mois</option>`;
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0');
      const opt = document.createElement('option');
      opt.value = `${y}-${mm}`;
      opt.textContent = `${y}-${mm}`;
      monthFilter.appendChild(opt);
    }
  }

  loadDefaultLots() {
    // Optionnel : si tu veux lots par défaut quand base vide
    if (this.lots.length === 0) {
      // nothing by default
    }
  }

  updateStatistics() {
    // placeholder si tu as un tableau plus complet
    this.updatePerformanceTable?.();
  }

  updatePerformanceTable() {
    // Si ton HTML possède performanceTableBody
    const selectedYear = document.getElementById('statsYearFilter')?.value || new Date().getFullYear();
    const tableBody = document.getElementById('performanceTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    // Calcul simple: nombre paiements par mois et montant
    const monthNames = ['Jan','Fev','Mar','Avr','Mai','Jun','Jul','Aou','Sep','Oct','Nov','Dec'];
    const monthlyData = {};
    for (let i = 0; i < 12; i++) monthlyData[i] = { payments: 0, amount: 0, newMembers: 0 };
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
    for (let i = 0; i < 12; i++) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${monthNames[i]}</td>
        <td>${monthlyData[i].payments}</td>
        <td>${this.formatCurrency(monthlyData[i].amount)}</td>
        <td>${monthlyData[i].newMembers}</td>
        <td>-</td>
      `;
      tableBody.appendChild(row);
    }
  }
}

/* -------------------
   Instanciation
   ------------------- */
let app;
document.addEventListener('DOMContentLoaded', () => {
  window.paymentManager = new PaymentManager();
});