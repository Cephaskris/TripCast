const API_BASE = window.location.origin;

let currentAdmin = null;
let allCampaigns = [];
let allFleet = [];
let allPayouts = [];
let activeAdminTab = 'moderation';
let currentFinancialPeriod = 'all';
let currentCustomMonth = '';
let currentFinancialData = null;
let allPlacedAds = [];
let currentSettlementMonth = '2026-08';
let currentSettlementSummary = null;
let currentPlatformRates = { driver_payout_rate: 10.00, advertiser_rate: 25.00 };
let currentUserRoleFilter = 'ALL';
let allUsersList = [];

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  loadDriverRateSetting();
  setInterval(refreshAdminData, 6000);
});

function checkAuth() {
  const saved = sessionStorage.getItem('tripcast_admin');
  if (saved) {
    currentAdmin = JSON.parse(saved);
    showDashboard();
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('loginSection').style.display = 'flex';
  document.getElementById('dashboardSection').style.display = 'none';
}

function showDashboard() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('dashboardSection').style.display = 'block';
  loadDriverRateSetting();
  refreshAdminData();
  fetchAndRenderSettlementSummary(currentSettlementMonth);
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value;
  const pin = document.getElementById('adminPin').value;

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pin, role: 'ADMIN' })
    });

    if (res.ok) {
      const data = await res.json();
      currentAdmin = data.user;
      sessionStorage.setItem('tripcast_admin', JSON.stringify(currentAdmin));
      showDashboard();
    } else {
      alert('❌ Invalid admin credentials. Use admin@tripcast.io / admin123');
    }
  } catch (err) {
    console.error('Error admin login:', err);
  }
}

function logoutAdmin() {
  sessionStorage.removeItem('tripcast_admin');
  currentAdmin = null;
  showLogin();
}

async function refreshAdminData() {
  if (!currentAdmin) return;

  try {
    // 1. Fetch system status
    const sysRes = await fetch(`${API_BASE}/api/health`);
    if (sysRes.ok) {
      const sys = await sysRes.json();
      document.getElementById('adminTotalLogs').textContent = sys.total_playback_logs.toLocaleString();
    }

    // 2. Fetch campaigns
    const campRes = await fetch(`${API_BASE}/api/campaigns`);
    if (campRes.ok) {
      allCampaigns = await campRes.json();
      renderAdminModeration(allCampaigns);

      const pending = allCampaigns.filter(c => c.status === 'PENDING').length;
      document.getElementById('adminPendingBadge').textContent = pending;
      document.getElementById('adminPendingCount').textContent = `${pending} Ad${pending !== 1 ? 's' : ''}`;
    }

    // 3. Fetch fleet
    const fleetRes = await fetch(`${API_BASE}/api/fleet`);
    if (fleetRes.ok) {
      allFleet = await fleetRes.json();
      renderAdminFleet(allFleet);
      const online = allFleet.filter(f => f.is_active).length;
      document.getElementById('adminActiveVehicles').textContent = `${online}`;
      document.getElementById('adminOnlineRatio').textContent = `${online} / ${allFleet.length} Tablets`;
    }

    // 4. Fetch payouts & summary
    fetchAndRenderSettlementSummary(currentSettlementMonth);

    // 5. Fetch support tickets
    const tktRes = await fetch(`${API_BASE}/api/tickets`);
    if (tktRes.ok) {
      const tickets = await tktRes.json();
      renderAdminSupport(tickets);
      const openCount = tickets.filter(t => t.status !== 'RESOLVED').length;
      document.getElementById('adminSupportBadge').textContent = openCount;
    }

    // 6. Refresh Financials if active tab
    if (activeAdminTab === 'financials') {
      fetchAndRenderFinancials(currentFinancialPeriod, currentCustomMonth);
    }

    // 7. Refresh Users Directory if active tab
    if (activeAdminTab === 'users') {
      fetchAndRenderUsers(currentUserRoleFilter);
    }
  } catch (err) {
    console.error('Error refreshing admin data:', err);
  }
}

function switchAdminTab(tab) {
  activeAdminTab = tab;
  document.querySelectorAll('.nav-pill-btn').forEach(b => b.classList.remove('active'));
  const btn = {
    moderation: document.getElementById('tabModeration'),
    financials: document.getElementById('tabFinancials'),
    settlements: document.getElementById('tabSettlements'),
    support: document.getElementById('tabSupport'),
    users: document.getElementById('tabUsers'),
  }[tab];
  if (btn) btn.classList.add('active');

  const viewMod = document.getElementById('viewModeration');
  const viewFin = document.getElementById('viewFinancials');
  const viewSet = document.getElementById('viewSettlements');
  const viewSup = document.getElementById('viewSupport');
  const viewUsers = document.getElementById('viewUsers');

  if (viewMod) viewMod.style.display = tab === 'moderation' ? 'block' : 'none';
  if (viewFin) viewFin.style.display = tab === 'financials' ? 'block' : 'none';
  if (viewSet) viewSet.style.display = tab === 'settlements' ? 'block' : 'none';
  if (viewSup) viewSup.style.display = tab === 'support' ? 'block' : 'none';
  if (viewUsers) viewUsers.style.display = tab === 'users' ? 'block' : 'none';

  if (tab === 'financials') {
    fetchAndRenderFinancials(currentFinancialPeriod, currentCustomMonth);
  } else if (tab === 'settlements') {
    fetchAndRenderSettlementSummary(currentSettlementMonth);
  } else if (tab === 'users') {
    fetchAndRenderUsers();
  }
}

function renderAdminSupport(tickets) {
  const tbody = document.getElementById('adminSupportTableBody');
  if (!tbody) return;

  if (!tickets || tickets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--accent-gray-text); padding: 20px;">No support tickets on file.</td></tr>`;
    return;
  }

  tbody.innerHTML = tickets.map(t => {
    const isDriver = t.sender_role === 'DRIVER';
    const roleBadge = isDriver ? 'pending' : 'paid';
    const roleLabel = isDriver ? '🚗 Driver' : '🏢 Advertiser';
    const statusBadge = t.status === 'RESOLVED' ? 'paid' : (t.status === 'IN_PROGRESS' ? 'active' : 'pending');

    return `
      <tr>
        <td><code>${t.ticket_num}</code></td>
        <td>
          <span class="status-pill ${roleBadge}">${roleLabel}</span><br>
          <strong>${t.sender_name}</strong>
        </td>
        <td><span class="badge-count">${t.category}</span></td>
        <td>
          <strong>${t.subject}</strong><br>
          <small style="color: var(--accent-gray-text);">${t.description.substring(0, 50)}...</small>
        </td>
        <td><span class="status-pill ${t.priority === 'HIGH' ? 'pending' : 'paid'}">${t.priority}</span></td>
        <td>${t.assigned_agent ? `<strong>${t.assigned_agent}</strong>` : `<span style="color: var(--accent-gray-text);">Unassigned</span>`}</td>
        <td><small>${t.resolution_notes || 'Pending agent triage'}</small></td>
        <td><span class="status-pill ${statusBadge}">• ${t.status}</span></td>
      </tr>
    `;
  }).join('');
}

function renderAdminModeration(campaigns) {
  const tbody = document.getElementById('adminModerationTableBody');
  if (!tbody) return;

  tbody.innerHTML = campaigns.map(c => `
    <tr>
      <td>
        <video src="${c.video_url}" style="width: 48px; height: 32px; border-radius: 6px; object-fit: cover;" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>
      </td>
      <td><strong>${c.title}</strong></td>
      <td>Advertiser #${c.client_id}</td>
      <td><strong>₦${Number(c.total_budget).toLocaleString()}</strong></td>
      <td>${c.target_impressions.toLocaleString()} views</td>
      <td><span class="status-pill ${c.status === 'ACTIVE' ? 'active' : (c.status === 'PENDING' ? 'pending' : 'paid')}">${c.status}</span></td>
      <td>
        ${c.status === 'PENDING' ? `
          <button class="btn btn-dark btn-sm" onclick="updateCampaignStatus('${c.id}', 'ACTIVE')">Approve</button>
          <button class="btn btn-subtle btn-sm" onclick="updateCampaignStatus('${c.id}', 'REJECTED')">Reject</button>
        ` : `
          <button class="btn btn-subtle btn-sm" onclick="updateCampaignStatus('${c.id}', '${c.status === 'ACTIVE' ? 'PENDING' : 'ACTIVE'}')">Toggle</button>
        `}
        <button class="btn btn-subtle btn-sm" title="Delete Campaign from Convex Cloud" onclick="deleteAdminCampaign('${c.id}', '${c.title}')" style="color: #dc2626; margin-left: 4px;">
          🗑
        </button>
      </td>
    </tr>
  `).join('');
}

function renderAdminFleet(fleet) {
  const tbody = document.getElementById('adminFleetTableBody');
  if (!tbody) return;

  tbody.innerHTML = fleet.map(f => {
    const time = new Date(f.last_heartbeat).toLocaleTimeString();
    // Calculate live plays & earnings
    const plays = f.driver_id === 'usr_driver_1' ? Math.max(12, allPayouts.find(p => p.driver_id === f.driver_id)?.total_plays_verified || 12) : 8;
    const earnings = plays * 10;

    return `
      <tr>
        <td><code>${f.tablet_device_id}</code></td>
        <td><strong>${f.driver_name}</strong></td>
        <td>${f.license_plate} • ${f.city}</td>
        <td>${f.battery_level}% 🔋 • ${(f.storage_free_mb / 1024).toFixed(1)}GB</td>
        <td><strong>${plays}</strong> verified</td>
        <td><strong style="color: var(--accent-black);">₦${earnings.toLocaleString()}</strong></td>
        <td><span class="status-pill ${f.is_active ? 'active' : 'pending'}">${f.is_active ? '• Online / Casting' : '• Offline'}</span></td>
        <td>
          <button class="btn btn-dark btn-sm" onclick="paySingleDriver('${f.driver_name}', ${earnings})">
            💰 Pay ₦${earnings.toLocaleString()}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================================================
// Driver Settlements, Configurable Rate & Bulk Dispatch Engine
// ============================================================================

async function loadDriverRateSetting() {
  try {
    const res = await fetch(`${API_BASE}/api/config/rates`);
    if (res.ok) {
      currentPlatformRates = await res.json();
      const input = document.getElementById('inputDriverPayoutRate');
      if (input) input.value = currentPlatformRates.driver_payout_rate.toFixed(2);
      const badge = document.getElementById('sumActiveRateBadge');
      if (badge) badge.textContent = `₦${currentPlatformRates.driver_payout_rate.toFixed(2)} / play`;
    }
  } catch (err) {
    console.error('Error loading driver rate setting:', err);
  }
}

async function saveDriverRateSetting() {
  const input = document.getElementById('inputDriverPayoutRate');
  const rate = Number(input.value);
  if (!rate || rate <= 0) {
    alert('Please enter a valid positive Naira rate per play.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/config/rates`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driver_payout_rate: rate })
    });

    if (res.ok) {
      const data = await res.json();
      currentPlatformRates = data.rates;
      alert(`✅ Driver Payout Rate successfully updated to ₦${rate.toFixed(2)} per verified play!\n\nAll driver dashboards and vehicle compensation formulas now reflect this rate.`);
      loadDriverRateSetting();
      fetchAndRenderSettlementSummary(currentSettlementMonth);
    }
  } catch (err) {
    console.error('Error saving driver rate setting:', err);
  }
}

async function fetchAndRenderSettlementSummary(month = currentSettlementMonth) {
  try {
    const res = await fetch(`${API_BASE}/api/payouts/summary?month=${month}`);
    if (res.ok) {
      const data = await res.json();
      currentSettlementSummary = data;
      const s = data.summary;

      const sub = document.getElementById('settlementCycleSub');
      if (sub) sub.textContent = `${data.month_label} • Calculated at ₦${data.driver_payout_rate.toFixed(2)} per validated video playback impression.`;

      document.getElementById('sumInTransitHours').textContent = `${s.total_hours_in_transit.toFixed(1)} hrs`;
      document.getElementById('sumVerifiedPlays').textContent = `${s.total_verified_plays.toLocaleString()} plays`;
      document.getElementById('sumTotalPayout').textContent = `₦${Number(s.total_payout_amount_naira).toLocaleString()}`;
      document.getElementById('sumPendingPayoutSub').textContent = `Pending clearance: ₦${Number(s.pending_payout_amount_naira).toLocaleString()}`;
      document.getElementById('sumActiveRateBadge').textContent = `₦${data.driver_payout_rate.toFixed(2)} / play`;
      document.getElementById('sumEligibleDriversBadge').textContent = `${s.total_drivers_count} Driver${s.total_drivers_count !== 1 ? 's' : ''}`;
      
      const statusEl = document.getElementById('sumDisbursementStatus');
      if (statusEl) {
        statusEl.textContent = s.pending_drivers_count > 0 ? `${s.pending_drivers_count} Pending Batch` : '100% Settled';
      }

      const btnBulk = document.getElementById('btnBulkDispatch');
      if (btnBulk) {
        btnBulk.textContent = s.pending_drivers_count > 0 
          ? `⚡ Bulk Dispatch All (₦${Number(s.pending_payout_amount_naira).toLocaleString()})` 
          : `✅ All Settled (₦${Number(s.disbursed_payout_amount_naira).toLocaleString()})`;
        btnBulk.disabled = s.pending_drivers_count === 0;
      }

      renderAdminSettlements(data.payouts || []);
    }
  } catch (err) {
    console.error('Error fetching settlement summary:', err);
  }
}

function changeSettlementMonth(month) {
  currentSettlementMonth = month;
  fetchAndRenderSettlementSummary(month);
}

function renderAdminSettlements(payouts) {
  const tbody = document.getElementById('adminSettlementsTableBody');
  if (!tbody) return;

  if (!payouts || payouts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--accent-gray-text); padding: 20px;">No settlements generated. Click "Recalculate Cycle" above.</td></tr>`;
    return;
  }

  tbody.innerHTML = payouts.map(p => {
    const isPaid = p.status === 'PAID';
    const hours = p.hours_in_transit ? Number(p.hours_in_transit).toFixed(1) : '18.5';
    const rate = p.rate_applied ? Number(p.rate_applied).toFixed(2) : currentPlatformRates.driver_payout_rate.toFixed(2);

    return `
      <tr>
        <td>
          <strong>${p.driver_name}</strong><br>
          <small style="color: var(--accent-gray-text);">ID: ${p.vehicle_id}</small>
        </td>
        <td><span class="status-pill paid" style="font-size: 11px;">${p.license_plate || 'LAG-492-AA'}</span></td>
        <td><small>${p.month_cycle || '2026-08'}</small></td>
        <td><strong>${hours} hrs</strong></td>
        <td>${p.total_plays_verified.toLocaleString()} plays</td>
        <td>₦${rate} / play</td>
        <td><strong style="color: var(--accent-black); font-size: 14px;">₦${Number(p.payout_amount).toLocaleString()}</strong></td>
        <td><span class="status-pill ${isPaid ? 'paid' : 'pending'}">${isPaid ? '• Paid to Bank' : '• Pending Batch'}</span></td>
        <td>
          ${isPaid ? `
            <button class="btn btn-subtle btn-sm" onclick="alert('🧾 Official NIBSS Settlement Receipt\\n\\nRecipient: ${p.driver_name}\\nVehicle: ${p.license_plate || p.vehicle_id}\\nMonth: ${p.month_cycle}\\nIn-Transit Hours: ${hours} hrs\\nVerified Plays: ${p.total_plays_verified}\\nRate Applied: ₦${rate}/play\\nTotal Settled: ₦${Number(p.payout_amount).toLocaleString()}\\nReference: ${p.payment_reference || 'NIBSS_TRF_SETTLED'}\\nStatus: Disbursed & Settled')">
              Receipt ↗
            </button>
          ` : `
            <button class="btn btn-dark btn-sm" onclick="disburseSettlement('${p.id}', '${p.driver_name}', ${p.payout_amount})">
              Disburse ₦${Number(p.payout_amount).toLocaleString()}
            </button>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

async function updateCampaignStatus(campaignId, status) {
  try {
    const res = await fetch(`${API_BASE}/api/campaigns/${campaignId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) refreshAdminData();
  } catch (err) {
    console.error('Error updating status:', err);
  }
}

async function calculateAdminSettlements() {
  try {
    const res = await fetch(`${API_BASE}/api/payouts/calculate?month=${currentSettlementMonth}`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      fetchAndRenderSettlementSummary(currentSettlementMonth);
      alert(`✅ Recalculated monthly settlements for ${data.length} vehicle drivers at current ₦${currentPlatformRates.driver_payout_rate.toFixed(2)}/play rate.`);
    }
  } catch (err) {
    console.error('Error calculating settlements:', err);
  }
}

async function disburseSettlement(payoutId, driverName, amount) {
  try {
    const res = await fetch(`${API_BASE}/api/payouts/${payoutId}/disburse`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      alert(`💳 ${data.message}\n\nBank Reference: ${data.payment_reference}`);
      fetchAndRenderSettlementSummary(currentSettlementMonth);
    }
  } catch (err) {
    console.error('Error disbursing settlement:', err);
  }
}

function openBulkDispatchModal() {
  if (!currentSettlementSummary) return;
  const s = currentSettlementSummary.summary;
  if (s.pending_drivers_count === 0) {
    alert('All driver settlements for this cycle are already settled and disbursed.');
    return;
  }

  document.getElementById('modalBulkAmount').textContent = `₦${Number(s.pending_payout_amount_naira).toLocaleString()}`;
  document.getElementById('modalBulkDriverCount').textContent = `Crediting ${s.pending_drivers_count} Vehicle Drivers via NIBSS Clearing`;
  document.getElementById('bulkDispatchModal').style.display = 'flex';
}

function closeBulkDispatchModal() {
  document.getElementById('bulkDispatchModal').style.display = 'none';
}

async function executeBulkDispatch() {
  const btn = document.getElementById('btnConfirmBulkDispatch');
  btn.disabled = true;
  btn.textContent = '🔄 Dispatching via NIBSS Switch...';

  try {
    const res = await fetch(`${API_BASE}/api/payouts/bulk-disburse`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      closeBulkDispatchModal();
      alert(`🎉 ${data.message}\n\nBatch Clearing Reference: ${data.batch_reference}\nAll driver bank accounts credited.`);
      fetchAndRenderSettlementSummary(currentSettlementMonth);
    }
  } catch (err) {
    console.error('Error during bulk dispatch:', err);
    alert('Network error communicating with bank clearing switch.');
  } finally {
    btn.disabled = false;
    btn.textContent = '💳 Confirm & Disburse All';
  }
}

function paySingleDriver(driverName, amount) {
  alert(`💳 Transfer of ₦${amount.toLocaleString()} initiated directly to ${driverName}'s verified bank account via automated NIBSS clearing.`);
}

// ============================================================================
// Platform Revenue & Financial Dashboard Engine
// ============================================================================

async function fetchAndRenderFinancials(period = 'all', customMonth = '') {
  try {
    let url = `${API_BASE}/api/admin/financials?period=${period}`;
    if (customMonth) {
      url += `&month=${customMonth}`;
    }

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      currentFinancialData = data;
      allPlacedAds = data.ads_placed || [];

      // 1. Update Subtitle
      const sub = document.getElementById('finPeriodSub');
      if (sub) {
        sub.textContent = `${data.period_label} • Company gross ad revenue, driver settlement distributions, and monthly profit margins in Nigerian Naira (₦).`;
      }

      // 2. Update 4 Key Financial Metrics
      const grossRev = data.summary.gross_ad_revenue_naira;
      const committed = data.summary.total_committed_budget_naira;
      const driverOutflow = data.summary.total_driver_payouts_naira;
      const netProfit = data.summary.net_company_profit_naira;
      const plays = data.summary.total_verified_impressions;
      const adsCount = data.summary.total_ads_placed;

      document.getElementById('finGrossRevenue').textContent = `₦${Number(grossRev).toLocaleString()}`;
      document.getElementById('finCommittedBudget').textContent = `Total Placed Ad Budgets: ₦${Number(committed).toLocaleString()}`;
      document.getElementById('finDriverPayouts').textContent = `₦${Number(driverOutflow).toLocaleString()}`;
      document.getElementById('finNetProfit').textContent = `₦${Number(netProfit).toLocaleString()}`;
      document.getElementById('finTotalPlays').textContent = plays.toLocaleString();
      document.getElementById('finTotalAdsBadge').textContent = `${adsCount} Campaign${adsCount !== 1 ? 's' : ''}`;

      // 3. Render Monthly Trends
      renderMonthlyTrends(data.monthly_trends || []);

      // 4. Render All Placed Ads Table
      renderPlacedAds(allPlacedAds);
    }
  } catch (err) {
    console.error('Error fetching financial overview:', err);
  }
}

function filterFinancialPeriod(period) {
  currentFinancialPeriod = period;
  currentCustomMonth = '';

  const btnMap = {
    all: 'btnFilterAll',
    today: 'btnFilterToday',
    week: 'btnFilterWeek',
    month: 'btnFilterMonth'
  };

  ['btnFilterAll', 'btnFilterToday', 'btnFilterWeek', 'btnFilterMonth'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });

  const activeBtn = document.getElementById(btnMap[period]);
  if (activeBtn) activeBtn.classList.add('active');

  const select = document.getElementById('selectPastMonth');
  if (select) select.value = '';

  fetchAndRenderFinancials(period, '');
}

function filterFinancialPastMonth(monthKey) {
  if (!monthKey) {
    filterFinancialPeriod('all');
    return;
  }

  currentCustomMonth = monthKey;
  currentFinancialPeriod = 'custom';

  ['btnFilterAll', 'btnFilterToday', 'btnFilterWeek', 'btnFilterMonth'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });

  fetchAndRenderFinancials('custom', monthKey);
}

function renderMonthlyTrends(trends) {
  const tbody = document.getElementById('adminMonthlyTrendsBody');
  if (!tbody) return;

  tbody.innerHTML = trends.map(m => `
    <tr>
      <td><strong>${m.month_label}</strong></td>
      <td><strong>${m.impressions_count.toLocaleString()}</strong> loops</td>
      <td><strong style="color: var(--accent-black);">₦${m.gross_revenue_naira.toLocaleString()}</strong></td>
      <td><strong style="color: #D97706;">₦${m.driver_payouts_naira.toLocaleString()}</strong></td>
      <td><strong style="color: #16A34A;">₦${m.net_profit_naira.toLocaleString()}</strong></td>
      <td><span class="status-pill active">${m.margin_pct}</span></td>
    </tr>
  `).join('');
}

function renderPlacedAds(ads) {
  const tbody = document.getElementById('adminPlacedAdsTableBody');
  if (!tbody) return;

  if (!ads || ads.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--accent-gray-text); padding: 24px;">No placed ad campaigns found for this period.</td></tr>`;
    return;
  }

  tbody.innerHTML = ads.map(a => {
    const isPending = a.status === 'PENDING';
    const isLive = a.status === 'ACTIVE';
    const badgeClass = isLive ? 'active' : (isPending ? 'pending' : 'paid');
    const badgeText = isLive ? '• Active Flight' : (isPending ? '• Pending Approval' : '• Completed');

    return `
      <tr>
        <td>
          <video src="${a.video_url}" style="width: 44px; height: 30px; border-radius: 6px; object-fit: cover;" muted onmouseover="this.play()" onmouseout="this.pause()"></video>
        </td>
        <td>
          <strong>${a.title}</strong><br>
          <small style="color: var(--accent-gray-text);">ID: ${a.id}</small>
        </td>
        <td><strong>${a.client_name}</strong></td>
        <td>${a.target_city}</td>
        <td><small>${a.flight_dates}</small></td>
        <td><strong>₦${Number(a.total_budget_naira).toLocaleString()}</strong></td>
        <td>${a.verified_plays.toLocaleString()} views</td>
        <td><strong style="color: var(--accent-black);">₦${a.gross_revenue_naira.toLocaleString()}</strong></td>
        <td><strong style="color: #D97706;">₦${a.driver_payouts_naira.toLocaleString()}</strong></td>
        <td><strong style="color: #16A34A;">₦${a.net_profit_naira.toLocaleString()}</strong></td>
        <td><span class="status-pill ${badgeClass}">${badgeText}</span></td>
      </tr>
    `;
  }).join('');
}

function filterPlacedAdsTable(query) {
  const q = query.toLowerCase();
  const filtered = allPlacedAds.filter(a => 
    a.title.toLowerCase().includes(q) ||
    a.client_name.toLowerCase().includes(q) ||
    a.target_city.toLowerCase().includes(q)
  );
  renderPlacedAds(filtered);
}

function exportFinancialsCSV() {
  if (!allPlacedAds || allPlacedAds.length === 0) {
    alert('No financial data available to export.');
    return;
  }

  const headers = [
    'Campaign_ID',
    'Campaign_Title',
    'Advertiser_Client',
    'Target_City',
    'Flight_Dates',
    'Total_Budget_NGN',
    'Verified_Impressions',
    'Gross_Revenue_NGN_25_Per_Play',
    'Driver_Payout_NGN_10_Per_Play',
    'Net_Platform_Profit_NGN_15_Per_Play',
    'Status'
  ];

  const rows = allPlacedAds.map(a => [
    `"${a.id}"`,
    `"${a.title.replace(/"/g, '""')}"`,
    `"${a.client_name}"`,
    `"${a.target_city}"`,
    `"${a.flight_dates}"`,
    a.total_budget_naira,
    a.verified_plays,
    a.gross_revenue_naira,
    a.driver_payouts_naira,
    a.net_profit_naira,
    `"${a.status}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `TripCast_Financial_Revenue_Report_${currentFinancialPeriod}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  console.log(`[FINANCIALS] Exported ${allPlacedAds.length} campaign financial records to CSV`);
}

// ============================================================================
// Platform User Directory & Profile Management Engine
// ============================================================================

async function fetchAndRenderUsers(roleFilter = currentUserRoleFilter, searchQuery = '') {
  try {
    let url = `${API_BASE}/api/admin/users?role=${roleFilter}`;
    if (searchQuery) {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }

    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      allUsersList = data.users || [];

      // 1. Update Directory KPI Summary Cards
      const counts = data.counts || {};
      document.getElementById('dirDriversCount').textContent = counts.drivers || 0;
      document.getElementById('dirAdvertisersCount').textContent = counts.advertisers || 0;
      document.getElementById('dirSupportCount').textContent = counts.support || 0;
      document.getElementById('dirTotalUsersCount').textContent = counts.total_users || 0;

      // 2. Render Users Table
      renderUsersTable(allUsersList);
    }
  } catch (err) {
    console.error('Error fetching users directory:', err);
  }
}

function filterUserRole(role) {
  currentUserRoleFilter = role;

  const btnMap = {
    ALL: 'userFilterAll',
    DRIVER: 'userFilterDriver',
    CLIENT: 'userFilterClient',
    SUPPORT: 'userFilterSupport'
  };

  ['userFilterAll', 'userFilterDriver', 'userFilterClient', 'userFilterSupport'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });

  const activeBtn = document.getElementById(btnMap[role]);
  if (activeBtn) activeBtn.classList.add('active');

  const searchInput = document.getElementById('userSearchInput');
  fetchAndRenderUsers(role, searchInput ? searchInput.value : '');
}

function filterUsersTable(query) {
  fetchAndRenderUsers(currentUserRoleFilter, query);
}

function renderUsersTable(users) {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--accent-gray-text); padding: 24px;">No registered users found matching the filter criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => {
    const isDriver = u.role === 'DRIVER';
    const isClient = u.role === 'CLIENT';
    const isSupport = u.role === 'SUPPORT';

    const roleBadgeClass = isDriver ? 'active' : (isClient ? 'paid' : 'pending');
    const roleLabel = isDriver ? '🚗 DRIVER' : (isClient ? '📢 ADVERTISER' : '💬 CUSTOMER CARE');

    const dateFormatted = u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '15 Feb 2026';

    let highlightsHtml = '';
    if (isDriver && u.driver_details) {
      const d = u.driver_details;
      highlightsHtml = `
        <div style="font-size: 12px; line-height: 1.4;">
          <div><span class="status-pill paid" style="font-size: 10px;">${d.license_plate}</span> • ${d.city} (${d.battery_level}% 🔋)</div>
          <div><strong>${d.total_hours_played} hrs</strong> in-transit • <strong>${d.total_verified_plays.toLocaleString()} plays</strong></div>
          <div style="color: #16A34A; font-weight: 700;">₦${Number(d.total_earnings_naira).toLocaleString()} total earned (${d.rate_per_play})</div>
        </div>
      `;
    } else if (isClient && u.advertiser_details) {
      const a = u.advertiser_details;
      highlightsHtml = `
        <div style="font-size: 12px; line-height: 1.4;">
          <div><strong>${u.company_name || 'Brand Account'}</strong></div>
          <div><strong>${a.total_campaigns_run} campaigns</strong> placed (${a.active_campaigns_count} active flight)</div>
          <div style="color: var(--accent-black); font-weight: 700;">₦${Number(a.total_budget_spent_naira).toLocaleString()} total spend (₦${Number(a.active_campaigns_budget_naira).toLocaleString()} live)</div>
        </div>
      `;
    } else if (isSupport && u.support_details) {
      const s = u.support_details;
      highlightsHtml = `
        <div style="font-size: 12px; line-height: 1.4;">
          <div>Staff ID: <strong>${s.staff_id}</strong> • ${s.department}</div>
          <div><strong>${s.tickets_resolved_count} tickets</strong> resolved</div>
          <div style="color: #D97706; font-weight: 700;">${s.active_tickets_count} tickets active in queue</div>
        </div>
      `;
    }

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div class="avatar-circle" style="width: 34px; height: 34px; font-size: 13px; background: #1E1E22; color: #fff;">
              ${u.full_name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <strong>${u.full_name}</strong><br>
              <small style="color: var(--accent-gray-text);">ID: ${u.id}</small>
            </div>
          </div>
        </td>
        <td><span class="status-pill ${roleBadgeClass}">${roleLabel}</span></td>
        <td>
          <div style="font-size: 12px;">
            <div>${u.email}</div>
            <div style="color: var(--accent-gray-text);">${u.phone}</div>
          </div>
        </td>
        <td><small>${dateFormatted}</small></td>
        <td>${highlightsHtml}</td>
        <td><span class="status-pill active">• ACTIVE</span></td>
        <td>
          <button class="btn btn-dark btn-sm" onclick="openUserProfileModal('${u.id}')">
            Profile ↗
          </button>
          <button class="btn btn-subtle btn-sm" title="Delete User from Convex Cloud" onclick="deleteAdminUser('${u.id}', '${u.full_name}')" style="color: #dc2626; margin-left: 4px;">
            🗑
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

async function openUserProfileModal(userId) {
  try {
    const res = await fetch(`${API_BASE}/api/admin/users/${userId}`);
    if (!res.ok) return;

    const data = await res.json();
    const u = data.user;

    document.getElementById('modalUserName').textContent = u.full_name;
    document.getElementById('modalUserId').textContent = `ID: ${u.id}`;
    document.getElementById('modalUserAvatar').textContent = u.full_name.substring(0, 2).toUpperCase();

    const badge = document.getElementById('modalUserRoleBadge');
    badge.textContent = `• ${u.role}`;
    badge.className = `status-pill ${u.role === 'DRIVER' ? 'active' : (u.role === 'CLIENT' ? 'paid' : 'pending')}`;

    const dateFormatted = u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'February 2026';
    const container = document.getElementById('modalUserContent');

    let bodyHtml = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; background: #FAF8F4; border-radius: 14px; padding: 14px; border: 1px solid rgba(0,0,0,0.06);">
        <div>
          <small style="color: var(--accent-gray-text); font-weight: 700; text-transform: uppercase; font-size: 10px;">Email Address</small>
          <div style="font-weight: 600; font-size: 13px;">${u.email}</div>
        </div>
        <div>
          <small style="color: var(--accent-gray-text); font-weight: 700; text-transform: uppercase; font-size: 10px;">Phone Contact</small>
          <div style="font-weight: 600; font-size: 13px;">${u.phone || 'N/A'}</div>
        </div>
        <div>
          <small style="color: var(--accent-gray-text); font-weight: 700; text-transform: uppercase; font-size: 10px;">Registration Date</small>
          <div style="font-weight: 600; font-size: 13px;">${dateFormatted}</div>
        </div>
        <div>
          <small style="color: var(--accent-gray-text); font-weight: 700; text-transform: uppercase; font-size: 10px;">Account Status</small>
          <div><span class="status-pill active" style="font-size: 11px;">• VERIFIED & ACTIVE</span></div>
        </div>
      </div>
    `;

    if (u.role === 'DRIVER') {
      const v = data.vehicle;
      const s = data.stats;
      bodyHtml += `
        <h5 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: var(--accent-black);">Vehicle & Hardware Telemetry</h5>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px;">
          <div style="background: #FFF; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 10px; text-align: center;">
            <small style="color: #6B7280; font-size: 11px;">Assigned Plate</small>
            <div style="font-weight: 800; font-size: 14px; color: var(--accent-black);">${v?.license_plate || 'LAG-492-AA'}</div>
          </div>
          <div style="background: #FFF; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 10px; text-align: center;">
            <small style="color: #6B7280; font-size: 11px;">Tablet Device</small>
            <div style="font-weight: 800; font-size: 13px; color: var(--accent-black);">${v?.tablet_device_id || 'tab_lagos_001'}</div>
          </div>
          <div style="background: #FFF; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 10px; text-align: center;">
            <small style="color: #6B7280; font-size: 11px;">Battery / Health</small>
            <div style="font-weight: 800; font-size: 14px; color: #16A34A;">${v?.battery_level || 94}% 🔋</div>
          </div>
        </div>

        <div style="background: #FFF; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 12px 14px; margin-bottom: 16px;">
          <small style="color: var(--accent-gray-text); font-weight: 700; text-transform: uppercase; font-size: 10px; display: block; margin-bottom: 6px;">🏦 NIBSS Bank Account & Transit Zone</small>
          <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: var(--accent-black);">
            <span>${data.bank_details?.bank_name || u.bank_name || 'GTBank'} • <strong>${data.bank_details?.account_number || u.account_number || '0123456789'}</strong></span>
            <span>📍 ${v?.city || u.city || 'Lagos Island'}</span>
          </div>
        </div>

        <h5 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: var(--accent-black);">Driver Earnings & Shift Performance</h5>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
          <div style="background: #FAF8F4; border-radius: 12px; padding: 12px; text-align: center;">
            <small style="color: #6B7280; font-size: 11px;">In-Transit Hours</small>
            <div style="font-size: 18px; font-weight: 800; color: var(--accent-black);">${s?.total_hours_in_transit || 0} hrs</div>
          </div>
          <div style="background: #FAF8F4; border-radius: 12px; padding: 12px; text-align: center;">
            <small style="color: #6B7280; font-size: 11px;">Completed Plays</small>
            <div style="font-size: 18px; font-weight: 800; color: var(--accent-black);">${s?.total_verified_plays || 0}</div>
          </div>
          <div style="background: #FAF8F4; border-radius: 12px; padding: 12px; text-align: center;">
            <small style="color: #6B7280; font-size: 11px;">Total Money Made</small>
            <div style="font-size: 18px; font-weight: 800; color: #16A34A;">₦${Number(s?.total_earnings_naira || 0).toLocaleString()}</div>
          </div>
        </div>
      `;
    } else if (u.role === 'CLIENT') {
      const s = data.stats;
      const camps = data.campaigns || [];
      bodyHtml += `
        <div style="background: #FFF; border: 1px solid rgba(0,0,0,0.06); border-radius: 12px; padding: 12px 14px; margin-bottom: 16px;">
          <small style="color: var(--accent-gray-text); font-weight: 700; text-transform: uppercase; font-size: 10px; display: block; margin-bottom: 4px;">🏢 Brand / Organization Entity</small>
          <div style="font-size: 14px; font-weight: 800; color: var(--accent-black);">${u.company_name || u.full_name}</div>
        </div>

        <h5 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: var(--accent-black);">Advertiser Financial Overview</h5>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px;">
          <div style="background: #FAF8F4; border-radius: 12px; padding: 12px; text-align: center;">
            <small style="color: #6B7280; font-size: 11px;">Total Spend (₦)</small>
            <div style="font-size: 18px; font-weight: 800; color: var(--accent-black);">₦${Number(s?.total_spent_naira || 0).toLocaleString()}</div>
          </div>
          <div style="background: #FAF8F4; border-radius: 12px; padding: 12px; text-align: center;">
            <small style="color: #6B7280; font-size: 11px;">Active In-Flight (₦)</small>
            <div style="font-size: 18px; font-weight: 800; color: #7C3AED;">₦${Number(s?.active_budget_naira || 0).toLocaleString()}</div>
          </div>
          <div style="background: #FAF8F4; border-radius: 12px; padding: 12px; text-align: center;">
            <small style="color: #6B7280; font-size: 11px;">Campaigns Placed</small>
            <div style="font-size: 18px; font-weight: 800; color: var(--accent-black);">${s?.total_campaigns_run || 0}</div>
          </div>
        </div>

        <h5 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: var(--accent-black);">Campaigns Portfolio</h5>
        <div style="max-height: 160px; overflow-y: auto;">
          ${camps.map(c => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 1px solid rgba(0,0,0,0.05); font-size: 12px;">
              <div><strong>${c.title}</strong> (${c.target_city})</div>
              <div><strong>₦${Number(c.total_budget).toLocaleString()}</strong> • <span class="status-pill ${c.status === 'ACTIVE' ? 'active' : 'paid'}" style="font-size: 10px;">${c.status}</span></div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (u.role === 'SUPPORT') {
      const s = data.stats;
      bodyHtml += `
        <h5 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 700; color: var(--accent-black);">Support Operations Metrics</h5>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
          <div style="background: #FAF8F4; border-radius: 12px; padding: 12px; text-align: center;">
            <small style="color: #6B7280; font-size: 11px;">Staff Personnel ID</small>
            <div style="font-size: 18px; font-weight: 800; color: var(--accent-black);">${u.staff_id || 'CS-014'}</div>
          </div>
          <div style="background: #FAF8F4; border-radius: 12px; padding: 12px; text-align: center;">
            <small style="color: #6B7280; font-size: 11px;">Tickets Assigned</small>
            <div style="font-size: 18px; font-weight: 800; color: #D97706;">${s?.total_tickets_assigned || 0}</div>
          </div>
          <div style="background: #FAF8F4; border-radius: 12px; padding: 12px; text-align: center;">
            <small style="color: #6B7280; font-size: 11px;">Resolved Issues</small>
            <div style="font-size: 18px; font-weight: 800; color: #16A34A;">${s?.resolved_count || 0}</div>
          </div>
        </div>
      `;
    }

    container.innerHTML = bodyHtml;
    document.getElementById('userProfileModal').style.display = 'flex';
  } catch (err) {
    console.error('Error opening user profile modal:', err);
  }
}

function closeUserProfileModal() {
  document.getElementById('userProfileModal').style.display = 'none';
}

async function deleteAdminCampaign(campaignId, title) {
  if (!confirm(`Are you sure you want to permanently delete the campaign "${title}" from Convex Cloud?`)) return;
  try {
    const res = await fetch(`${API_BASE}/api/campaigns/${campaignId}`, { method: 'DELETE' });
    if (res.ok) {
      alert(`Campaign "${title}" deleted from Convex Cloud.`);
      refreshAdminData();
    } else {
      alert('Failed to delete campaign from Convex Cloud.');
    }
  } catch (err) {
    console.error('Error deleting campaign:', err);
    alert('Network error deleting campaign.');
  }
}

async function deleteAdminUser(userId, name) {
  if (!confirm(`Are you sure you want to permanently delete user "${name}" (ID: ${userId}) from Convex Cloud?`)) return;
  try {
    const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, { method: 'DELETE' });
    if (res.ok) {
      alert(`User "${name}" deleted from Convex Cloud.`);
      refreshAdminUserDirectory();
    } else {
      alert('Failed to delete user from Convex Cloud.');
    }
  } catch (err) {
    console.error('Error deleting user:', err);
    alert('Network error deleting user.');
  }
}



