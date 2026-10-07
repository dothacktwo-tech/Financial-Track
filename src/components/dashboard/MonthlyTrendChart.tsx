import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart2,
  LineChart as LineChartIcon,
  Scale,
  Sparkles,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Transaction } from '../../types/database';
import { formatCurrency } from '../../lib/currency';

interface MonthlyTrendChartProps {
  transactions: Transaction[];
  className?: string;
}

type TimeframeOption = '6m' | '12m' | 'ytd';
type ChartStyleOption = 'area' | 'bar' | 'cashflow';

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({
  transactions,
  className = '',
}) => {
  const [timeframe, setTimeframe] = useState<TimeframeOption>('6m');
  const [chartStyle, setChartStyle] = useState<ChartStyleOption>('area');

  const now = new Date();

  // Aggregate monthly data based on selected timeframe
  const chartData = useMemo(() => {
    let monthsCount = 6;
    if (timeframe === '12m') monthsCount = 12;
    if (timeframe === 'ytd') monthsCount = now.getMonth() + 1; // Months passed in current year

    const data: Array<{
      name: string;
      fullDate: string;
      income: number;
      expense: number;
      cashflow: number;
      savingsRate: number;
    }> = [];

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${monthNum}`;

      const shortMonth = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(d);
      const yearSuffix = monthsCount > 6 ? ` '${String(year).slice(2)}` : '';
      const label = `${shortMonth}${yearSuffix}`;

      const monthTxs = transactions.filter((t) => t.transaction_date.startsWith(key));
      const income = monthTxs
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = monthTxs
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const cashflow = income - expense;
      const savingsRate = income > 0 ? Math.max(0, Math.round((cashflow / income) * 100)) : 0;

      data.push({
        name: label,
        fullDate: `${new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d)}`,
        income,
        expense,
        cashflow,
        savingsRate,
      });
    }

    return data;
  }, [transactions, timeframe]);

  // High-level statistics
  const stats = useMemo(() => {
    const totalIncome = chartData.reduce((acc, d) => acc + d.income, 0);
    const totalExpense = chartData.reduce((acc, d) => acc + d.expense, 0);
    const netCashflow = totalIncome - totalExpense;
    const avgIncome = chartData.length > 0 ? Math.round(totalIncome / chartData.length) : 0;
    const avgExpense = chartData.length > 0 ? Math.round(totalExpense / chartData.length) : 0;
    const avgSavingsRate = totalIncome > 0 ? Math.max(0, Math.round((netCashflow / totalIncome) * 100)) : 0;

    // Check recent momentum (last month vs previous month)
    let momentum = 0;
    if (chartData.length >= 2) {
      const last = chartData[chartData.length - 1].cashflow;
      const prev = chartData[chartData.length - 2].cashflow;
      momentum = last - prev;
    }

    return {
      totalIncome,
      totalExpense,
      netCashflow,
      avgIncome,
      avgExpense,
      avgSavingsRate,
      momentum,
    };
  }, [chartData]);

  // Indonesian currency tick formatter for Y-Axis
  const formatYAxisTick = (val: number) => {
    if (val === 0) return '0';
    const absVal = Math.abs(val);
    if (absVal >= 1_000_000) {
      const jt = val / 1_000_000;
      return `${Number.isInteger(jt) ? jt : jt.toFixed(1)}Jt`;
    }
    if (absVal >= 1_000) {
      return `${Math.round(val / 1_000)}Rb`;
    }
    return String(val);
  };

  // Custom Rich Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataItem = payload[0]?.payload;
    if (!dataItem) return null;

    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-xs min-w-[220px] text-xs">
        <p className="font-extrabold text-slate-900 border-b border-slate-100 pb-1.5 mb-2">
          {dataItem.fullDate}
        </p>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Pemasukan:
            </span>
            <strong className="text-emerald-600 font-extrabold">
              {formatCurrency(dataItem.income)}
            </strong>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              Pengeluaran:
            </span>
            <strong className="text-rose-600 font-extrabold">
              {formatCurrency(dataItem.expense)}
            </strong>
          </div>

          <div className="flex items-center justify-between gap-4 pt-1.5 border-t border-slate-100">
            <span className="flex items-center gap-1.5 text-slate-700 font-bold">
              <Scale className="w-3.5 h-3.5 text-slate-400" />
              Arus Kas Bersih:
            </span>
            <strong className={`font-extrabold ${dataItem.cashflow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {dataItem.cashflow >= 0 ? '+' : ''}
              {formatCurrency(dataItem.cashflow)}
            </strong>
          </div>

          <div className="flex items-center justify-between gap-4 text-[11px] text-slate-500 pt-1">
            <span>Rasio Simpanan:</span>
            <span className="font-bold text-slate-800">{dataItem.savingsRate}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={`p-5 sm:p-6 ${className}`}>
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <LineChartIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Tren Pemasukan & Pengeluaran Bulanan
              </h3>
              <p className="text-xs text-slate-500">
                Visualisasi dinamika arus kas masuk dan keluar secara berkala
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls: Chart Mode & Timeframe Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chart Type Toggle */}
          <div className="flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setChartStyle('area')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                chartStyle === 'area'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grafik Area Bergradien"
            >
              <LineChartIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Area</span>
            </button>
            <button
              type="button"
              onClick={() => setChartStyle('bar')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                chartStyle === 'bar'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grafik Batang Perbandingan"
            >
              <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Batang</span>
            </button>
            <button
              type="button"
              onClick={() => setChartStyle('cashflow')}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                chartStyle === 'cashflow'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Net Cashflow Bulanan"
            >
              <Scale className="w-3.5 h-3.5 text-amber-600" />
              <span>Cashflow</span>
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setTimeframe('6m')}
              className={`px-2 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                timeframe === '6m'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              6 Bln
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('12m')}
              className={`px-2 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                timeframe === '12m'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              12 Bln
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('ytd')}
              className={`px-2 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                timeframe === 'ytd'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              YTD
            </button>
          </div>
        </div>
      </div>

      {/* Mini Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">
            Rata-rata Pemasukan
          </span>
          <span className="text-sm font-extrabold text-emerald-700 block mt-0.5">
            {formatCurrency(stats.avgIncome)}
            <span className="text-[10px] text-emerald-600/80 font-normal"> /bln</span>
          </span>
        </div>

        <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-100">
          <span className="text-[10px] uppercase font-bold text-rose-800 block">
            Rata-rata Pengeluaran
          </span>
          <span className="text-sm font-extrabold text-rose-700 block mt-0.5">
            {formatCurrency(stats.avgExpense)}
            <span className="text-[10px] text-rose-600/80 font-normal"> /bln</span>
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <span className="text-[10px] uppercase font-bold text-slate-600 block">
            Surplus Kas Akumulatif
          </span>
          <span
            className={`text-sm font-extrabold block mt-0.5 ${
              stats.netCashflow >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {stats.netCashflow >= 0 ? '+' : ''}
            {formatCurrency(stats.netCashflow)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100">
          <span className="text-[10px] uppercase font-bold text-blue-800 block">
            Rasio Tabungan Rata-rata
          </span>
          <span className="text-sm font-extrabold text-blue-700 block mt-0.5">
            {stats.avgSavingsRate}%
            <span className="text-[10px] text-blue-600/80 font-normal"> dari pemasukan</span>
          </span>
        </div>
      </div>

      {/* Recharts Canvas */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartStyle === 'area' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradientIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradientExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                tickFormatter={formatYAxisTick}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 600 }}
              />
              <Area
                type="monotone"
                dataKey="income"
                name="Pemasukan"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#gradientIncome)"
              />
              <Area
                type="monotone"
                dataKey="expense"
                name="Pengeluaran"
                stroke="#f43f5e"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#gradientExpense)"
              />
            </AreaChart>
          ) : chartStyle === 'bar' ? (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                tickFormatter={formatYAxisTick}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 600 }}
              />
              <Bar dataKey="income" name="Pemasukan" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={36} />
              <Bar dataKey="expense" name="Pengeluaran" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                tickFormatter={formatYAxisTick}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 600 }}
              />
              <Bar
                dataKey="cashflow"
                name="Arus Kas Bersih"
                radius={[6, 6, 0, 0]}
                maxBarSize={44}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.cashflow >= 0 ? '#10b981' : '#f43f5e'}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Indicator */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1 text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            {stats.momentum >= 0
              ? 'Arus kas bulan terbaru meningkat dibanding bulan sebelumnya.'
              : 'Perhatian: Ada penurunan surplus pada bulan terbaru.'}
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          Data berbasis {transactions.length} mutasi pencatatan keuangan
        </span>
      </div>
    </Card>
  );
};
