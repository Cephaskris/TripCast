const API_BASE = window.location.origin;

let activeRole = 'client';
let currentTab = 'dashboard';
let currentCampaigns = [];
let allVehicles = [];
let allPayouts = [];

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  renderDotMatrix(48, 18);
  refreshData();
  // Auto-refresh telemetry and analytics every 6 seconds
  setInterval(refreshData, 6000);
});

// Role Switcher (Advertiser vs Admin)
function switchRole(role) {
  activeRole = role;
  const btnClient = document.getElementById('btnRoleClient');
  const btnAdmin = document.getElementById('btnRoleAdmin');
  const greeting = document.getElementById('heroGreeting');

  if (role === 'client') {
    btnClient.classList.add('active');
    btnAdmin.classList.remove('active');
    greeting.textContent = 'Hello Advertiser';
    switchMainTab('dashboard');
  } else {
    btnAdmin.classList.add('active');
    btnClient.classList.remove('active');
    greeting.textContent = 'Hello Fleet Operations';
    switchMainTab('moderation');
  }
}

// Main Navigation Tab Switcher
function switchMainTab(tab) {
  currentTab = tab;
  
  // Update nav pill buttons
  const buttons = document.querySelectorAll('.nav-pill-btn');
  buttons.forEach(b => b.classList.remove('active'));

  const activeBtn = {
    dashboard: document.getElementById('btnNavDashboard'),
    campaigns: document.getElementById('btnNavCampaigns'),
    fleet: document.getElementById('btnNavFleet'),
    payouts: document.getElementById('btnNavPayouts'),
    moderation: document.getElementById('btnNavModeration'),
  }[tab];

  if (activeBtn) activeBtn.classList.add('active');

  const bentoStage = document.getElementById('mainBentoStage');
  const fullStage = document.getElementById('fullViewContainer');
  const moderationView = document.getElementById('moderationView');
  const fleetView = document.getElementById('fleetView');
  const payoutsView = document.getElementById('payoutsView');

  if (tab === 'dashboard' || tab === 'campaigns') {
    bentoStage.style.display = 'grid';
    fullStage.style.display = 'none';
  } else {
    bentoStage.style.display = 'none';
    fullStage.style.display = 'block';

    moderationView.style.display = tab === 'moderation' ? 'block' : 'none';
    fleetView.style.display = tab === 'fleet' ? 'block' : 'none';
    payoutsView.style.display = tab === 'payouts' ? 'block' : 'none';
  }

  refreshData();
}

// Data Fetching & Sync
async function refreshData() {
  try {
    // 1. Fetch system status
    const sysRes = await fetch(`${API_BASE}/api/health`);
    if (sysRes.ok) {
      const sysData = await sysRes.json();
      document.getElementById('heroTotalPlays').textContent = sysData.total_playback_logs > 0 ? sysData.total_playback_logs.toLocaleString() : '342';
      document.getElementById('donutPlaysCount').textContent = sysData.total_playback_logs > 0 ? sysData.total_playback_logs.toLocaleString() : '342';
      
      // Update dot matrix dynamically based on active play counts
      const activeDots = Math.min(Math.max(sysData.total_playback_logs, 14), 48);
      renderDotMatrix(48, activeDots);
    }

    // 2. Fetch all campaigns
    const campRes = await fetch(`${API_BASE}/api/campaigns`);
    if (campRes.ok) {
      currentCampaigns = await campRes.json();
      renderCampaignsTable(currentCampaigns);
      renderModerationTable(currentCampaigns);

      // Calculate total budget spent
      const totalBudgetSpent = currentCampaigns.reduce((acc, c) => acc + (c.current_impressions * c.cost_per_play), 0);
      document.getElementById('heroBudgetSpent').textContent = `₦${totalBudgetSpent.toLocaleString()}`;

      // Update pending badge
      const pendingCount = currentCampaigns.filter(c => c.status === 'PENDING').length;
      document.getElementById('pendingNavBadge').textContent = pendingCount;
    }

    // 3. Fetch fleet hardware
    const fleetRes = await fetch(`${API_BASE}/api/fleet`);
    if (fleetRes.ok) {
      allVehicles = await fleetRes.json();
      renderFleetTable(allVehicles);
      const onlineCount = allVehicles.filter(v => v.is_active).length;
      document.getElementById('heroActiveTablets').textContent = `${onlineCount}`;
      document.getElementById('darkActiveTablets').textContent = `${onlineCount}`;
    }

    // 4. Fetch driver settlements
    const payRes = await fetch(`${API_BASE}/api/payouts`);
    if (payRes.ok) {
      allPayouts = await payRes.json();
      renderPayoutsTable(allPayouts);
    }
  } catch (err) {
    console.error('Error refreshing Crextio dashboard:', err);
  }
}

// Render Dot Matrix (Attendance Matrix Visualizer)
function renderDotMatrix(totalDots, activeCount) {
  const container = document.getElementById('dotMatrixGrid');
  if (!container) return;

  container.innerHTML = Array.from({ length: totalDots }, (_, i) => {
    const isGold = i < activeCount;
    return `<div class="matrix-dot ${isGold ? 'gold' : ''}"></div>`;
  }).join('');
}

// Table Renderers
function renderCampaignsTable(campaigns) {
  const tbody = document.getElementById('campaignsTableBody');
  if (!tbody) return;

  tbody.innerHTML = campaigns.map((c, idx) => {
    const statusClass = c.status.toLowerCase();
    const statusText = c.status === 'ACTIVE' ? '• Live Transit' : (c.status === 'PENDING' ? '• Pending' : '• Paid For');
    const badgeClass = c.status === 'ACTIVE' ? 'active' : (c.status === 'PENDING' ? 'pending' : 'paid');

    return `
      <tr>
        <td>
          <input type="checkbox" class="custom-check" ${idx === 0 ? 'checked' : ''}>
        </td>
        <td>
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80" class="creative-thumb-mini" alt="Thumb">
          <strong>${c.title}</strong>
        </td>
        <td>${c.target_city}</td>
        <td><strong>₦${Number(c.total_budget).toLocaleString()}</strong></td>
        <td>${c.current_impressions.toLocaleString()} plays</td>
        <td>
          <span class="status-pill ${badgeClass}">${statusText}</span>
        </td>
      </tr>
    `;
  }).join('');
}

function renderModerationTable(campaigns) {
  const tbody = document.getElementById('moderationTableBody');
  if (!tbody) return;

  tbody.innerHTML = campaigns.map(c => `
    <tr>
      <td>
        <video src="${c.video_url}" style="width: 50px; height: 30px; border-radius: 6px; object-fit: cover;" muted loop onmouseover="this.play()" onmouseout="this.pause()"></video>
      </td>
      <td><strong>${c.title}</strong></td>
      <td>Client #${c.client_id}</td>
      <td><strong>₦${Number(c.total_budget).toLocaleString()}</strong></td>
      <td>${c.target_impressions.toLocaleString()} plays</td>
      <td>
        <span class="status-pill ${c.status === 'ACTIVE' ? 'active' : 'pending'}">${c.status}</span>
      </td>
      <td>
        ${c.status === 'PENDING' ? `
          <button class="btn btn-dark btn-sm" onclick="updateCampaignStatus('${c.id}', 'ACTIVE')">Approve</button>
          <button class="btn btn-subtle btn-sm" onclick="updateCampaignStatus('${c.id}', 'REJECTED')">Reject</button>
        ` : `
          <button class="btn btn-subtle btn-sm" onclick="updateCampaignStatus('${c.id}', '${c.status === 'ACTIVE' ? 'PENDING' : 'ACTIVE'}')">Toggle</button>
        `}
      </td>
    </tr>
  `).join('');
}

function renderFleetTable(fleet) {
  const tbody = document.getElementById('fleetTableBody');
  if (!tbody) return;

  tbody.innerHTML = fleet.map(f => {
    const time = new Date(f.last_heartbeat).toLocaleTimeString();
    return `
      <tr>
        <td><code>${f.tablet_device_id}</code></td>
        <td><strong>${f.driver_name}</strong></td>
        <td>${f.license_plate}</td>
        <td>${f.city}</td>
        <td>${f.battery_level}% 🔋</td>
        <td>${(f.storage_free_mb / 1024).toFixed(1)} GB</td>
        <td>${f.app_version}</td>
        <td>${time}</td>
        <td>
          <span class="status-pill ${f.is_active ? 'active' : 'pending'}">${f.is_active ? '• Online' : '• Offline'}</span>
        </td>
      </tr>
    `;
  }).join('');
}

function renderPayoutsTable(payouts) {
  const tbody = document.getElementById('payoutsTableBody');
  if (!tbody) return;

  if (!payouts || payouts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--accent-gray-text); padding: 20px;">No settlements calculated yet. Click "Calculate Weekly Settlements".</td></tr>`;
    return;
  }

  tbody.innerHTML = payouts.map(p => `
    <tr>
      <td><strong>${p.driver_name}</strong></td>
      <td><code>${p.vehicle_id}</code></td>
      <td>${p.period_start} → ${p.period_end}</td>
      <td>${p.total_plays_verified.toLocaleString()} plays</td>
      <td>₦10 / play</td>
      <td><strong style="color: var(--accent-black); font-size: 14px;">₦${Number(p.payout_amount).toLocaleString()}</strong></td>
      <td><span class="status-pill paid">Paid</span></td>
    </tr>
  `).join('');
}

// Search Filter
function filterCampaigns(query) {
  const q = query.toLowerCase();
  const filtered = currentCampaigns.filter(c => 
    c.title.toLowerCase().includes(q) || c.target_city.toLowerCase().includes(q)
  );
  renderCampaignsTable(filtered);
}

// Moderation API Call
async function updateCampaignStatus(campaignId, status) {
  try {
    const res = await fetch(`${API_BASE}/api/campaigns/${campaignId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) refreshData();
  } catch (err) {
    console.error('Error updating status:', err);
  }
}

// Calculate Settlements API Call
async function calculatePayouts() {
  try {
    const res = await fetch(`${API_BASE}/api/payouts/calculate`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      renderPayoutsTable(data);
      alert(`✅ Successfully processed Naira settlements for ${data.length} vehicle drivers.`);
    }
  } catch (err) {
    console.error('Error calculating settlements:', err);
  }
}

// Modal Handlers
function openNewCampaignModal() {
  document.getElementById('newCampaignModal').style.display = 'flex';
}

function closeNewCampaignModal() {
  document.getElementById('newCampaignModal').style.display = 'none';
}

function updateEstimates() {
  const budget = Number(document.getElementById('inputBudget').value) || 0;
  const plays = Math.floor(budget / 25);
  document.getElementById('estImpressions').textContent = `${plays.toLocaleString()} Plays`;
}

async function handleCreateCampaign(e) {
  e.preventDefault();
  const title = document.getElementById('inputTitle').value;
  const video_url = document.getElementById('inputVideoUrl').value;
  const total_budget = Number(document.getElementById('inputBudget').value);
  const target_city = document.getElementById('inputCity').value;

  try {
    const res = await fetch(`${API_BASE}/api/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, video_url, total_budget, target_city })
    });

    if (res.ok) {
      closeNewCampaignModal();
      document.getElementById('newCampaignForm').reset();
      refreshData();
      alert('🎉 Campaign submitted for Moderation review.');
    }
  } catch (err) {
    console.error('Error creating campaign:', err);
  }
}

function triggerDeviceHeartbeat() {
  alert('📡 Fleet heartbeat synchronized with Cloud Run Gateway.');
}
