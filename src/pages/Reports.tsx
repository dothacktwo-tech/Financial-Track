import React, { useState, useMemo, useRef } from 'react';
import {
  Download,
  Printer,
  Calendar,
  Sparkles,
  FileSpreadsheet,
  FileCode,
  FileText,
  X,
  Check,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatCurrency } from '../lib/currency';
import { formatDate, getMonthStartAndEnd } from '../lib/date';
import { Account, Debt, Receivable, SavingGoal, Transaction } from '../types/database';
import { useToast } from '../components/ui/Toast';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ReportsProps {
  transactions: Transaction[];
  accounts: Account[];
  debts: Debt[];
  receivables: Receivable[];
  savingGoals: SavingGoal[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'];

export const Reports: React.FC<ReportsProps> = ({
  transactions,
  accounts,
  debts,
  receivables,
  savingGoals,
}) => {
  const { showToast } = useToast();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  // HTML5 Print Modal State
  const [isHTML5ModalOpen, setIsHTML5ModalOpen] = useState<boolean>(false);
  const printIframeRef = useRef<HTMLIFrameElement>(null);

  // Month date range
  const { startDate, endDate } = useMemo(() => {
    return getMonthStartAndEnd(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  // Current filtered transactions for the selected month
  const periodTransactions = useMemo(() => {
    return transactions.filter(
      (tx) => tx.transaction_date >= startDate && tx.transaction_date <= endDate
    );
  }, [transactions, startDate, endDate]);

  // Previous month transactions for comparative insights
  const prevMonthTransactions = useMemo(() => {
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevRange = getMonthStartAndEnd(prevYear, prevMonth);
    return transactions.filter(
      (tx) => tx.transaction_date >= prevRange.startDate && tx.transaction_date <= prevRange.endDate
    );
  }, [transactions, selectedYear, selectedMonth]);

  // Calculations
  const totalIncome = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + Number(t.amount), 0);
  }, [periodTransactions]);

  const totalExpense = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + Number(t.amount), 0);
  }, [periodTransactions]);

  const cashflow = totalIncome - totalExpense;

  const prevExpense = useMemo(() => {
    return prevMonthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + Number(t.amount), 0);
  }, [prevMonthTransactions]);

  const expenseChangePercent = prevExpense > 0
    ? (((totalExpense - prevExpense) / prevExpense) * 100).toFixed(1)
    : null;

  const totalAssets = accounts.reduce((acc, a) => acc + (a.current_balance || 0), 0);
  const totalDebt = debts.reduce((acc, d) => acc + Number(d.remaining_amount || 0), 0);
  const totalReceivable = receivables.reduce((acc, r) => acc + Number(r.remaining_amount || 0), 0);
  const totalSavings = savingGoals.reduce((acc, g) => acc + Number(g.current_amount || 0), 0);

  // Saving ratio = (Income - Expense) / Income
  const savingRatio = totalIncome > 0 ? Math.max(0, (cashflow / totalIncome) * 100).toFixed(1) : '0';

  // Category breakdown for expenses
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    periodTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = t.category?.name || 'Lainnya';
        map.set(cat, (map.get(cat) || 0) + Number(t.amount));
      });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [periodTransactions]);

  const topExpenseCategory = categoryBreakdown[0] || null;

  // Comparison Bar Chart Data (Income vs Expense)
  const comparisonData = [
    {
      name: 'Bulan Ini',
      Pemasukan: totalIncome,
      Pengeluaran: totalExpense,
      Cashflow: cashflow,
    },
  ];

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const currentPeriodLabel = `${monthNames[selectedMonth - 1]} ${selectedYear}`;

  // CSV Exporter
  const handleExportCSV = () => {
    const headers = ['ID', 'Tanggal', 'Jenis', 'Kategori', 'Deskripsi', 'Rekening', 'Nominal', 'Catatan'];
    const rows = periodTransactions.map((tx) => [
      tx.id,
      tx.transaction_date,
      tx.type,
      tx.category?.name || (tx.type === 'transfer' ? 'Transfer Saldo' : '-'),
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      tx.account?.name || '-',
      tx.amount,
      `"${(tx.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FinTrack_Laporan_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Laporan CSV berhasil diunduh.', 'success');
  };

  // HTML5 Report Document Generator
  const generateHTML5ReportDocument = () => {
    const rowsHtml = periodTransactions
      .map((tx, idx) => {
        const isInc = tx.type === 'income';
        const isTrans = tx.type === 'transfer';
        const typeBadge = isInc
          ? '<span style="color:#059669;background:#ecfdf5;padding:2px 8px;border-radius:6px;font-weight:bold;font-size:11px;">Pemasukan</span>'
          : isTrans
          ? '<span style="color:#2563eb;background:#eff6ff;padding:2px 8px;border-radius:6px;font-weight:bold;font-size:11px;">Transfer</span>'
          : '<span style="color:#e11d48;background:#fff1f2;padding:2px 8px;border-radius:6px;font-weight:bold;font-size:11px;">Pengeluaran</span>';
        const amountColor = isInc ? '#059669' : isTrans ? '#2563eb' : '#e11d48';
        const sign = isInc ? '+' : isTrans ? '' : '-';

        return `
          <tr style="border-bottom:1px solid #e2e8f0;font-size:12px;">
            <td style="padding:10px 12px;color:#64748b;">${idx + 1}</td>
            <td style="padding:10px 12px;font-weight:600;white-space:nowrap;">${formatDate(tx.transaction_date)}</td>
            <td style="padding:10px 12px;">${typeBadge}</td>
            <td style="padding:10px 12px;color:#334155;">${tx.category?.name || (isTrans ? 'Transfer Saldo' : '-')}</td>
            <td style="padding:10px 12px;font-weight:600;color:#0f172a;">${tx.description || '-'}</td>
            <td style="padding:10px 12px;color:#64748b;">${tx.account?.name || '-'}</td>
            <td style="padding:10px 12px;text-align:right;font-weight:bold;color:${amountColor};white-space:nowrap;">
              ${sign}${formatCurrency(tx.amount)}
            </td>
          </tr>
        `;
      })
      .join('');

    const accountRowsHtml = accounts
      .map((acc, idx) => {
        return `
          <tr style="border-bottom:1px solid #f1f5f9;font-size:12px;">
            <td style="padding:8px 12px;">${idx + 1}. <strong>${acc.name}</strong> <span style="color:#64748b;font-size:11px;">(${acc.type})</span></td>
            <td style="padding:8px 12px;color:#64748b;">${acc.description || '-'}</td>
            <td style="padding:8px 12px;text-align:right;font-weight:bold;color:#0f172a;">${formatCurrency(acc.current_balance)}</td>
          </tr>
        `;
      })
      .join('');

    const categoryRowsHtml = categoryBreakdown
      .map((cat, idx) => {
        const pct = totalExpense > 0 ? ((cat.value / totalExpense) * 100).toFixed(1) : 0;
        return `
          <tr style="border-bottom:1px solid #f1f5f9;font-size:12px;">
            <td style="padding:8px 12px;">${idx + 1}. <strong>${cat.name}</strong></td>
            <td style="padding:8px 12px;text-align:right;font-weight:bold;color:#0f172a;">${formatCurrency(cat.value)}</td>
            <td style="padding:8px 12px;text-align:right;color:#64748b;">${pct}%</td>
          </tr>
        `;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Laporan Keuangan HTML5 - FinTrack Personal - ${currentPeriodLabel}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }
    .header-box {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px;
      background: #f8fafc;
    }
    .kpi-title {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: bold;
      color: #64748b;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #f1f5f9;
      color: #475569;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid #cbd5e1;
    }
    .footer-sign {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      tr { page-break-inside: avoid; }
      thead { display: table-header-group; }
    }
    @media screen {
      .print-bar {
        position: sticky;
        top: 0;
        z-index: 999;
        background: #0f172a;
        color: #ffffff;
        padding: 12px 20px;
        border-radius: 8px;
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
      .print-btn {
        background: #10b981;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-weight: bold;
        cursor: pointer;
        font-size: 13px;
      }
      .print-btn:hover {
        background: #059669;
      }
    }
  </style>
</head>
<body>
  <!-- On-Screen Action Bar (Hidden when printed to paper or PDF) -->
  <div class="print-bar no-print">
    <div>
      <strong>Dokumen HTML5 FinTrack Personal</strong>
      <span style="opacity: 0.8; font-size: 12px; margin-left: 8px;">(Format standar web & siap cetak A4)</span>
    </div>
    <button class="print-btn" onclick="window.print()">🖨️ Cetak / Simpan PDF Sekarang</button>
  </div>

  <div class="header-box">
    <div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <span style="background:#059669;color:#ffffff;padding:4px 8px;border-radius:6px;font-weight:bold;font-size:12px;">FINTRACK</span>
        <h1 style="margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px;">LAPORAN KEUANGAN BULANAN</h1>
      </div>
      <p style="margin:0;font-size:12px;color:#64748b;">
        Dokumen Cetak HTML5 Resmi — Periode: <strong>${currentPeriodLabel}</strong> (${startDate} s/d ${endDate})
      </p>
    </div>
    <div style="text-align:right;font-size:11px;color:#64748b;">
      <p style="margin:0;">No. Dokumen: <strong>FT-${selectedYear}${String(selectedMonth).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}</strong></p>
      <p style="margin:2px 0 0 0;">Dicetak pada: ${formatDate(new Date())}</p>
    </div>
  </div>

  <!-- KPI Summaries -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-title">Total Pemasukan</div>
      <div class="kpi-value" style="color:#059669;">${formatCurrency(totalIncome)}</div>
      <div style="font-size:11px;color:#64748b;margin-top:2px;">${periodTransactions.filter((t) => t.type === 'income').length} transaksi masuk</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Total Pengeluaran</div>
      <div class="kpi-value" style="color:#e11d48;">${formatCurrency(totalExpense)}</div>
      <div style="font-size:11px;color:#64748b;margin-top:2px;">${periodTransactions.filter((t) => t.type === 'expense').length} transaksi keluar</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Cashflow Bersih</div>
      <div class="kpi-value" style="color:${cashflow >= 0 ? '#059669' : '#e11d48'};">${formatCurrency(cashflow)}</div>
      <div style="font-size:11px;color:#64748b;margin-top:2px;">${cashflow >= 0 ? 'Surplus Operasional' : 'Defisit Kas'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Total Saldo Aset</div>
      <div class="kpi-value">${formatCurrency(totalAssets)}</div>
      <div style="font-size:11px;color:#64748b;margin-top:2px;">${accounts.length} rekening aktif</div>
    </div>
  </div>

  <!-- Ringkasan Finansial Eksekutif -->
  <div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px;background:#f8fafc;margin-bottom:24px;display:flex;justify-content:space-between;font-size:12px;flex-wrap:wrap;gap:12px;">
    <div>
      <span style="color:#64748b;">Rasio Tabungan:</span>
      <strong style="color:#059669;margin-left:4px;">${savingRatio}%</strong>
    </div>
    <div>
      <span style="color:#64748b;">Pengeluaran Terbesar:</span>
      <strong style="color:#0f172a;margin-left:4px;">${topExpenseCategory ? `${topExpenseCategory.name} (${formatCurrency(topExpenseCategory.value)})` : '-'}</strong>
    </div>
    <div>
      <span style="color:#64748b;">Total Kewajiban Hutang:</span>
      <strong style="color:#e11d48;margin-left:4px;">${formatCurrency(totalDebt)}</strong>
    </div>
    <div>
      <span style="color:#64748b;">Total Hak Piutang:</span>
      <strong style="color:#2563eb;margin-left:4px;">${formatCurrency(totalReceivable)}</strong>
    </div>
  </div>

  <!-- Posisi Saldo Rekening Saat Ini -->
  <h3 style="font-size:14px;font-weight:700;margin:0 0 10px 0;text-transform:uppercase;color:#334155;">
    1. Posisi Saldo Rekening & Dompet Aktif
  </h3>
  <table>
    <thead>
      <tr>
        <th>Nama Rekening</th>
        <th>Nomor Rekening</th>
        <th style="text-align:right;">Saldo Berjalan (Rp)</th>
      </tr>
    </thead>
    <tbody>
      ${accountRowsHtml || '<tr><td colspan="3" style="text-align:center;padding:12px;color:#94a3b8;">Tidak ada rekening aktif</td></tr>'}
    </tbody>
    <tfoot>
      <tr style="background:#f8fafc;border-top:2px solid #cbd5e1;font-weight:bold;">
        <td colspan="2" style="padding:10px 12px;text-transform:uppercase;font-size:11px;">Total Likuiditas Saldo</td>
        <td style="padding:10px 12px;text-align:right;color:#0f172a;">${formatCurrency(totalAssets)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Distribusi Pos Pengeluaran -->
  <h3 style="font-size:14px;font-weight:700;margin:24px 0 10px 0;text-transform:uppercase;color:#334155;">
    2. Distribusi Beban Pos Pengeluaran
  </h3>
  <table>
    <thead>
      <tr>
        <th>Kategori</th>
        <th style="text-align:right;">Nominal Beban (Rp)</th>
        <th style="text-align:right;">Persentase (%)</th>
      </tr>
    </thead>
    <tbody>
      ${categoryRowsHtml || '<tr><td colspan="3" style="text-align:center;padding:12px;color:#94a3b8;">Tidak ada data pengeluaran</td></tr>'}
    </tbody>
    <tfoot>
      <tr style="background:#f8fafc;border-top:2px solid #cbd5e1;font-weight:bold;">
        <td style="padding:10px 12px;text-transform:uppercase;font-size:11px;">Total Beban Operasional</td>
        <td style="padding:10px 12px;text-align:right;color:#e11d48;">${formatCurrency(totalExpense)}</td>
        <td style="padding:10px 12px;text-align:right;color:#64748b;">100%</td>
      </tr>
    </tfoot>
  </table>

  <!-- Buku Kas Transaksi -->
  <h3 style="font-size:14px;font-weight:700;margin:24px 0 10px 0;text-transform:uppercase;color:#334155;">
    3. Rincian Buku Kas Transaksi (${periodTransactions.length} Data)
  </h3>
  <table>
    <thead>
      <tr>
        <th style="width:30px;">No</th>
        <th>Tanggal</th>
        <th>Jenis</th>
        <th>Kategori</th>
        <th>Deskripsi / Merchant</th>
        <th>Rekening</th>
        <th style="text-align:right;">Nominal (Rp)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="7" style="text-align:center;padding:12px;color:#94a3b8;">Tidak ada transaksi</td></tr>'}
    </tbody>
    <tfoot>
      <tr style="background:#f8fafc;border-top:2px solid #cbd5e1;font-weight:bold;">
        <td colspan="6" style="padding:10px 12px;text-transform:uppercase;font-size:11px;">Surplus / Defisit Arus Kas (Net Cashflow)</td>
        <td style="padding:10px 12px;text-align:right;color:${cashflow >= 0 ? '#059669' : '#e11d48'};">
          ${cashflow >= 0 ? '+' : ''}${formatCurrency(cashflow)}
        </td>
      </tr>
    </tfoot>
  </table>

  <!-- Tanda Tangan Pengesahan -->
  <div class="footer-sign">
    <div style="font-size:11px;color:#64748b;max-width:320px;">
      <p style="margin:0;font-weight:bold;color:#334155;">Catatan Dokumen:</p>
      <p style="margin:4px 0 0 0;">
        Laporan keuangan ini dihasilkan secara otomatis oleh sistem FinTrack Personal dengan format HTML5 standar.
      </p>
    </div>
    <div style="text-align:center;min-width:180px;font-size:12px;">
      <p style="margin:0;color:#64748b;">Pemilik Akun,</p>
      <div style="height:55px;"></div>
      <p style="margin:0;font-weight:bold;border-top:1px solid #94a3b8;padding-top:4px;">
        ( ${accounts[0]?.name ? 'Pengguna FinTrack' : 'Bendahara Mandiri'} )
      </p>
    </div>
  </div>
</body>
</html>`;
  };

  // Trigger HTML5 direct print via isolated iframe (eliminates iframe parent clipping)
  const handlePrintHTML5 = () => {
    const htmlContent = generateHTML5ReportDocument();
    const printFrame = printIframeRef.current;
    if (printFrame) {
      const doc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(htmlContent);
        doc.close();
        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch (e) {
            console.error('Print error:', e);
            showToast('Gunakan tombol Unduh HTML5 untuk mencetak langsung dari browser.', 'info');
          }
        }, 350);
      }
    }
  };

  // Download standalone HTML5 file
  const handleDownloadHTML5File = () => {
    const htmlContent = generateHTML5ReportDocument();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FinTrack_Laporan_Keuangan_${selectedYear}_${selectedMonth}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('File dokumen HTML5 berhasil diunduh.', 'success');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Off-screen iframe for pristine HTML5 printing (kept in DOM with opacity:0 to avoid display:none print bugs) */}
      <iframe
        ref={printIframeRef}
        title="Print Frame"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          width: '1000px',
          height: '1000px',
          border: 'none',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Header and Print/Export controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Laporan Keuangan Bulanan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Analisis arus kas, distribusi belanja, dan rasio kesehatan finansial
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Month & Year Selectors */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
          >
            {monthNames.map((m, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
          >
            Export CSV
          </Button>

          {/* Cetak HTML5 Button (Replacing legacy Print button) */}
          <Button
            size="sm"
            onClick={() => setIsHTML5ModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
            icon={<FileCode className="w-4 h-4 text-emerald-400" />}
          >
            Cetak HTML5
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Pemasukan
          </span>
          <p className="mt-2 text-xl sm:text-2xl font-extrabold text-emerald-600">
            {formatCurrency(totalIncome)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {periodTransactions.filter((t) => t.type === 'income').length} transaksi masuk
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Pengeluaran
          </span>
          <p className="mt-2 text-xl sm:text-2xl font-extrabold text-rose-600">
            {formatCurrency(totalExpense)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {periodTransactions.filter((t) => t.type === 'expense').length} transaksi keluar
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Cashflow Bersih
          </span>
          <p
            className={`mt-2 text-xl sm:text-2xl font-extrabold ${
              cashflow >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatCurrency(cashflow)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {cashflow >= 0 ? 'Surplus Operasional' : 'Defisit Pengeluaran'}
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Saldo Rekening
          </span>
          <p className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900">
            {formatCurrency(totalAssets)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Di {accounts.length} rekening aktif</p>
        </Card>
      </div>

      {/* Financial Insights Box */}
      <Card className="p-6 bg-gradient-to-r from-emerald-50/70 to-teal-50/60 border-emerald-200/80">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-3 flex-1">
            <div>
              <h3 className="text-sm font-extrabold text-emerald-950 uppercase tracking-wider">
                Financial Insights (Analisis Cerdas)
              </h3>
              <p className="text-xs text-emerald-800/80">
                Poin penting keuangan Anda untuk periode {currentPeriodLabel}:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div className="bg-white/80 rounded-xl p-3 border border-emerald-100">
                <span className="text-[11px] text-slate-500 font-medium block">
                  Pengeluaran Terbesar:
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1">
                  {topExpenseCategory
                    ? `${topExpenseCategory.name} — ${formatCurrency(topExpenseCategory.value)}`
                    : 'Belum ada data'}
                </p>
              </div>

              <div className="bg-white/80 rounded-xl p-3 border border-emerald-100">
                <span className="text-[11px] text-slate-500 font-medium block">
                  Perbandingan vs Bulan Lalu:
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1">
                  {expenseChangePercent !== null
                    ? `${Number(expenseChangePercent) > 0 ? '+' : ''}${expenseChangePercent}% dibanding bulan lalu`
                    : 'Tidak ada data pembanding'}
                </p>
              </div>

              <div className="bg-white/80 rounded-xl p-3 border border-emerald-100">
                <span className="text-[11px] text-slate-500 font-medium block">
                  Rasio Tabungan:
                </span>
                <p className="text-xs font-bold text-emerald-700 mt-1">
                  {savingRatio}% dari total pemasukan
                </p>
              </div>

              <div className="bg-white/80 rounded-xl p-3 border border-emerald-100">
                <span className="text-[11px] text-slate-500 font-medium block">
                  Status Cashflow:
                </span>
                <p
                  className={`text-xs font-bold mt-1 ${
                    cashflow >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {cashflow >= 0 ? 'Positif (Aman)' : 'Negatif (Perlu Penghematan)'}
                </p>
              </div>
            </div>

            <p className="text-[10px] text-emerald-800/60 italic pt-1">
              * Catatan: Analisis ini disajikan secara otomatis berdasarkan data pembukuan Anda dan bukan merupakan nasihat investasi formal.
            </p>
          </div>
        </div>
      </Card>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Comparison Bar Chart */}
        <Card className="lg:col-span-7 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Pemasukan vs Pengeluaran ({currentPeriodLabel})
            </h3>
            <p className="text-xs text-slate-500">Perbandingan nominal dana masuk dan keluar</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `${v / 1000000}M`}
                />
                <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                <Legend />
                <Bar dataKey="Pemasukan" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Pengeluaran" fill="#f43f5e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Category Breakdown Donut */}
        <Card className="lg:col-span-5 p-5">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">Distribusi Pos Pengeluaran</h3>
            <p className="text-xs text-slate-500">Proporsi kategori belanja bulan ini</p>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Tidak ada data pengeluaran pada periode ini
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {categoryBreakdown.map((cat, idx) => {
                  const share = totalExpense > 0 ? ((cat.value / totalExpense) * 100).toFixed(1) : 0;
                  return (
                    <div key={cat.name} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="font-medium text-slate-700 truncate max-w-[130px]">
                          {cat.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 mr-2">{formatCurrency(cat.value)}</span>
                        <span className="text-[10px] text-slate-400">({share}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Detailed Transactions Table for the Period */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Rincian Transaksi ({periodTransactions.length} Data)
          </h3>
          <span className="text-xs text-slate-500">
            {startDate} s/d {endDate}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Jenis</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Deskripsi</th>
                <th className="py-3 px-4">Rekening</th>
                <th className="py-3 px-4 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {periodTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                    {formatDate(tx.transaction_date)}
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={tx.type === 'income' ? 'emerald' : tx.type === 'transfer' ? 'blue' : 'rose'}
                      size="sm"
                    >
                      {tx.type === 'income' ? 'Pemasukan' : tx.type === 'transfer' ? 'Transfer' : 'Pengeluaran'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {tx.category?.name || (tx.type === 'transfer' ? 'Transfer' : '-')}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">
                    {tx.description}
                  </td>
                  <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                    {tx.account?.name || '-'}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                      tx.type === 'income'
                        ? 'text-emerald-600'
                        : tx.type === 'transfer'
                        ? 'text-blue-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '' : '-'}
                    {formatCurrency(tx.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Cetak HTML5 Interaktif */}
      {isHTML5ModalOpen && (
        <Modal
          isOpen={isHTML5ModalOpen}
          onClose={() => setIsHTML5ModalOpen(false)}
          title="Lembar Dokumen Cetak HTML5"
          description={`Pratinjau Dokumen HTML5 Laporan Keuangan Periode ${currentPeriodLabel}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <FileCode className="w-4 h-4 text-emerald-600" />
                <span>Format Dokumen: HTML5 Standar A4 Cetak</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadHTML5File}
                  icon={<Download className="w-3.5 h-3.5 text-blue-600" />}
                >
                  Unduh File .html
                </Button>
                <Button
                  size="sm"
                  onClick={handlePrintHTML5}
                  icon={<Printer className="w-3.5 h-3.5" />}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Cetak Sekarang
                </Button>
              </div>
            </div>

            {/* Live WYSIWYG Document Preview Container */}
            <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm bg-slate-100">
              <iframe
                srcDoc={generateHTML5ReportDocument()}
                title="Pratinjau Lembar HTML5"
                className="w-full h-[65vh] bg-white border-0"
              />
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setIsHTML5ModalOpen(false)}>
                Tutup
              </Button>
              <Button
                size="sm"
                onClick={handlePrintHTML5}
                icon={<Printer className="w-3.5 h-3.5" />}
              >
                Cetak Dokumen HTML5
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
