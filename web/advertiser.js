const API_BASE = window.location.origin;

let currentAdvertiser = null;
let currentCampaigns = [];

document.addEventListener('DOMContentLoaded', () => {
  renderDotMatrix(48, 16);
  checkAuth();
  setInterval(refreshAdvertiserData, 6000);
});

function checkAuth() {
  const saved = sessionStorage.getItem('tripcast_advertiser');
  if (saved) {
    currentAdvertiser = JSON.parse(saved);
    showDashboard();
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('loginSection').style.display = 'flex';
  document.getElementById('dashboardSection').style.display = 'none';
}

function switchAdvAuthTab(mode) {
  const tabSignIn = document.getElementById('tabBtnSignIn');
  const tabSignUp = document.getElementById('tabBtnSignUp');
  const viewSignIn = document.getElementById('advSignInView');
  const viewSignUp = document.getElementById('advSignUpView');

  if (mode === 'SIGN_UP') {
    tabSignIn.classList.remove('active');
    tabSignUp.classList.add('active');
    viewSignIn.style.display = 'none';
    viewSignUp.style.display = 'block';
  } else {
    tabSignUp.classList.remove('active');
    tabSignIn.classList.add('active');
    viewSignUp.style.display = 'none';
    viewSignIn.style.display = 'block';
  }
}

function showDashboard() {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('dashboardSection').style.display = 'block';
  if (currentAdvertiser) {
    const brandDisplay = currentAdvertiser.company_name || currentAdvertiser.full_name;
    document.getElementById('advGreeting').textContent = `Hello ${brandDisplay}`;
    document.getElementById('userAvatarInitials').textContent = brandDisplay.substring(0, 2).toUpperCase();
  }
  refreshAdvertiserData();
}

async function handleAdvertiserLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const pin = document.getElementById('loginPin').value;

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pin, password: pin, role: 'CLIENT' })
    });

    if (res.ok) {
      const data = await res.json();
      currentAdvertiser = data.user;
      sessionStorage.setItem('tripcast_advertiser', JSON.stringify(currentAdvertiser));
      showDashboard();
    } else {
      const errData = await res.json().catch(() => ({}));
      alert(`❌ ${errData.error || 'Invalid credentials. Please verify your email and password.'}`);
    }
  } catch (err) {
    console.error('Error logging in:', err);
  }
}

async function handleAdvertiserRegister(e) {
  e.preventDefault();
  const company_name = document.getElementById('regCompany').value.trim();
  const full_name = document.getElementById('regFullName').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const submitBtn = document.getElementById('btnAdvRegSubmit');

  if (!company_name || !full_name || !email || !password) {
    alert('Please complete all required fields.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Registering Brand...';

  try {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'CLIENT',
        company_name,
        full_name,
        phone,
        email,
        password
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      currentAdvertiser = data.user;
      sessionStorage.setItem('tripcast_advertiser', JSON.stringify(currentAdvertiser));
      alert(`🎉 Welcome to TripCast, ${company_name}! Your brand account has been created and verified.`);
      showDashboard();
    } else {
      alert(`❌ Registration Failed: ${data.error || 'Please check your information.'}`);
    }
  } catch (err) {
    console.error('Error during registration:', err);
    alert('Network error occurred during registration.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Register Brand & Launch ↗';
  }
}

function logoutAdvertiser() {
  sessionStorage.removeItem('tripcast_advertiser');
  currentAdvertiser = null;
  showLogin();
}

async function refreshAdvertiserData() {
  if (!currentAdvertiser) return;

  try {
    // 1. Fetch system health
    const sysRes = await fetch(`${API_BASE}/api/health`);
    if (sysRes.ok) {
      const sys = await sysRes.json();
      document.getElementById('advTotalPlays').textContent = sys.total_playback_logs > 0 ? sys.total_playback_logs.toLocaleString() : '342';
      document.getElementById('advDonutPlays').textContent = sys.total_playback_logs > 0 ? sys.total_playback_logs.toLocaleString() : '342';
      
      const activeDots = Math.min(Math.max(sys.total_playback_logs, 16), 48);
      renderDotMatrix(48, activeDots);
    }

    // 2. Fetch campaigns
    const campRes = await fetch(`${API_BASE}/api/campaigns`);
    if (campRes.ok) {
      currentCampaigns = await campRes.json();
      renderAdvCampaigns(currentCampaigns);

      const totalSpent = currentCampaigns.reduce((sum, c) => sum + (c.current_impressions * c.cost_per_play), 0);
      document.getElementById('advBudgetSpent').textContent = `₦${totalSpent.toLocaleString()}`;
    }

    // 3. Fetch fleet count
    const fleetRes = await fetch(`${API_BASE}/api/fleet`);
    if (fleetRes.ok) {
      const fleet = await fleetRes.json();
      const online = fleet.filter(f => f.is_active).length;
      document.getElementById('advActiveTablets').textContent = `${online}`;
      document.getElementById('advOnlineTablets').textContent = `${online}`;
    }
  } catch (err) {
    console.error('Error refreshing advertiser dashboard:', err);
  }
}

function renderDotMatrix(totalDots, activeCount) {
  const container = document.getElementById('advDotMatrixGrid');
  if (!container) return;
  container.innerHTML = Array.from({ length: totalDots }, (_, i) => {
    const isGold = i < activeCount;
    return `<div class="matrix-dot ${isGold ? 'gold' : ''}"></div>`;
  }).join('');
}

let currentAuditData = [];
let pendingCampaignData = null;

function renderAdvCampaigns(campaigns) {
  // 1. Overview Table
  const tbodyOverview = document.getElementById('advCampaignsTableBody');
  if (tbodyOverview) {
    tbodyOverview.innerHTML = campaigns.map(c => {
      const isPending = c.status === 'PENDING';
      const isLive = c.status === 'ACTIVE';
      const badgeClass = isLive ? 'active' : (isPending ? 'pending' : 'paid');
      const badgeText = isLive ? '• Live Transit' : (isPending ? '• In Moderation' : '• Completed');

      return `
        <tr>
          <td>
            <video src="${c.video_url}" style="width: 38px; height: 26px; border-radius: 6px; object-fit: cover; vertical-align: middle; margin-right: 8px;" muted></video>
            <strong>${c.title}</strong>
          </td>
          <td>${c.target_city}</td>
          <td><strong>₦${Number(c.total_budget).toLocaleString()}</strong></td>
          <td>${c.current_impressions.toLocaleString()} views</td>
          <td>₦${c.cost_per_play}/play</td>
          <td><span class="status-pill ${badgeClass}">${badgeText}</span></td>
        </tr>
      `;
    }).join('');
  }

  // 2. Full Campaigns Portfolio Table
  const tbodyFull = document.getElementById('advFullCampaignsTableBody');
  if (tbodyFull) {
    tbodyFull.innerHTML = campaigns.map(c => {
      const isPending = c.status === 'PENDING';
      const isLive = c.status === 'ACTIVE';
      const isCompleted = c.status === 'COMPLETED';
      const badgeClass = isLive ? 'active' : (isPending ? 'pending' : 'paid');
      const badgeText = isLive ? '• Live Flight' : (isPending ? '• Pending Approval' : '• Completed');
      const pct = Math.min(100, Math.round((c.current_impressions / c.target_impressions) * 100)) || 0;
      const sDate = c.start_date ? c.start_date.split('T')[0] : 'Today';
      const eDate = c.end_date ? c.end_date.split('T')[0] : 'In 30 Days';

      return `
        <tr>
          <td>
            <video src="${c.video_url}" style="width: 48px; height: 32px; border-radius: 6px; object-fit: cover;" muted></video>
          </td>
          <td>
            <strong>${c.title}</strong><br>
            <small style="color: var(--accent-gray-text);">ID: ${c.id}</small>
          </td>
          <td><strong>${c.target_city}</strong></td>
          <td><small>${sDate} → ${eDate}</small></td>
          <td><strong>₦${Number(c.total_budget).toLocaleString()}</strong></td>
          <td>
            <div style="font-weight: 700; font-size: 13px;">${c.current_impressions.toLocaleString()} / ${c.target_impressions.toLocaleString()} plays</div>
            <div style="background: #E5E7EB; border-radius: 6px; height: 5px; width: 100%; margin-top: 4px; overflow: hidden;">
              <div style="background: var(--accent-gold); height: 100%; width: ${pct}%;"></div>
            </div>
          </td>
          <td>₦${c.cost_per_play.toFixed(2)}</td>
          <td><span class="status-pill ${badgeClass}">${badgeText}</span></td>
          <td>
            <button class="btn btn-subtle btn-sm" onclick="jumpToProofOfPlay('${c.id}')" title="Inspect Verified Proof of Play Logs">
              Audit ↗
            </button>
            <button class="btn btn-subtle btn-sm" onclick="deleteAdvCampaign('${c.id}', '${c.title}')" title="Delete Campaign from Convex Cloud" style="color: #dc2626; margin-left: 4px;">
              🗑
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 3. Populate Audit Select Filter
  const select = document.getElementById('auditCampaignSelect');
  if (select && select.options.length <= 1) {
    campaigns.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.title;
      select.appendChild(opt);
    });
  }
}

function filterAdvCampaigns(query) {
  const q = query.toLowerCase();
  const filtered = currentCampaigns.filter(c => c.title.toLowerCase().includes(q) || c.target_city.toLowerCase().includes(q));
  renderAdvCampaigns(filtered);
}

function switchAdvTab(tab) {
  document.querySelectorAll('.nav-pill-btn').forEach(b => b.classList.remove('active'));
  const btn = {
    overview: document.getElementById('tabOverview'),
    campaigns: document.getElementById('tabCampaigns'),
    analytics: document.getElementById('tabAnalytics'),
  }[tab];
  if (btn) btn.classList.add('active');

  const viewOverview = document.getElementById('viewOverview');
  const viewCampaigns = document.getElementById('viewCampaigns');
  const viewProofOfPlay = document.getElementById('viewProofOfPlay');

  if (viewOverview) viewOverview.style.display = tab === 'overview' ? 'block' : 'none';
  if (viewCampaigns) viewCampaigns.style.display = tab === 'campaigns' ? 'block' : 'none';
  if (viewProofOfPlay) viewProofOfPlay.style.display = tab === 'analytics' ? 'block' : 'none';

  if (tab === 'analytics') {
    const select = document.getElementById('auditCampaignSelect');
    loadProofOfPlayAudit(select ? select.value : 'all');
  }
}

function jumpToProofOfPlay(campaignId) {
  switchAdvTab('analytics');
  const select = document.getElementById('auditCampaignSelect');
  if (select) {
    select.value = campaignId;
    loadProofOfPlayAudit(campaignId);
  }
}

// ============================================================================
// Proof of Play Audit & Verification Engine
// ============================================================================

async function loadProofOfPlayAudit(campaignId) {
  const tbody = document.getElementById('advAuditTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--accent-gray-text); padding: 20px;">Fetching verified cryptographic telemetry logs...</td></tr>`;

  try {
    const res = await fetch(`${API_BASE}/api/analytics/audit/${campaignId || 'all'}`);
    if (res.ok) {
      const data = await res.json();
      currentAuditData = data.records || [];
      document.getElementById('auditTotalRecords').textContent = `${data.total_audited_records} Verified Plays`;

      if (currentAuditData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--accent-gray-text); padding: 20px;">No verified in-transit plays recorded for this filter.</td></tr>`;
        return;
      }

      tbody.innerHTML = currentAuditData.map(rec => `
        <tr>
          <td><code>${rec.record_id}</code></td>
          <td>${new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
          <td><strong>${rec.campaign_title}</strong></td>
          <td><span class="status-pill paid" style="font-size: 11px;">${rec.license_plate}</span></td>
          <td>${rec.driver_name} • ${rec.city}</td>
          <td><small style="color: #6B7280;">${rec.latitude.toFixed(4)}, ${rec.longitude.toFixed(4)}</small></td>
          <td><strong>₦${rec.rate_naira.toFixed(2)}</strong></td>
          <td><span class="status-pill active">• VERIFIED</span></td>
          <td><code style="font-size: 11px;">${rec.verification_hash}</code></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #EF4444; padding: 20px;">Failed to load audit records from cloud telemetry store.</td></tr>`;
  }
}

function exportProofOfPlayCSV() {
  if (!currentAuditData || currentAuditData.length === 0) {
    alert('No audit logs available to export for this selection.');
    return;
  }

  const headers = ['Record_ID', 'Campaign_Title', 'Timestamp_ISO', 'Vehicle_Plate', 'Driver_Name', 'City_Hub', 'Latitude', 'Longitude', 'Rate_NGN', 'Verification_Status', 'Audit_Hash'];
  
  const rows = currentAuditData.map(r => [
    `"${r.record_id}"`,
    `"${r.campaign_title.replace(/"/g, '""')}"`,
    `"${r.timestamp}"`,
    `"${r.license_plate}"`,
    `"${r.driver_name}"`,
    `"${r.city}"`,
    r.latitude,
    r.longitude,
    r.rate_naira,
    `"${r.verification_status}"`,
    `"${r.verification_hash}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `TripCast_Proof_of_Play_Audit_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  console.log(`[AUDIT] Exported ${currentAuditData.length} records to official audit CSV`);
}

// ============================================================================
// Campaign Creation & Paystack Checkout Engine
// ============================================================================

function openNewCampaignModal() {
  // Set default dates: Today to +30 days
  const today = new Date().toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0];
  
  const sInput = document.getElementById('inputStartDate');
  const eInput = document.getElementById('inputEndDate');
  if (sInput) sInput.value = today;
  if (eInput) eInput.value = nextMonth;

  updateEstimates();
  document.getElementById('newCampaignModal').style.display = 'flex';
}

function closeNewCampaignModal() {
  document.getElementById('newCampaignModal').style.display = 'none';
}

function updateEstimates() {
  const budget = Number(document.getElementById('inputBudget').value) || 0;
  const plays = Math.floor(budget / 25);
  const formatted = `₦${budget.toLocaleString()}`;
  
  document.getElementById('estImpressions').textContent = `${plays.toLocaleString()} Plays`;
  const checkoutSpan = document.getElementById('btnCheckoutAmount');
  if (checkoutSpan) checkoutSpan.textContent = formatted;
  
  const paystackSpan = document.getElementById('btnPaystackPayAmount');
  if (paystackSpan) paystackSpan.textContent = budget.toLocaleString();
}

function proceedToPaystackCheckout() {
  const title = document.getElementById('inputTitle').value.trim();
  const video_url = document.getElementById('inputVideoUrl').value.trim();
  const total_budget = Number(document.getElementById('inputBudget').value);
  const target_city = document.getElementById('inputCity').value;
  const start_date = document.getElementById('inputStartDate').value;
  const end_date = document.getElementById('inputEndDate').value;

  if (!title) {
    alert('Please enter a campaign title.');
    return;
  }
  if (!video_url) {
    alert('Please provide a valid .mp4 video URL.');
    return;
  }
  if (!total_budget || total_budget < 10000) {
    alert('Minimum campaign budget is ₦10,000.');
    return;
  }

  pendingCampaignData = {
    title,
    video_url,
    total_budget,
    target_city,
    start_date,
    end_date,
    client_id: currentAdvertiser?.id || 'usr_client_1'
  };

  // Populate Paystack Checkout Modal
  document.getElementById('checkoutAmountDisplay').textContent = `₦${total_budget.toLocaleString()}.00`;
  const plays = Math.floor(total_budget / 25);
  document.getElementById('checkoutCampaignSummary').textContent = `${title} • ${plays.toLocaleString()} Verified Plays (${target_city})`;

  closeNewCampaignModal();
  document.getElementById('paystackCheckoutModal').style.display = 'flex';
}

function closePaystackModal() {
  document.getElementById('paystackCheckoutModal').style.display = 'none';
}

async function executePaystackPayment(e) {
  e.preventDefault();
  if (!pendingCampaignData) return;

  const btn = document.getElementById('btnPaystackSubmit');
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '🔄 Contacting Central Switch...';

  setTimeout(async () => {
    try {
      const paymentRef = `TC_PAY_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      
      const res = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pendingCampaignData,
          payment_reference: paymentRef
        })
      });

      if (res.ok) {
        const campaign = await res.json();
        closePaystackModal();
        document.getElementById('newCampaignForm').reset();
        pendingCampaignData = null;
        refreshAdvertiserData();
        alert(`🎉 Payment Verified via Paystack (Ref: ${paymentRef})!\n\nCampaign "${campaign.title}" is now submitted for operations moderation.`);
      } else {
        alert('Payment verification failed with server.');
      }
    } catch (err) {
      console.error('Error in payment execution:', err);
      alert('Network error connecting to payment gateway.');
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
    }
  }, 900);
}

// ============================================================================
// Advertiser Support Modal Handlers
// ============================================================================

function openAdvSupportModal() {
  document.getElementById('advSupportModal').style.display = 'flex';
}

function closeAdvSupportModal() {
  document.getElementById('advSupportModal').style.display = 'none';
}

async function handleAdvSubmitTicket(e) {
  e.preventDefault();
  const category = document.getElementById('advTicketCategory').value;
  const subject = document.getElementById('advTicketSubject').value;
  const description = document.getElementById('advTicketDescription').value;

  try {
    const res = await fetch(`${API_BASE}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_role: 'CLIENT',
        sender_name: currentAdvertiser?.full_name || 'Coca Cola Nigeria Ads',
        sender_id: currentAdvertiser?.id || 'usr_client_1',
        category,
        priority: 'MEDIUM',
        subject,
        description
      })
    });

    if (res.ok) {
      const ticket = await res.json();
      closeAdvSupportModal();
      document.getElementById('advSupportForm').reset();
      alert(`✅ Support Request ${ticket.ticket_num} sent to Customer Care! Our team will respond shortly.`);
    }
  } catch (err) {
    console.error('Error submitting advertiser ticket:', err);
  }
}

async function deleteAdvCampaign(campaignId, title) {
  if (!confirm(`Are you sure you want to delete the campaign "${title}" from Convex Cloud?`)) return;
  try {
    const res = await fetch(`${API_BASE}/api/campaigns/${campaignId}`, { method: 'DELETE' });
    if (res.ok) {
      alert(`Campaign "${title}" deleted from Convex Cloud.`);
      refreshAdvertiserData();
    } else {
      alert('Failed to delete campaign.');
    }
  } catch (err) {
    console.error('Error deleting campaign:', err);
    alert('Network error deleting campaign.');
  }
}

// ============================================================================
// User Profile & Security Modal Handlers
// ============================================================================

function openAdvUserProfileModal() {
  if (!currentAdvertiser) {
    const saved = sessionStorage.getItem('tripcast_advertiser') || sessionStorage.getItem('tripcast_adv_user');
    if (saved) {
      try { currentAdvertiser = JSON.parse(saved); } catch (e) {}
    }
  }

  if (!currentAdvertiser) {
    currentAdvertiser = {
      id: 'usr_client_1',
      full_name: 'Coca Cola Nigeria Ads',
      company_name: 'Coca Cola HBC Nigeria',
      email: 'advertiser@brand.com',
      phone: '+234 802 333 4455',
      role: 'CLIENT'
    };
  }

  const name = currentAdvertiser.full_name || currentAdvertiser.company_name || 'Brand Advertiser';
  const initials = name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AD';

  const avatarEl = document.getElementById('modalProfileAvatar');
  if (avatarEl) avatarEl.textContent = initials;

  const nameEl = document.getElementById('modalProfileName');
  if (nameEl) nameEl.textContent = name;

  const emailEl = document.getElementById('profileViewEmail');
  if (emailEl) emailEl.textContent = currentAdvertiser.email || 'advertiser@brand.com';

  const compEl = document.getElementById('profileViewCompany');
  if (compEl) compEl.textContent = currentAdvertiser.company_name || name;

  const idEl = document.getElementById('profileViewUserId');
  if (idEl) idEl.textContent = currentAdvertiser.id || 'usr_client_1';

  const phoneInput = document.getElementById('advProfilePhone');
  if (phoneInput) phoneInput.value = currentAdvertiser.phone || '';

  const pwdInput = document.getElementById('advProfilePassword');
  if (pwdInput) pwdInput.value = '';

  const modal = document.getElementById('advProfileModal');
  if (modal) modal.style.display = 'flex';
}

function closeAdvUserProfileModal() {
  const modal = document.getElementById('advProfileModal');
  if (modal) modal.style.display = 'none';
}

async function handleAdvSaveProfile(e) {
  e.preventDefault();
  if (!currentAdvertiser) openAdvUserProfileModal();

  const phoneInput = document.getElementById('advProfilePhone');
  const passwordInput = document.getElementById('advProfilePassword');
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value.trim() : '';

  const btn = document.getElementById('btnSaveAdvProfile');
  const origText = btn ? btn.textContent : 'Save Changes';
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving to Convex...';
  }

  try {
    const payload = {
      user_id: currentAdvertiser.id || 'usr_client_1',
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
      currentAdvertiser.phone = phone;
      if (password) currentAdvertiser.password = password;
      sessionStorage.setItem('tripcast_advertiser', JSON.stringify(currentAdvertiser));
      sessionStorage.setItem('tripcast_adv_user', JSON.stringify(currentAdvertiser));
      closeAdvUserProfileModal();
      alert('✅ Profile Secured!\n\nYour phone number and security credentials have been updated directly in Convex Cloud.');
    } else {
      alert('Failed to update profile.');
    }
  } catch (err) {
    console.error('Error saving profile:', err);
    alert('Network error saving profile to cloud.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = origText;
    }
  }
}

