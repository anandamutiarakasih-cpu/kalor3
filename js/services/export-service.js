/**
 * THERMO CHAMPIONS: HEAT EDITION
 * CSV Export Service for Teacher / Admin
 */

export function exportSessionToCSV(sessionCode, sessionData) {
  if (!sessionData || !sessionData.teams) {
    alert('Tidak ada data kelompok untuk diekspor.');
    return;
  }

  const teams = Object.values(sessionData.teams);
  if (teams.length === 0) {
    alert('Belum ada kelompok yang terdaftar.');
    return;
  }

  // Sort descending by total score
  const sorted = [...teams].sort((a, b) => {
    const totalA = a.scores?.total || 0;
    const totalB = b.scores?.total || 0;
    return totalB - totalA;
  });

  const headers = [
    'Peringkat',
    'Nomor Kelompok',
    'Nama Kelompok',
    'Jumlah Anggota',
    'Daftar Anggota (Nama & Absen)',
    'Skor Game 1 (Shuffle & Recall)',
    'Skor Game 2 (Word Scramble)',
    'Skor Game 3 (Extreme Addition)',
    'Total Skor',
    'Predikat',
    'Status'
  ];

  const rows = sorted.map((t, index) => {
    const memberStr = (t.members || [])
      .map((m) => `${m.name || 'Siswa'} (Absen ${m.absen || '-'})`)
      .join('; ');

    return [
      index + 1,
      `Kelompok ${t.number}`,
      `"${(t.name || '').replace(/"/g, '""')}"`,
      (t.members || []).length,
      `"${memberStr.replace(/"/g, '""')}"`,
      t.scores?.game1 || 0,
      t.scores?.game2 || 0,
      t.scores?.game3 || 0,
      t.scores?.total || 0,
      `"${t.predicate || 'Temperature Rookie'}"`,
      t.ready ? 'Siap' : 'Menunggu'
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const now = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `Hasil_Thermo_Champions_${sessionCode}_${now}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
