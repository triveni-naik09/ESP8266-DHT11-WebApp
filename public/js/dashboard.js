// Dashboard Logic for Simple IoT World
(function () {
  // Authentication Check
  const currentUserRaw = localStorage.getItem('iot_user');
  let currentUser = null;

  if (!currentUserRaw) {
    window.location.href = 'index.html';
    return;
  }

  try {
    currentUser = JSON.parse(currentUserRaw);
  } catch (e) {
    localStorage.removeItem('iot_user');
    window.location.href = 'index.html';
    return;
  }

  // State Management
  let currentPage = 1;
  let pageLimit = 10;
  let chartInstance = null;
  let currentLedStatus = 'OFF';
  let isSimulating = false;

  // DOM Content Loaded
  document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initTabs();
    initChart();
    initLcdControls();
    initLedSwitch();
    initSimulator();

    // Initial Data Fetch
    fetchStatus();
    fetchHistory();
    fetchRecords(1);

    // Polling interval (every 3 seconds for responsive online status and telemetry updates)
    setInterval(() => {
      fetchStatus();
    }, 3000);
  });

  /* ==========================================================
     1. HEADER & USER DETAILS
  ========================================================== */
  function initHeader() {
    const userNameEl = document.getElementById('headerUserName');
    if (userNameEl && currentUser && currentUser.name) {
      userNameEl.textContent = `Welcome ${currentUser.name}`;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('iot_user');
        window.location.href = 'index.html?logout=true';
      });
    }
  }

  /* ==========================================================
     2. TAB NAVIGATION
  ========================================================== */
  function initTabs() {
    const tabBtns = document.querySelectorAll('[data-tab-target]');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab-target');

        // Reset active state on buttons
        tabBtns.forEach(b => {
          b.classList.remove('bg-pink-blue-gradient', 'text-white', 'shadow-md', 'shadow-pink-500/30');
          b.classList.add('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-200/50', 'dark:hover:bg-slate-800/50');
        });

        // Set active button
        btn.classList.add('bg-pink-blue-gradient', 'text-white', 'shadow-md', 'shadow-pink-500/30');
        btn.classList.remove('text-slate-600', 'dark:text-slate-300', 'hover:bg-slate-200/50', 'dark:hover:bg-slate-800/50');

        // Switch Tab Panes
        tabContents.forEach(content => {
          if (content.id === targetId) {
            content.classList.add('active');
          } else {
            content.classList.remove('active');
          }
        });

        // Resize Chart if Tab 1 activated
        if (targetId === 'tab-telemetry' && chartInstance) {
          setTimeout(() => chartInstance.resize(), 100);
        }
      });
    });
  }

  /* ==========================================================
     3. ESP8266 HARDWARE STATUS & TELEMETRY
  ========================================================== */
  async function fetchStatus() {
    try {
      const res = await fetch('/api/iot/status');
      const data = await res.json();
      if (!data.success) return;

      // 1. ESP8266 Online/Offline indicator
      updateDeviceStatusBadge(data.isOnline, data.secondsAgo);

      // 2. Telemetry Gauges
      if (data.latestRecord) {
        updateGauges(data.latestRecord.temperature, data.latestRecord.humidity);
      }

      // 3. LED Status Sync
      if (data.ledStatus && data.ledStatus !== currentLedStatus) {
        updateLedUi(data.ledStatus);
      }

      // 4. LCD Display Sync
      if (data.lcdLine1 !== undefined && data.lcdLine2 !== undefined) {
        updateLcdLivePreview(data.lcdLine1, data.lcdLine2);
      }
    } catch (err) {
      console.warn('Error fetching device status:', err);
    }
  }

  function updateDeviceStatusBadge(isOnline, secondsAgo) {
    const badge = document.getElementById('espStatusBadge');
    const dot = document.getElementById('espStatusDot');
    const text = document.getElementById('espStatusText');
    const subtext = document.getElementById('espStatusSubtext');

    if (!badge || !dot || !text) return;

    if (isOnline) {
      badge.className = 'flex items-center space-x-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all';
      dot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 radar-dot';
      text.textContent = 'ESP8266: ONLINE';
      if (subtext) subtext.textContent = 'Active NodeMCU CP2102';
    } else {
      badge.className = 'flex items-center space-x-2 px-3 py-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all';
      dot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500';
      text.textContent = 'ESP8266: OFFLINE';
      if (subtext) {
        if (secondsAgo !== null && secondsAgo !== undefined) {
          subtext.textContent = `Last seen: ${secondsAgo}s ago`;
        } else {
          subtext.textContent = 'Waiting for initial ping...';
        }
      }
    }
  }

  /* ==========================================================
     4. GAUGES & SEEK BARS (SECTION 1)
  ========================================================== */
  function updateGauges(temp, hum) {
    // Temperature Elements
    const tempValueEl = document.getElementById('tempDisplayVal');
    const tempGaugeMeter = document.getElementById('tempGaugeCircle');
    const tempComfortPill = document.getElementById('tempComfortPill');
    const tempSeekProgress = document.getElementById('tempSeekProgress');

    if (tempValueEl) tempValueEl.textContent = Number(temp).toFixed(1);

    // Temperature SVG Meter (Range: 0 to 50 'C)
    // Circumference for r=68 is 2 * PI * 68 = ~427.25
    if (tempGaugeMeter) {
      const circ = 427.25;
      const clampedTemp = Math.min(Math.max(temp, 0), 50);
      const offset = circ - (clampedTemp / 50) * circ;
      tempGaugeMeter.style.strokeDashoffset = offset;
    }

    if (tempSeekProgress) {
      const pct = Math.min(Math.max((temp / 50) * 100, 0), 100);
      tempSeekProgress.style.width = `${pct}%`;
    }

    if (tempComfortPill) {
      if (temp < 20) {
        tempComfortPill.textContent = 'Cool';
        tempComfortPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30';
      } else if (temp <= 30) {
        tempComfortPill.textContent = 'Comfortable';
        tempComfortPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
      } else if (temp <= 36) {
        tempComfortPill.textContent = 'Warm';
        tempComfortPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30';
      } else {
        tempComfortPill.textContent = 'Hot Alert';
        tempComfortPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30';
      }
    }

    // Humidity Elements
    const humValueEl = document.getElementById('humDisplayVal');
    const humGaugeMeter = document.getElementById('humGaugeCircle');
    const humComfortPill = document.getElementById('humComfortPill');
    const humSeekProgress = document.getElementById('humSeekProgress');

    if (humValueEl) humValueEl.textContent = Math.round(hum);

    // Humidity SVG Meter (Range: 0 to 100 %)
    if (humGaugeMeter) {
      const circ = 427.25;
      const clampedHum = Math.min(Math.max(hum, 0), 100);
      const offset = circ - (clampedHum / 100) * circ;
      humGaugeMeter.style.strokeDashoffset = offset;
    }

    if (humSeekProgress) {
      const pct = Math.min(Math.max(hum, 0), 100);
      humSeekProgress.style.width = `${pct}%`;
    }

    if (humComfortPill) {
      if (hum < 30) {
        humComfortPill.textContent = 'Dry Air';
        humComfortPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30';
      } else if (hum <= 60) {
        humComfortPill.textContent = 'Ideal Range';
        humComfortPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30';
      } else {
        humComfortPill.textContent = 'High Moisture';
        humComfortPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30';
      }
    }
  }

  /* ==========================================================
     5. CHART.JS GRAPHS (TEMPERATURE & HUMIDITY)
  ========================================================== */
  async function fetchHistory() {
    try {
      const res = await fetch('/api/records/history?count=15');
      const data = await res.json();
      if (data.success && data.history) {
        updateChartData(data.history);
      }
    } catch (e) {
      console.warn('Error fetching chart history:', e);
    }
  }

  function initChart() {
    const ctx = document.getElementById('telemetryChart');
    if (!ctx) return;

    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#94a3b8' : '#64748b';

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: "Temperature ('C)",
            data: [],
            borderColor: '#ec4899',
            backgroundColor: 'rgba(236, 72, 153, 0.12)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            yAxisID: 'yTemp',
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#ec4899'
          },
          {
            label: 'Humidity (%)',
            data: [],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            yAxisID: 'yHum',
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#3b82f6'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: textColor,
              font: { family: 'Outfit', size: 12, weight: '600' },
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: isDark ? '#f8fafc' : '#0f172a',
            bodyColor: isDark ? '#e2e8f0' : '#334155',
            borderColor: isDark ? 'rgba(236, 72, 153, 0.3)' : 'rgba(59, 130, 246, 0.3)',
            borderWidth: 1,
            padding: 12,
            boxPadding: 6,
            usePointStyle: true
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { family: 'Outfit', size: 11 } }
          },
          yTemp: {
            type: 'linear',
            display: true,
            position: 'left',
            grid: { color: gridColor },
            ticks: {
              color: '#ec4899',
              callback: (val) => `${val} 'C`,
              font: { family: 'Outfit', size: 11, weight: 'bold' }
            },
            min: 0,
            max: 55
          },
          yHum: {
            type: 'linear',
            display: true,
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: {
              color: '#3b82f6',
              callback: (val) => `${val}%`,
              font: { family: 'Outfit', size: 11, weight: 'bold' }
            },
            min: 0,
            max: 100
          }
        }
      }
    });

    // Handle theme toggle update for Chart colors
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        setTimeout(() => {
          const dark = document.documentElement.classList.contains('dark');
          const gColor = dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)';
          const tColor = dark ? '#94a3b8' : '#64748b';
          chartInstance.options.scales.x.grid.color = gColor;
          chartInstance.options.scales.x.ticks.color = tColor;
          chartInstance.options.scales.yTemp.grid.color = gColor;
          chartInstance.options.plugins.legend.labels.color = tColor;
          chartInstance.update();
        }, 150);
      });
    }
  }

  function updateChartData(history) {
    if (!chartInstance) return;
    const labels = history.map(item => item.time || '');
    const temps = history.map(item => item.temperature);
    const hums = history.map(item => item.humidity);

    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = temps;
    chartInstance.data.datasets[1].data = hums;
    chartInstance.update();
  }

  /* ==========================================================
     6. SECTION 2: SAVED RECORDS TABLE WITH PAGINATION
  ========================================================== */
  async function fetchRecords(page = 1) {
    try {
      currentPage = page;
      const res = await fetch(`/api/records?page=${currentPage}&limit=${pageLimit}&order=desc`);
      const data = await res.json();
      if (!data.success) return;

      renderRecordsTable(data.records, data.pagination);
      renderPaginationControls(data.pagination);
    } catch (err) {
      console.error('Error fetching records:', err);
    }
  }

  function renderRecordsTable(records, pagination) {
    const tbody = document.getElementById('recordsTableBody');
    if (!tbody) return;

    if (!records || records.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-8 text-center text-slate-400 dark:text-slate-500 italic">
            No telemetry records found. Send sensor data from ESP8266 or click "Simulate Reading".
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    records.forEach((rec, idx) => {
      // Calculate row numbering starting from index
      const rowNum = pagination.startIndex + idx;
      html += `
        <tr class="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
          <td class="px-5 py-3.5 text-xs font-bold text-slate-500 dark:text-slate-400">#${rowNum}</td>
          <td class="px-5 py-3.5 text-sm font-semibold text-pink-600 dark:text-pink-400">
            <span class="inline-flex items-center space-x-1">
              <span>${rec.temperature} 'C</span>
            </span>
          </td>
          <td class="px-5 py-3.5 text-sm font-semibold text-blue-600 dark:text-blue-400">
            <span class="inline-flex items-center space-x-1">
              <span>${rec.humidity}%</span>
            </span>
          </td>
          <td class="px-5 py-3.5 text-xs font-medium text-slate-600 dark:text-slate-300 font-mono">
            ${rec.time}
          </td>
          <td class="px-5 py-3.5 text-xs font-medium text-slate-600 dark:text-slate-300 font-mono">
            ${rec.date}
          </td>
          <td class="px-5 py-3.5 text-right">
            <button onclick="window.deleteRecord('${rec.id}')" 
              class="px-3 py-1 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer">
              Delete
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  }

  function renderPaginationControls(p) {
    const infoEl = document.getElementById('paginationInfo');
    const container = document.getElementById('paginationButtons');

    if (infoEl) {
      infoEl.textContent = `Showing ${p.startIndex} to ${p.endIndex} of ${p.totalRecords} records (Timezone: Asia/Kolkata +5:30)`;
    }

    if (!container) return;

    let btns = '';

    // Previous Button
    const prevDisabled = p.currentPage <= 1;
    btns += `
      <button onclick="window.changePage(${p.currentPage - 1})" ${prevDisabled ? 'disabled' : ''}
        class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold ${
          prevDisabled ? 'opacity-40 cursor-not-allowed text-slate-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer'
        }">
        &laquo; Prev
      </button>
    `;

    // Page Numbers
    for (let i = 1; i <= p.totalPages; i++) {
      if (i === 1 || i === p.totalPages || (i >= p.currentPage - 1 && i <= p.currentPage + 1)) {
        const isActive = i === p.currentPage;
        btns += `
          <button onclick="window.changePage(${i})"
            class="px-3 py-1.5 rounded-lg text-xs font-bold ${
              isActive
                ? 'bg-pink-blue-gradient text-white shadow-sm shadow-pink-500/30'
                : 'border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
            } cursor-pointer">
            ${i}
          </button>
        `;
      } else if (i === p.currentPage - 2 || i === p.currentPage + 2) {
        btns += `<span class="px-1 text-slate-400 text-xs">...</span>`;
      }
    }

    // Next Button
    const nextDisabled = p.currentPage >= p.totalPages;
    btns += `
      <button onclick="window.changePage(${p.currentPage + 1})" ${nextDisabled ? 'disabled' : ''}
        class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold ${
          nextDisabled ? 'opacity-40 cursor-not-allowed text-slate-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer'
        }">
        Next &raquo;
      </button>
    `;

    container.innerHTML = btns;
  }

  window.changePage = function (newPage) {
    if (newPage >= 1) {
      fetchRecords(newPage);
    }
  };

  window.deleteRecord = async function (id) {
    if (!confirm('Are you sure you want to delete this telemetry record?')) return;
    try {
      const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Record deleted successfully');
        fetchRecords(currentPage);
        fetchHistory();
      } else {
        alert(data.message || 'Failed to delete record');
      }
    } catch (e) {
      console.error(e);
      alert('Error deleting record');
    }
  };

  /* ==========================================================
     7. TAB 2: LCD DISPLAY CONTROLS (FIELD 1 & FIELD 2)
  ========================================================== */
  function initLcdControls() {
    const f1 = document.getElementById('lcdField1');
    const f2 = document.getElementById('lcdField2');
    const f1Count = document.getElementById('f1Count');
    const f2Count = document.getElementById('f2Count');
    const saveBtn = document.getElementById('saveLcdBtn');
    const lcdMsg = document.getElementById('lcdStatusMsg');

    if (!f1 || !f2) return;

    // Real-time character counter & interactive preview
    f1.addEventListener('input', () => {
      const val = f1.value;
      if (f1Count) {
        f1Count.textContent = `${val.length}/16`;
        f1Count.className = val.length === 16 ? 'text-rose-500 font-bold' : 'text-slate-400';
      }
      updateLcdLivePreview(val, f2.value);
    });

    f2.addEventListener('input', () => {
      const val = f2.value;
      if (f2Count) {
        f2Count.textContent = `${val.length}/16`;
        f2Count.className = val.length === 16 ? 'text-rose-500 font-bold' : 'text-slate-400';
      }
      updateLcdLivePreview(f1.value, val);
    });

    // Save Button
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const line1 = f1.value.substring(0, 16);
        const line2 = f2.value.substring(0, 16);

        try {
          saveBtn.disabled = true;
          saveBtn.innerHTML = '<span class="animate-spin inline-block mr-1">⟳</span> Updating Hardware LCD...';

          const res = await fetch('/api/control/lcd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ line1, line2 })
          });

          const data = await res.json();
          if (data.success) {
            showToast('LCD text saved! ESP8266 will display this on next fetch.');
            if (lcdMsg) {
              lcdMsg.textContent = '✓ Hardware LCD configuration synced with server.';
              lcdMsg.className = 'text-xs font-semibold text-emerald-500 mt-2 block';
              setTimeout(() => { lcdMsg.textContent = ''; }, 4000);
            }
          }
        } catch (e) {
          console.error(e);
          alert('Failed to save LCD details.');
        } finally {
          saveBtn.disabled = false;
          saveBtn.innerHTML = 'Save to LCD';
        }
      });
    }

    // Quick Presets
    window.setLcdPreset = function (l1, l2) {
      f1.value = l1;
      f2.value = l2;
      f1.dispatchEvent(new Event('input'));
      f2.dispatchEvent(new Event('input'));
    };
  }

  function updateLcdLivePreview(line1 = '', line2 = '') {
    const row1El = document.getElementById('lcdSimRow1');
    const row2El = document.getElementById('lcdSimRow2');

    // Format padded up to 16 chars with spaces
    const cleanR1 = (line1 || '').padEnd(16, ' ').substring(0, 16);
    const cleanR2 = (line2 || '').padEnd(16, ' ').substring(0, 16);

    if (row1El) row1El.textContent = cleanR1;
    if (row2El) row2El.textContent = cleanR2;
  }

  /* ==========================================================
     8. TAB 3: INNOVATIVE LED BUTTON (PIN D3)
  ========================================================== */
  function initLedSwitch() {
    const ledBtn = document.getElementById('ledSwitchButton');
    if (!ledBtn) return;

    ledBtn.addEventListener('click', async () => {
      playClickSound();
      const targetState = currentLedStatus === 'ON' ? 'OFF' : 'ON';

      try {
        const res = await fetch('/api/control/led', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: targetState })
        });
        const data = await res.json();
        if (data.success) {
          updateLedUi(data.ledStatus);
          showToast(`LED Actuator toggled: ${data.ledStatus}`);
        }
      } catch (e) {
        console.error('Error toggling LED:', e);
      }
    });
  }

  function updateLedUi(status) {
    currentLedStatus = status;
    const btn = document.getElementById('ledSwitchButton');
    const statusText = document.getElementById('ledStatusLabel');
    const diode = document.getElementById('hardwareDiodeSim');
    const subtext = document.getElementById('ledStateSubtext');

    if (status === 'ON') {
      if (btn) btn.classList.add('is-on');
      if (diode) diode.classList.add('diode-on');
      if (statusText) {
        statusText.textContent = 'ACTUATOR IS ON';
        statusText.className = 'text-lg font-black tracking-wider text-pink-500 drop-shadow-md';
      }
      if (subtext) subtext.textContent = 'NodeMCU Pin D3 output: HIGH (3.3V)';
    } else {
      if (btn) btn.classList.remove('is-on');
      if (diode) diode.classList.remove('diode-on');
      if (statusText) {
        statusText.textContent = 'ACTUATOR IS OFF';
        statusText.className = 'text-lg font-bold tracking-wider text-slate-400 dark:text-slate-500';
      }
      if (subtext) subtext.textContent = 'NodeMCU Pin D3 output: LOW (0V)';
    }
  }

  // Audio click synthesizer for tactile feel
  function playClickSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.08);
    } catch (e) {
      // AudioContext not allowed or not supported, ignore silently
    }
  }

  /* ==========================================================
     9. ESP8266 SIMULATION TOOL (FOR EFFORTLESS TESTING)
  ========================================================== */
  function initSimulator() {
    const simBtn = document.getElementById('simulateDataBtn');
    if (!simBtn) return;

    simBtn.addEventListener('click', async () => {
      try {
        simBtn.disabled = true;
        simBtn.innerHTML = '<span class="animate-spin inline-block">⟳</span> Simulating...';

        const res = await fetch('/api/iot/simulate', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(`New reading recorded: ${data.record.temperature}'C, ${data.record.humidity}%`);
          fetchStatus();
          fetchHistory();
          fetchRecords(currentPage);
        }
      } catch (e) {
        console.error(e);
      } finally {
        simBtn.disabled = false;
        simBtn.innerHTML = '⚡ Simulate Sensor Reading';
      }
    });
  }

  /* ==========================================================
     10. NOTIFICATION TOAST HELPER
  ========================================================== */
  function showToast(msg) {
    let toast = document.getElementById('iotToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'iotToast';
      toast.className = 'fixed bottom-20 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900/90 text-white text-xs font-semibold shadow-2xl border border-pink-500/30 backdrop-blur-md transition-all duration-300 transform translate-y-10 opacity-0 pointer-events-none flex items-center space-x-2';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <span class="w-2 h-2 rounded-full bg-pink-500 animate-ping"></span>
      <span>${msg}</span>
    `;
    toast.classList.remove('translate-y-10', 'opacity-0', 'pointer-events-none');

    setTimeout(() => {
      toast.classList.add('translate-y-10', 'opacity-0', 'pointer-events-none');
    }, 2800);
  }
})();
