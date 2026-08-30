const API_BASE = window.location.origin;

let currentDriver = null;
let isCasting = false;
let isPaused = false;
let isMuted = true;
let isFullscreen = false;
let activePlaylist = [];
let currentVideoIndex = 0;
let shiftPlaysCount = 0;
let shiftEarningsNaira = 0;
let currentDriverRate = 10.00;

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  fetchDriverRate();
  setupVideoEngine();
  setupKeyboardControls();
  setInterval(refreshDriverData, 7000);
});

async function fetchDriverRate() {
  try {
    const res = await fetch(`${API_BASE}/api/config/rates`);
    if (res.ok) {
      const data = await res.json();
      currentDriverRate = data.driver_payout_rate || 10.00;
      
      const rateEl = document.getElementById('driverPayoutRateVal');
      if (rateEl) rateEl.textContent = `₦${currentDriverRate.toFixed(2)} / play`;

      const sub = document.getElementById('castPlayerSub');
      if (sub && !isCasting) {
        sub.textContent = `When Cast Mode is ON, videos loop automatically and credit ₦${currentDriverRate.toFixed(2)} per verified play to your shift balance.`;
      }
    }
  } catch (err) {
    console.error('Error fetching driver rate:', err);
  }
}

function checkAuth() {
  const saved = sessionStorage.getItem('tripcast_driver');
  if (saved) {
    currentDriver = JSON.parse(saved);
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
  if (currentDriver) {
    document.getElementById('driverGreeting').textContent = `Hello ${currentDriver.full_name}`;
    document.getElementById('driverInitials').textContent = currentDriver.full_name.substring(0, 2).toUpperCase();
    if (currentDriver.vehicle) {
      document.getElementById('vehiclePlateBadge').textContent = currentDriver.vehicle.license_plate;
      document.getElementById('driverBattery').textContent = `${currentDriver.vehicle.battery_level}% 🔋`;
    }
  }
  refreshDriverData();
}

async function handleDriverLogin(e) {
  e.preventDefault();
  const email = document.getElementById('driverEmail').value;
  const pin = document.getElementById('driverPin').value;

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, pin, role: 'DRIVER' })
    });

    if (res.ok) {
      const data = await res.json();
      currentDriver = data.user;
      sessionStorage.setItem('tripcast_driver', JSON.stringify(currentDriver));
      showDashboard();
    } else {
      alert('❌ Invalid driver credentials. Demo account: emeka.driver@tripcast.io / PIN: 1234');
    }
  } catch (err) {
    console.error('Error driver login:', err);
  }
}

function logoutDriver() {
  if (isCasting) {
    stopCastMode();
  }
  sessionStorage.removeItem('tripcast_driver');
  currentDriver = null;
  showLogin();
}

async function refreshDriverData() {
  if (!currentDriver) return;

  try {
    const res = await fetch(`${API_BASE}/api/driver/summary/${currentDriver.id}`);
    if (res.ok) {
      const data = await res.json();
      activePlaylist = data.active_playlist || [];
      renderPlaylistTable(activePlaylist);
      document.getElementById('playlistCountBadge').textContent = `${activePlaylist.length} Ads Active`;

      const totalWeekly = 1200 + (shiftEarningsNaira);
      document.getElementById('driverWeeklyTotal').textContent = `₦${totalWeekly.toLocaleString()}`;
    }

    const payRes = await fetch(`${API_BASE}/api/payouts`);
    if (payRes.ok) {
      const payouts = await payRes.json();
      renderDriverPayouts(payouts);
    }
  } catch (err) {
    console.error('Error refreshing driver data:', err);
  }
}

function renderPlaylistTable(playlist) {
  const tbody = document.getElementById('driverPlaylistTableBody');
  if (!tbody) return;

  if (!playlist || playlist.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--accent-gray-text);">No active ads in daily payload.</td></tr>`;
    return;
  }

  tbody.innerHTML = playlist.map(ad => `
    <tr>
      <td>
        <video src="${ad.video_url}" style="width: 42px; height: 28px; border-radius: 6px; object-fit: cover;" muted></video>
      </td>
      <td><strong>${ad.title}</strong></td>
      <td>${ad.target_city || 'Lagos'}</td>
      <td><span class="status-pill active">₦${currentDriverRate.toFixed(2)} / play</span></td>
    </tr>
  `).join('');
}

function renderDriverPayouts(payouts) {
  const tbody = document.getElementById('driverPayoutsTableBody');
  if (!tbody) return;

  if (!payouts || payouts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--accent-gray-text);">No settlements generated yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = payouts.map(p => `
    <tr>
      <td>${p.period_start} → ${p.period_end}</td>
      <td><strong>${p.total_plays_verified.toLocaleString()}</strong> plays</td>
      <td><strong style="color: var(--accent-black);">₦${Number(p.payout_amount).toLocaleString()}</strong></td>
      <td><span class="status-pill paid">Paid to Bank</span></td>
    </tr>
  `).join('');
}

// ============================================================================
// Turn On Cast Video Engine (16:9 Aspect Ratio & Fullscreen)
// ============================================================================

function setupVideoEngine() {
  const video = document.getElementById('driverCastVideo');
  if (!video) return;

  video.addEventListener('timeupdate', () => {
    if (video.duration && !isNaN(video.duration)) {
      const pct = (video.currentTime / video.duration) * 100;
      document.getElementById('castProgressFill').style.width = `${pct}%`;
    }
  });

  video.addEventListener('ended', async () => {
    await handleVideoPlayCompleted();
  });

  // Fullscreen change event listener
  document.addEventListener('fullscreenchange', () => {
    const container = document.getElementById('castVideoContainer');
    const exitBtn = document.getElementById('btnExitFullscreen');
    if (document.fullscreenElement) {
      isFullscreen = true;
      container.classList.add('fullscreen-mode-active');
      if (exitBtn) exitBtn.style.display = 'block';
    } else {
      isFullscreen = false;
      container.classList.remove('fullscreen-mode-active');
      if (exitBtn) exitBtn.style.display = 'none';
    }
  });
}

function setupKeyboardControls() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    
    if (e.code === 'Space') {
      e.preventDefault();
      togglePauseCast();
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullscreenCast();
    }
  });
}

function toggleCastMode() {
  if (isCasting) {
    stopCastMode();
  } else {
    startCastMode();
  }
}

function startCastMode() {
  isCasting = true;
  isPaused = false;
  const btn = document.getElementById('btnToggleCast');
  const dot = document.getElementById('castDot');
  const statusText = document.getElementById('castStatusText');
  const standby = document.getElementById('castStandbyScreen');
  const video = document.getElementById('driverCastVideo');
  const badge = document.getElementById('castPlayerBadge');
  const sub = document.getElementById('castPlayerSub');
  const pauseBtn = document.getElementById('btnPauseCast');

  btn.textContent = '⏹ Turn OFF Cast';
  btn.classList.add('active');
  dot.classList.add('active');
  statusText.textContent = 'Cast Mode: LIVE (Streaming)';
  standby.style.display = 'none';
  video.style.display = 'block';
  badge.textContent = '• LIVE CASTING';
  badge.className = 'status-pill active';
  sub.textContent = `Broadcasting 16:9 video loop. Completed plays credit ₦${currentDriverRate.toFixed(2)} to your shift balance.`;
  if (pauseBtn) pauseBtn.textContent = '⏸ Pause';

  startPlayingNextVideo();
}

function stopCastMode() {
  isCasting = false;
  isPaused = false;
  const btn = document.getElementById('btnToggleCast');
  const dot = document.getElementById('castDot');
  const statusText = document.getElementById('castStatusText');
  const standby = document.getElementById('castStandbyScreen');
  const video = document.getElementById('driverCastVideo');
  const badge = document.getElementById('castPlayerBadge');
  const sub = document.getElementById('castPlayerSub');
  const pauseBtn = document.getElementById('btnPauseCast');

  btn.textContent = '⚡ Turn ON Cast';
  btn.classList.remove('active');
  dot.classList.remove('active');
  statusText.textContent = 'Cast Mode: OFF';
  standby.style.display = 'flex';
  video.style.display = 'none';
  video.pause();
  badge.textContent = 'Ready for Transit';
  badge.className = 'status-pill pending';
  sub.textContent = `When Cast Mode is ON, videos loop automatically and credit ₦${currentDriverRate.toFixed(2)} per verified play to your shift balance.`;
  document.getElementById('castProgressFill').style.width = '0%';
  if (pauseBtn) pauseBtn.textContent = '⏸ Pause';

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(err => console.log(err));
  }
}

function togglePauseCast() {
  if (!isCasting) {
    startCastMode();
    return;
  }

  const video = document.getElementById('driverCastVideo');
  const pauseBtn = document.getElementById('btnPauseCast');

  if (video.paused) {
    video.play().then(() => {
      isPaused = false;
      if (pauseBtn) pauseBtn.textContent = '⏸ Pause';
      document.getElementById('castStatusText').textContent = 'Cast Mode: LIVE (Streaming)';
    }).catch(err => console.log('Play failed:', err));
  } else {
    video.pause();
    isPaused = true;
    if (pauseBtn) pauseBtn.textContent = '▶ Resume';
    document.getElementById('castStatusText').textContent = 'Cast Mode: PAUSED';
  }
}

function toggleMuteCast() {
  const video = document.getElementById('driverCastVideo');
  const btn = document.getElementById('btnMuteToggle');
  isMuted = !isMuted;
  video.muted = isMuted;
  btn.textContent = isMuted ? '🔇 Muted' : '🔊 Audio ON';
}

function toggleFullscreenCast() {
  const container = document.getElementById('castVideoContainer');
  
  if (!document.fullscreenElement) {
    if (container.requestFullscreen) {
      container.requestFullscreen().catch(err => {
        // CSS fallback if Fullscreen API is blocked
        container.classList.toggle('fullscreen-mode-active');
      });
    } else {
      container.classList.toggle('fullscreen-mode-active');
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => console.log(err));
    }
  }
}

function startPlayingNextVideo() {
  if (!isCasting) return;
  if (!activePlaylist || activePlaylist.length === 0) {
    alert('No active campaigns in manifest. Please ensure at least one campaign is active in the Admin console.');
    return;
  }

  const currentAd = activePlaylist[currentVideoIndex];
  const video = document.getElementById('driverCastVideo');

  document.getElementById('hudCampaignTitle').textContent = currentAd.title;
  document.getElementById('playlistProgressText').textContent = `Looping Advert ${currentVideoIndex + 1} of ${activePlaylist.length}`;

  video.src = currentAd.video_url;
  video.muted = isMuted;
  video.load();
  video.play().catch(err => console.log('Autoplay handled:', err));
}

async function handleVideoPlayCompleted() {
  if (!isCasting) return;

  const currentAd = activePlaylist[currentVideoIndex];

  // Increment session counters at admin-configured rate
  shiftPlaysCount += 1;
  shiftEarningsNaira += currentDriverRate;

  // Update UI HUD
  document.getElementById('driverShiftPlays').textContent = shiftPlaysCount;
  document.getElementById('driverShiftEarnings').textContent = `₦${shiftEarningsNaira.toFixed(2)}`;
  document.getElementById('hudLivePlays').textContent = `Shift Plays: ${shiftPlaysCount} (+₦${shiftEarningsNaira.toFixed(2)})`;

  // Send Verified Telemetry Log to Backend Gateway
  try {
    const res = await fetch(`${API_BASE}/api/driver/cast/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        driver_id: currentDriver?.id || 'usr_driver_1',
        vehicle_id: currentDriver?.vehicle?.id || 'veh_01',
        campaign_id: currentAd.id
      })
    });

    if (res.ok) {
      console.log(`[CAST LOGGED] Verified view recorded for ${currentAd.title}. Shift Total: ₦${shiftEarningsNaira}`);
    }
  } catch (err) {
    console.error('Error logging cast telemetry:', err);
  }

  // Advance to next video in continuous loop
  currentVideoIndex = (currentVideoIndex + 1) % activePlaylist.length;
  startPlayingNextVideo();
}

// ============================================================================
// Driver Dispute & Support Modal Handlers
// ============================================================================

function openDriverSupportModal() {
  document.getElementById('driverSupportModal').style.display = 'flex';
}

function closeDriverSupportModal() {
  document.getElementById('driverSupportModal').style.display = 'none';
}

async function handleDriverSubmitTicket(e) {
  e.preventDefault();
  const category = document.getElementById('ticketCategory').value;
  const subject = document.getElementById('ticketSubject').value;
  const description = document.getElementById('ticketDescription').value;

  try {
    const res = await fetch(`${API_BASE}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_role: 'DRIVER',
        sender_name: currentDriver?.full_name || 'Emeka Okafor',
        sender_id: currentDriver?.id || 'usr_driver_1',
        category,
        priority: category === 'PAYOUT_DISPUTE' ? 'HIGH' : 'MEDIUM',
        subject,
        description: `${description} [Vehicle: ${currentDriver?.vehicle?.license_plate || 'LAG-492-AA'}]`
      })
    });

    if (res.ok) {
      const ticket = await res.json();
      closeDriverSupportModal();
      document.getElementById('driverSupportForm').reset();
      alert(`✅ Support Ticket ${ticket.ticket_num} created successfully! Our Customer Care desk will investigate your issue.`);
    }
  } catch (err) {
    console.error('Error submitting driver support ticket:', err);
  }
}

