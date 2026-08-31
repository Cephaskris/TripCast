const API_BASE = window.location.origin;

let currentAgent = null;
let allTickets = [];
let activeFilter = 'ALL';

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setInterval(refreshSupportData, 6000);
});

function checkAuth() {
  const saved = sessionStorage.getItem('tripcast_support');
  if (saved) {
    currentAgent = JSON.parse(saved);
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
  if (currentAgent) {
    document.getElementById('supportGreeting').textContent = `Hello ${currentAgent.full_name}`;
    document.getElementById('agentInitials').textContent = currentAgent.full_name.substring(0, 2).toUpperCase();
  }
  refreshSupportData();
}

async function handleSupportLogin(e) {
  e.preventDefault();
  const email = document.getElementById('supportEmail').value;
  const pin = document.getElementById('supportPin').value;

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pin, role: 'SUPPORT' })
    });

    if (res.ok) {
      const data = await res.json();
      currentAgent = data.user;
      sessionStorage.setItem('tripcast_support', JSON.stringify(currentAgent));
      showDashboard();
    } else {
      alert('❌ Invalid support agent credentials. Demo account: support@tripcast.io / agent123');
    }
  } catch (err) {
    console.error('Error logging into support desk:', err);
  }
}

function logoutSupport() {
  sessionStorage.removeItem('tripcast_support');
  currentAgent = null;
  showLogin();
}

async function refreshSupportData() {
  if (!currentAgent) return;

  try {
    // 1. Fetch tickets
    const res = await fetch(`${API_BASE}/api/tickets`);
    if (res.ok) {
      allTickets = await res.json();
      renderTicketsTable();
      updateSupportStats();
    }
  } catch (err) {
    console.error('Error refreshing support tickets:', err);
  }
}

function updateSupportStats() {
  const total = allTickets.length;
  const open = allTickets.filter(t => t.status === 'OPEN').length;
  const inProgress = allTickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolved = allTickets.filter(t => t.status === 'RESOLVED').length;
  const driverTickets = allTickets.filter(t => t.sender_role === 'DRIVER').length;
  const clientTickets = allTickets.filter(t => t.sender_role === 'CLIENT').length;

  document.getElementById('badgeAllTickets').textContent = total;
  document.getElementById('badgeDriverTickets').textContent = driverTickets;
  document.getElementById('badgeClientTickets').textContent = clientTickets;

  document.getElementById('statOpenCount').textContent = open;
  document.getElementById('statInProgress').textContent = inProgress;
  document.getElementById('statResolvedCount').textContent = resolved;

  const assignedMe = allTickets.filter(t => t.assigned_agent === currentAgent?.full_name && t.status !== 'RESOLVED').length;
  document.getElementById('kpiAssignedMe').textContent = `${assignedMe} Active`;
}

function filterSupportCategory(filter) {
  activeFilter = filter;
  document.querySelectorAll('.nav-pill-btn').forEach(b => b.classList.remove('active'));

  const btn = {
    ALL: document.getElementById('tabAllTickets'),
    DRIVER: document.getElementById('tabDriverDisputes'),
    CLIENT: document.getElementById('tabClientInquiries'),
    RESOLVED: document.getElementById('tabResolved')
  }[filter];

  if (btn) btn.classList.add('active');
  renderTicketsTable();
}

function renderTicketsTable() {
  const tbody = document.getElementById('supportTicketsTableBody');
  if (!tbody) return;

  let displayTickets = allTickets;
  if (activeFilter === 'DRIVER') {
    displayTickets = allTickets.filter(t => t.sender_role === 'DRIVER');
  } else if (activeFilter === 'CLIENT') {
    displayTickets = allTickets.filter(t => t.sender_role === 'CLIENT');
  } else if (activeFilter === 'RESOLVED') {
    displayTickets = allTickets.filter(t => t.status === 'RESOLVED');
  }

  if (!displayTickets || displayTickets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--accent-gray-text); padding: 24px;">No tickets found in this queue.</td></tr>`;
    return;
  }

  tbody.innerHTML = displayTickets.map(t => {
    const isDriver = t.sender_role === 'DRIVER';
    const roleBadge = isDriver ? 'pending' : 'paid';
    const roleLabel = isDriver ? '🚗 Driver' : '🏢 Advertiser';

    const statusBadge = t.status === 'RESOLVED' ? 'paid' : (t.status === 'IN_PROGRESS' ? 'active' : 'pending');
    const priorityBadge = t.priority === 'HIGH' || t.priority === 'CRITICAL' ? 'status-pill' : '';

    return `
      <tr>
        <td><code>${t.ticket_num}</code></td>
        <td>
          <span class="status-pill ${roleBadge}" style="margin-bottom: 2px;">${roleLabel}</span><br>
          <strong>${t.sender_name}</strong>
        </td>
        <td><span class="badge-count">${formatCategory(t.category)}</span></td>
        <td>
          <strong>${t.subject}</strong><br>
          <small style="color: var(--accent-gray-text);">${t.description.substring(0, 60)}...</small>
        </td>
        <td><span class="status-pill ${t.priority === 'HIGH' ? 'pending' : 'paid'}">${t.priority}</span></td>
        <td>${t.assigned_agent ? `<strong>${t.assigned_agent}</strong>` : `<span style="color: var(--accent-gray-text);">Unassigned</span>`}</td>
        <td><span class="status-pill ${statusBadge}">• ${t.status}</span></td>
        <td>
          <button class="btn btn-dark btn-sm" onclick="openTicketModal('${t.id}')">
            ${t.status === 'RESOLVED' ? 'Inspect' : 'Triage & Resolve'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function formatCategory(cat) {
  return {
    PAYOUT_DISPUTE: '💰 Payout Dispute',
    HARDWARE_ISSUE: '📱 Tablet Hardware',
    CAMPAIGN_BILLING: '🧾 Billing & Audit',
    SYNC_ERROR: '🔄 Offline Sync',
    GENERAL: '💬 General Help'
  }[cat] || cat;
}

function searchTickets(query) {
  const q = query.toLowerCase();
  const filtered = allTickets.filter(t => 
    t.ticket_num.toLowerCase().includes(q) ||
    t.sender_name.toLowerCase().includes(q) ||
    t.subject.toLowerCase().includes(q)
  );
  const tbody = document.getElementById('supportTicketsTableBody');
  tbody.innerHTML = filtered.map(t => `
    <tr>
      <td><code>${t.ticket_num}</code></td>
      <td><strong>${t.sender_name}</strong> (${t.sender_role})</td>
      <td><span class="badge-count">${t.category}</span></td>
      <td><strong>${t.subject}</strong></td>
      <td><span class="status-pill pending">${t.priority}</span></td>
      <td>${t.assigned_agent || 'Unassigned'}</td>
      <td><span class="status-pill active">• ${t.status}</span></td>
      <td>
        <button class="btn btn-dark btn-sm" onclick="openTicketModal('${t.id}')">Triage</button>
      </td>
    </tr>
  `).join('');
}

// Modal Handlers
function openTicketModal(ticketId) {
  const ticket = allTickets.find(t => t.id === ticketId);
  if (!ticket) return;

  document.getElementById('modalTicketId').value = ticket.id;
  document.getElementById('modalTicketTitle').textContent = `Ticket ${ticket.ticket_num}: ${ticket.subject}`;
  document.getElementById('modalTicketSub').textContent = `Sender: ${ticket.sender_name} (${ticket.sender_role}) • Category: ${formatCategory(ticket.category)}`;
  document.getElementById('modalTicketDesc').textContent = ticket.description;

  if (ticket.assigned_agent) {
    document.getElementById('modalAssignAgent').value = ticket.assigned_agent;
  }
  document.getElementById('modalTicketStatus').value = ticket.status;
  document.getElementById('modalResolutionNotes').value = ticket.resolution_notes || '';

  document.getElementById('ticketResolutionModal').style.display = 'flex';
}

function closeTicketModal() {
  document.getElementById('ticketResolutionModal').style.display = 'none';
}

async function handleResolveTicket(e) {
  e.preventDefault();
  const ticketId = document.getElementById('modalTicketId').value;
  const assigned_agent = document.getElementById('modalAssignAgent').value;
  const status = document.getElementById('modalTicketStatus').value;
  const resolution_notes = document.getElementById('modalResolutionNotes').value;

  try {
    const res = await fetch(`${API_BASE}/api/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assigned_agent,
        status,
        resolution_notes
      })
    });

    if (res.ok) {
      closeTicketModal();
      refreshSupportData();
      alert(`✅ Ticket updated successfully (Status: ${status}). Resolution recorded in system audit log.`);
    }
  } catch (err) {
    console.error('Error updating ticket:', err);
  }
}

// ============================================================================
// Support Agent Profile & Security Modal Handlers
// ============================================================================

function openSupportProfileModal() {
  document.getElementById('profileSupportEmail').textContent = currentSupportUser?.email || 'support@tripcast.io';
  document.getElementById('supportProfilePhone').value = currentSupportUser?.phone || '+234 809 555 6677';
  document.getElementById('supportProfilePassword').value = '';
  document.getElementById('supportProfileModal').style.display = 'flex';
}

function closeSupportProfileModal() {
  document.getElementById('supportProfileModal').style.display = 'none';
}

async function handleSupportSaveProfile(e) {
  e.preventDefault();

  const phone = document.getElementById('supportProfilePhone').value.trim();
  const password = document.getElementById('supportProfilePassword').value.trim();

  const btn = document.getElementById('btnSaveSupportProfile');
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Saving to Convex...';

  try {
    const payload = {
      user_id: currentSupportUser?.id || 'usr_support_1',
      phone
    };
    if (password) {
      payload.password = password;
    }

    const res = await fetch(`${API_BASE}/api/user/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeSupportProfileModal();
      alert('✅ Staff Credentials Secured!\n\nYour phone number and access key have been updated directly in Convex Cloud.');
    } else {
      alert('Failed to update support agent profile.');
    }
  } catch (err) {
    console.error('Error saving support profile:', err);
    alert('Network error saving profile to cloud.');
  } finally {
    btn.disabled = false;
    btn.textContent = origText;
  }
}
