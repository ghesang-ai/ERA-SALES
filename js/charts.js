// ============================================================
// ERA-SALES DASHBOARD — Chart Configurations (ApexCharts)
// ============================================================

let dailyChart = null;

function renderDailyChart(records, selectedLob) {
  // Filter data sesuai tab yang aktif
  let chartRows;
  if (selectedLob === 'SEMUA') {
    // Tampilkan semua LOB (baris LOB saja, bukan TSH)
    chartRows = records.filter(r => r.row_type === 'LOB');
  } else {
    // Tampilkan 1 LOB + semua TSH-nya
    chartRows = records.filter(r => r.lob_name === selectedLob);
  }

  // Kumpulkan semua tanggal yang ada
  const allDates = [...new Set(
    chartRows.flatMap(r => Object.keys(r.daily_sales || {}))
  )].sort();

  if (allDates.length === 0) {
    document.getElementById('chart-daily').innerHTML =
      '<p style="text-align:center;color:var(--text-3);padding:2rem;">Data harian belum tersedia.</p>';
    return;
  }

  // Format label tanggal
  const categories = allDates.map(d => {
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  });

  // Buat series
  const colors = ['#1E3A7A', '#F6B93B', '#00B894', '#FF4757', '#A29BFE', '#FD79A8'];
  const series = chartRows.map((r, i) => ({
    name: r.tsh_name || r.lob_name,
    data: allDates.map(d => {
      const v = r.daily_sales?.[d];
      return v != null ? Math.round(v / 1_000_000 * 10) / 10 : 0;
    })
  }));

  const options = {
    series,
    chart: {
      type: selectedLob === 'SEMUA' ? 'bar' : 'line',
      height: 240,
      toolbar: { show: false },
      fontFamily: 'Inter, sans-serif',
      animations: { enabled: true, speed: 600 },
      background: 'transparent',
    },
    colors,
    stroke: {
      width: selectedLob === 'SEMUA' ? 0 : 2.5,
      curve: 'smooth',
    },
    fill: {
      opacity: selectedLob === 'SEMUA' ? 1 : 0.9,
    },
    plotOptions: {
      bar: {
        borderRadius: 5,
        columnWidth: series.length > 3 ? '60%' : '40%',
        dataLabels: { position: 'top' },
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      labels: {
        style: { fontSize: '11px', colors: '#6B7A99', fontFamily: 'Inter, sans-serif' },
        rotate: -30,
      },
      axisBorder: { show: false },
      axisTicks:  { show: false },
    },
    yaxis: {
      labels: {
        style: { fontSize: '11px', colors: '#6B7A99', fontFamily: 'Inter, sans-serif' },
        formatter: (v) => v + 'M',
      }
    },
    grid: {
      borderColor: '#E2E8F0',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      theme: 'light',
      y: { formatter: (v) => v + ' Juta' },
      style: { fontSize: '12px', fontFamily: 'Inter, sans-serif' },
    },
    legend: {
      show: chartRows.length > 1,
      position: 'bottom',
      fontSize: '12px',
      fontFamily: 'Inter, sans-serif',
      markers: { radius: 4 },
      itemMargin: { horizontal: 8, vertical: 4 },
    },
    markers: {
      size: selectedLob === 'SEMUA' ? 0 : 4,
      strokeWidth: 0,
    },
    responsive: [
      {
        breakpoint: 600,
        options: {
          chart: { height: 200 },
          legend: { fontSize: '10px' },
          xaxis: { labels: { style: { fontSize: '10px' } } },
        }
      }
    ]
  };

  const el = document.getElementById('chart-daily');
  if (dailyChart) {
    dailyChart.destroy();
    dailyChart = null;
  }
  el.innerHTML = '';
  dailyChart = new ApexCharts(el, options);
  dailyChart.render();
}

// Render mini sparkline untuk KPI card (opsional)
function renderSparkline(elementId, data, color = '#1E3A7A') {
  const el = document.getElementById(elementId);
  if (!el || !data || data.length < 2) return;

  new ApexCharts(el, {
    series: [{ data }],
    chart: {
      type: 'line',
      height: 40,
      sparkline: { enabled: true },
      animations: { enabled: true, speed: 400 },
    },
    stroke: { width: 2, curve: 'smooth' },
    colors: [color],
    tooltip: { enabled: false },
  }).render();
}
