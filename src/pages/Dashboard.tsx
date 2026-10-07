import React, { useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  HandCoins,
  Coins,
  PiggyBank,
  Plus,
  Sparkles,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
} from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { formatCurrency } from '../lib/currency';
import { formatDate } from '../lib/date';
import {
  Account,
  Debt,
  Receivable,
  SavingGoal,
  Transaction,
} from '../types/database';
import { MonthlyTrendChart } from '../components/dashboard/MonthlyTrendChart';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';

interface DashboardProps {
  accounts: Account[];
  transactions: Transaction[];
  debts: Debt[];
  receivables: Receivable[];
  savingGoals: SavingGoal[];
  loading: boolean;
  onNavigate: (path: string) => void;
  onQuickAdd: () => void;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'];

export const Dashboard: React.FC<DashboardProps> = ({
  accounts,
  transactions,
  debts,
  receivables,
  savingGoals,
  loading,
  onNavigate,
  onQuickAdd,
}) => {
  // Current month metrics
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const currentMonthTxs = useMemo(() => {
    return transactions.filter((t) => t.transaction_date.startsWith(currentMonthStr));
  }, [transactions, currentMonthStr]);

  const totalBalance = useMemo(() => {
    return accounts.reduce((acc, a) => acc + (a.current_balance || 0), 0);
  }, [accounts]);

  const monthIncome = useMemo(() => {
    return currentMonthTxs
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + Number(t.amount), 0);
  }, [currentMonthTxs]);

  const monthExpense = useMemo(() => {
    return currentMonthTxs
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + Number(t.amount), 0);
  }, [currentMonthTxs]);

  const cashflow = monthIncome - monthExpense;

  const totalDebtRemaining = useMemo(() => {
    return debts.reduce((acc, d) => acc + Number(d.remaining_amount || 0), 0);
  }, [debts]);

  const totalReceivableRemaining = useMemo(() => {
    return receivables.reduce((acc, r) => acc + Number(r.remaining_amount || 0), 0);
  }, [receivables]);

  const totalSavingCurrent = useMemo(() => {
    return savingGoals.reduce((acc, g) => acc + Number(g.current_amount || 0), 0);
  }, [savingGoals]);

  const totalSavingTarget = useMemo(() => {
    return savingGoals.reduce((acc, g) => acc + Number(g.target_amount || 0), 0);
  }, [savingGoals]);

  const savingProgress = totalSavingTarget > 0 ? (totalSavingCurrent / totalSavingTarget) * 100 : 0;

  // Category breakdown for expense pie chart
  const categoryExpenses = useMemo(() => {
    const map = new Map<string, number>();
    currentMonthTxs
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const catName = t.category?.name || 'Lainnya';
        map.set(catName, (map.get(catName) || 0) + Number(t.amount));
      });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [currentMonthTxs]);

  if (loading) {
    return <LoadingState message="Memuat ringkasan dashboard..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 text-white shadow-md">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> AI OCR Assistant Siap Digunakan
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Ringkasan Keuangan Pribadi
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-emerald-100/80">
            Kendalikan arus kas, lacak hutang piutang, dan pantau target tabungan Anda dalam satu tempat.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            size="sm"
            onClick={() => onNavigate('/receipts')}
            icon={<Sparkles className="w-4 h-4 text-emerald-400" />}
          >
            Scan Struk AI
          </Button>
          <Button
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
            size="sm"
            onClick={onQuickAdd}
            icon={<Plus className="w-4 h-4" />}
          >
            + Catat Transaksi
          </Button>
        </div>
      </div>

      {/* Primary Summary Stat Cards (PRD Section 12) */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Saldo"
          value={formatCurrency(totalBalance)}
          description={`${accounts.length} rekening terhubung`}
          icon={<Wallet className="w-5 h-5" />}
          variant="default"
        />
        <StatCard
          title="Pemasukan Bulan Ini"
          value={formatCurrency(monthIncome)}
          trend={{ value: `${currentMonthTxs.filter((t) => t.type === 'income').length} transaksi`, isPositive: true }}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="emerald"
        />
        <StatCard
          title="Pengeluaran Bulan Ini"
          value={formatCurrency(monthExpense)}
          trend={{ value: `${currentMonthTxs.filter((t) => t.type === 'expense').length} transaksi`, isPositive: false }}
          icon={<TrendingDown className="w-5 h-5" />}
          variant="rose"
        />
        <StatCard
          title="Cashflow Bersih"
          value={formatCurrency(cashflow)}
          description={cashflow >= 0 ? 'Surplus / Arus Kas Positif' : 'Defisit Bulan Ini'}
          icon={<Scale className="w-5 h-5" />}
          variant={cashflow >= 0 ? 'emerald' : 'rose'}
        />
      </div>

      {/* Secondary Financial Health Metrics (Hutang, Piutang, Tabungan) */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div
          onClick={() => onNavigate('/debts')}
          className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-slate-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Hutang (Kewajiban)
            </span>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <HandCoins className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-slate-900">
            {formatCurrency(totalDebtRemaining)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {debts.filter((d) => d.status !== 'paid').length} hutang belum lunas &rarr;
          </p>
        </div>

        <div
          onClick={() => onNavigate('/receivables')}
          className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-slate-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Piutang (Hak Tagih)
            </span>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-slate-900">
            {formatCurrency(totalReceivableRemaining)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {receivables.filter((r) => r.status !== 'paid').length} piutang belum tertagih &rarr;
          </p>
        </div>

        <div
          onClick={() => onNavigate('/savings')}
          className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-slate-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Progress Tabungan
            </span>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-xl font-extrabold text-slate-900">
            {formatCurrency(totalSavingCurrent)}
          </p>
          <div className="mt-2">
            <ProgressBar value={savingProgress} color="emerald" size="sm" showLabel />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Visual Monthly Cashflow Trend Chart (Recharts) */}
        <MonthlyTrendChart transactions={transactions} className="lg:col-span-2" />

        {/* Expense Category Breakdown */}
        <Card>
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Kategori Pengeluaran</h3>
            <p className="text-xs text-slate-500">Distribusi pengeluaran bulan ini</p>
          </div>

          {categoryExpenses.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Belum ada data pengeluaran bulan ini
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryExpenses}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryExpenses.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => formatCurrency(Number(val))}
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Top 3 categories list */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {categoryExpenses.slice(0, 4).map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="font-medium text-slate-700 truncate max-w-[120px]">
                        {cat.name}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900">{formatCurrency(cat.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Accounts & Recent Transactions Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Accounts Overview */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Rekening & Dompet</h3>
            <button
              onClick={() => onNavigate('/accounts')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
            >
              Kelola &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shadow-xs">
                    {acc.type === 'Bank' ? '🏦' : acc.type === 'E-Wallet' ? '📱' : '💵'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">{acc.name}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{acc.type}</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-slate-900">
                  {formatCurrency(acc.current_balance)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Transaksi Terbaru</h3>
              <p className="text-xs text-slate-500">5 aktivitas keuangan terakhir Anda</p>
            </div>
            <button
              onClick={() => onNavigate('/transactions')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
            >
              Lihat Semua &rarr;
            </button>
          </div>

          {transactions.length === 0 ? (
            <EmptyState
              title="Belum ada transaksi"
              description="Catat pengeluaran atau pemasukan pertama Anda sekarang."
              actionText="+ Tambah Transaksi"
              onAction={onQuickAdd}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {transactions.slice(0, 5).map((tx) => {
                const isInc = tx.type === 'income';
                const isTrans = tx.type === 'transfer';

                return (
                  <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isInc
                            ? 'bg-emerald-50 text-emerald-600'
                            : isTrans
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {isInc ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : isTrans ? (
                          <ArrowLeftRight className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {tx.description}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{formatDate(tx.transaction_date)}</span>
                          <span>•</span>
                          <span className="capitalize">{tx.account?.name || 'Rekening'}</span>
                          {tx.source === 'receipt_ai' && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" /> AI
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p
                        className={`text-xs font-extrabold ${
                          isInc
                            ? 'text-emerald-600'
                            : isTrans
                            ? 'text-blue-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {isInc ? '+' : isTrans ? '' : '-'}
                        {formatCurrency(tx.amount)}
                      </p>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {tx.type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
