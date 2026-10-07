import React, { useState, useMemo } from 'react';
import {
  PiggyBank,
  Plus,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Target,
  Sparkles,
  Clock,
  Calculator,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { ProgressBar } from '../components/ui/ProgressBar';
import { formatCurrency } from '../lib/currency';
import { formatDate, getTodayString } from '../lib/date';
import { Account, SavingGoal } from '../types/database';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';

interface SavingsGoalsProps {
  savingGoals: SavingGoal[];
  accounts: Account[];
  onAddGoal: (goal: Omit<SavingGoal, 'id' | 'current_amount' | 'status' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateGoal: (id: string, updates: Partial<SavingGoal>) => Promise<void>;
  onDeleteGoal: (id: string) => Promise<void>;
  onContribute: (goalId: string, payload: any) => Promise<void>;
}

export const SavingsGoals: React.FC<SavingsGoalsProps> = ({
  savingGoals,
  accounts,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onContribute,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingGoal | null>(null);
  const [contributeGoal, setContributeGoal] = useState<SavingGoal | null>(null);
  const [historyGoal, setHistoryGoal] = useState<SavingGoal | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);

  // Goal form state
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState<number>(0);
  const [targetDate, setTargetDate] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Contribution state
  const [contribType, setContribType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [contribAmount, setContribAmount] = useState<number>(0);
  const [contribAccountId, setContribAccountId] = useState('');
  const [contribDate, setContribDate] = useState(getTodayString());
  const [contribNotes, setContribNotes] = useState('');
  const [contribLoading, setContribLoading] = useState(false);

  const totalTarget = savingGoals.reduce((acc, g) => acc + Number(g.target_amount || 0), 0);
  const totalSaved = savingGoals.reduce((acc, g) => acc + Number(g.current_amount || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  // Precise savings recommendation calculation per calendar schedule
  const getGoalPlan = (goal: SavingGoal) => {
    const sisa = Math.max(0, Number(goal.target_amount || 0) - Number(goal.current_amount || 0));
    if (sisa <= 0) {
      return { status: 'completed', label: 'Target Tercapai!', color: 'emerald', detail: 'Tujuan tabungan telah terpenuhi 100%' };
    }
    if (!goal.target_date) {
      return { status: 'no_date', label: 'Tanpa Tenggat Waktu', color: 'slate', detail: 'Atur tanggal target untuk kalkulasi otomatis' };
    }

    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const [tY, tM, tD] = goal.target_date.split('-').map(Number);
    const targetDate = new Date(tY, tM - 1, tD);
    const diffDays = Math.round((targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: 'expired',
        label: 'Tenggat Terlewati',
        color: 'rose',
        detail: `Lewat ${Math.abs(diffDays)} hari dari target jadwal`,
      };
    }

    if (diffDays === 0) {
      return {
        status: 'due_today',
        label: 'Jatuh Tempo Hari Ini!',
        color: 'amber',
        detail: `Batas akhir tercapai • Sisa perlu disetor: ${formatCurrency(sisa)}`,
      };
    }

    // Precise time intervals
    const exactMonths = diffDays / 30.4375;
    const diffMonths = Math.max(1, Math.round(exactMonths));
    const diffWeeks = Math.max(1, Math.ceil(diffDays / 7));

    const monthlyNeeded = Math.ceil(sisa / Math.max(1, exactMonths));
    const weeklyNeeded = Math.ceil(sisa / diffWeeks);
    const dailyNeeded = Math.ceil(sisa / diffDays);

    let label = `Saran: ${formatCurrency(monthlyNeeded)}/bln`;
    let detail = `${diffDays} hari tersisa (~${diffMonths} bln)`;

    // If within 30 days, prioritize weekly/daily guidance
    if (diffDays <= 30) {
      label = `Saran: ${formatCurrency(weeklyNeeded)}/minggu`;
      detail = `${diffDays} hari tersisa (~${diffWeeks} mgg) • ${formatCurrency(dailyNeeded)}/hari`;
    }

    return {
      status: 'active',
      label,
      color: 'blue',
      detail,
      monthlyNeeded,
      weeklyNeeded,
      dailyNeeded,
      monthsLeft: diffMonths,
      diffDays,
    };
  };

  // Live real-time goal calculation inside the Add/Edit Modal
  const liveGoalCalc = useMemo(() => {
    if (!targetAmount || targetAmount <= 0) return null;
    const currentVal = editingGoal ? Number(editingGoal.current_amount || 0) : 0;
    const sisa = Math.max(0, targetAmount - currentVal);

    if (!targetDate) {
      return { hasDate: false, sisa };
    }

    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const [tY, tM, tD] = targetDate.split('-').map(Number);
    const targetDateObj = new Date(tY, tM - 1, tD);
    const diffDays = Math.round((targetDateObj.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { hasDate: true, isPast: true, diffDays: Math.abs(diffDays), sisa };
    }

    if (diffDays === 0) {
      return { hasDate: true, isToday: true, diffDays: 0, sisa };
    }

    const exactMonths = diffDays / 30.4375;
    const monthsLeft = Math.max(1, Math.round(exactMonths));
    const weeksLeft = Math.max(1, Math.ceil(diffDays / 7));

    const monthlyNeeded = Math.ceil(sisa / Math.max(1, exactMonths));
    const weeklyNeeded = Math.ceil(sisa / weeksLeft);
    const dailyNeeded = Math.ceil(sisa / diffDays);

    return {
      hasDate: true,
      isPast: false,
      diffDays,
      monthsLeft,
      weeksLeft,
      monthlyNeeded,
      weeklyNeeded,
      dailyNeeded,
      sisa,
    };
  }, [targetAmount, targetDate, editingGoal]);

  // Live balance simulation inside the Setor / Tarik Modal
  const liveContribProjection = useMemo(() => {
    if (!contributeGoal) return null;
    const current = Number(contributeGoal.current_amount || 0);
    const target = Number(contributeGoal.target_amount || 0);
    const amt = Number(contribAmount || 0);

    const newAmount = contribType === 'deposit'
      ? current + amt
      : Math.max(0, current - amt);

    const newPercent = target > 0 ? (newAmount / target) * 100 : 0;
    const newRemaining = Math.max(0, target - newAmount);
    const isCompleted = target > 0 && newAmount >= target;

    return {
      current,
      newAmount,
      newPercent: Math.min(100, newPercent),
      rawPercent: newPercent,
      newRemaining,
      isCompleted,
    };
  }, [contributeGoal, contribAmount, contribType]);

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setName('');
    setTargetAmount(0);
    setTargetDate('');
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (goal: SavingGoal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setTargetAmount(goal.target_amount);
    setTargetDate(goal.target_date || '');
    setDescription(goal.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetAmount || targetAmount <= 0 || !user) {
      showToast('Lengkapi data target tabungan', 'error');
      return;
    }

    setLoading(true);
    try {
      if (editingGoal) {
        await onUpdateGoal(editingGoal.id, {
          name,
          target_amount: targetAmount,
          target_date: targetDate || undefined,
          description: description || undefined,
        });
        showToast('Target tabungan berhasil diperbarui!', 'success');
      } else {
        await onAddGoal({
          user_id: user.id,
          name,
          target_amount: targetAmount,
          target_date: targetDate || undefined,
          description: description || undefined,
        });
        showToast('Target tabungan baru berhasil dibuat!', 'success');
      }
      setIsModalOpen(false);
    } catch (e: any) {
      showToast(e.message || 'Gagal menyimpan target tabungan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenContribute = (goal: SavingGoal) => {
    setContributeGoal(goal);
    setContribType('deposit');
    setContribAmount(0);
    setContribAccountId(accounts[0]?.id || '');
    setContribDate(getTodayString());
    setContribNotes(`Setoran tabungan: ${goal.name}`);
  };

  const handleContributeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoal || !contribAmount || contribAmount <= 0 || !user) {
      showToast('Nominal setoran/tarikan tidak valid', 'error');
      return;
    }

    if (contribType === 'withdrawal' && contribAmount > (contributeGoal.current_amount || 0)) {
      showToast(`Nominal penarikan melebihi saldo tabungan saat ini (${formatCurrency(contributeGoal.current_amount)})`, 'error');
      return;
    }

    setContribLoading(true);
    try {
      await onContribute(contributeGoal.id, {
        account_id: contribAccountId || undefined,
        amount: contribAmount,
        type: contribType,
        transaction_date: contribDate,
        notes: contribNotes || undefined,
        user_id: user.id,
      });

      showToast(
        contribType === 'deposit'
          ? 'Setoran tabungan berhasil ditambahkan!'
          : 'Penarikan dana tabungan berhasil dicatat!',
        'success'
      );
      setContributeGoal(null);
    } catch (e: any) {
      showToast(e.message || 'Gagal mencatat mutasi tabungan', 'error');
    } finally {
      setContribLoading(false);
    }
  };

  const selectedContribAccount = accounts.find((a) => a.id === contribAccountId);
  const isAccountBalanceLow = contribType === 'deposit' && selectedContribAccount && contribAmount > (selectedContribAccount.current_balance || 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Target Tabungan (Saving Goals)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Wujudkan impian finansial Anda dengan menabung secara konsisten dan terencana
          </p>
        </div>
        <Button size="sm" onClick={handleOpenAdd} icon={<Plus className="w-4 h-4" />}>
          + Buat Target Baru
        </Button>
      </div>

      {/* Summary Banner */}
      <div className="rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-emerald-950 p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
              Akumulasi Tabungan
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {formatCurrency(totalSaved)}
              </span>
              <span className="text-xs text-slate-400">
                dari total target {formatCurrency(totalTarget)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-300">
              {savingGoals.filter((g) => g.status === 'completed').length} target telah tercapai dari {savingGoals.length} rencana
            </p>
          </div>

          <div className="sm:w-64 bg-white/10 rounded-xl p-3 border border-white/10">
            <div className="flex justify-between text-xs mb-1.5 font-bold">
              <span className="text-slate-300">Total Progres</span>
              <span className="text-emerald-400">{overallProgress.toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, overallProgress)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Saving Goals Grid */}
      {savingGoals.length === 0 ? (
        <Card className="p-8">
          <EmptyState
            title="Belum ada target tabungan"
            description="Buat target pertama Anda, misalnya Dana Darurat, Liburan Jepang, atau Beli Kendaraan."
            actionText="+ Buat Target Baru"
            onAction={handleOpenAdd}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {savingGoals.map((goal) => {
            const isCompleted = goal.status === 'completed' || Number(goal.current_amount || 0) >= Number(goal.target_amount || 0);
            const rawPercent = goal.target_amount > 0 ? (Number(goal.current_amount || 0) / Number(goal.target_amount)) * 100 : 0;
            const percent = Math.min(100, Math.max(0, rawPercent));
            const sisa = Math.max(0, Number(goal.target_amount || 0) - Number(goal.current_amount || 0));
            const plan = getGoalPlan(goal);

            return (
              <Card
                key={goal.id}
                className="flex flex-col justify-between hover:shadow-md transition relative group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-6 h-6" />
                        ) : (
                          <PiggyBank className="w-6 h-6" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm text-slate-900 leading-tight truncate">
                          {goal.name}
                        </h3>
                        <Badge variant={isCompleted ? 'emerald' : 'blue'} size="sm" className="mt-1">
                          {isCompleted ? 'Target Tercapai!' : `${rawPercent.toFixed(1)}% Terkumpul`}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleOpenEdit(goal)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteGoalId(goal.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {goal.description && (
                    <p className="mt-3 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {goal.description}
                    </p>
                  )}

                  {/* Amounts & Progress */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-xl font-extrabold text-slate-900">
                        {formatCurrency(goal.current_amount)}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        dari {formatCurrency(goal.target_amount)}
                      </span>
                    </div>

                    <ProgressBar
                      value={percent}
                      color={isCompleted ? 'emerald' : 'emerald'}
                      size="md"
                    />

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Sisa: <strong className="text-slate-700">{formatCurrency(sisa)}</strong></span>
                      {goal.target_date && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3 h-3" /> {formatDate(goal.target_date)}
                        </span>
                      )}
                    </div>

                    {/* Monthly plan box */}
                    {plan.status === 'active' && (
                      <div className="mt-2.5 p-2 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-[11px]">
                        <span className="text-blue-900 font-bold">{plan.label}</span>
                        <span className="text-blue-600">{plan.detail}</span>
                      </div>
                    )}
                    {plan.status === 'expired' && (
                      <div className="mt-2.5 p-2 rounded-xl bg-rose-50/80 border border-rose-200 flex items-center justify-between text-[11px]">
                        <span className="text-rose-900 font-bold">{plan.label}</span>
                        <span className="text-rose-600">{plan.detail}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenContribute(goal)}
                    icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
                  >
                    Setor / Tarik
                  </Button>
                  {goal.transactions && goal.transactions.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setHistoryGoal(goal)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      Riwayat ({goal.transactions.length})
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Add/Edit Goal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGoal ? 'Edit Target Tabungan' : 'Buat Target Tabungan Baru'}
        description="Tentukan jumlah nominal dan batas waktu impian finansial Anda"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nama Target"
            placeholder="Misal: Liburan Jepang, Beli Laptop M3, Dana Darurat"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <CurrencyInput
            label="Target Nominal"
            value={targetAmount}
            onChange={setTargetAmount}
            required
          />

          <Input
            type="date"
            label="Target Tanggal (Opsional)"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            helperText="Diperlukan untuk menghitung rekomendasi tabungan bulanan otomatis"
          />

          {/* Live Calculation Preview Card */}
          {liveGoalCalc && liveGoalCalc.hasDate && !liveGoalCalc.isPast && !liveGoalCalc.isToday && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-blue-900">
                <Calculator className="w-4 h-4 text-blue-600" />
                <span>Simulasi Kalkulasi Tabungan:</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-white/80 rounded-lg p-2 border border-blue-100">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Per Bulan</span>
                  <strong className="text-emerald-700 text-xs block mt-0.5">
                    {formatCurrency(liveGoalCalc.monthlyNeeded || 0)}
                  </strong>
                </div>
                <div className="bg-white/80 rounded-lg p-2 border border-blue-100">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Per Minggu</span>
                  <strong className="text-blue-700 text-xs block mt-0.5">
                    {formatCurrency(liveGoalCalc.weeklyNeeded || 0)}
                  </strong>
                </div>
                <div className="bg-white/80 rounded-lg p-2 border border-blue-100">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Per Hari</span>
                  <strong className="text-slate-800 text-xs block mt-0.5">
                    {formatCurrency(liveGoalCalc.dailyNeeded || 0)}
                  </strong>
                </div>
              </div>
              <p className="text-[11px] text-blue-700 text-center pt-0.5">
                Target dalam <strong>{liveGoalCalc.diffDays} hari</strong> (~{liveGoalCalc.monthsLeft} bulan / {liveGoalCalc.weeksLeft} minggu).
              </p>
            </div>
          )}

          {liveGoalCalc && liveGoalCalc.hasDate && liveGoalCalc.isPast && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800">
              ⚠️ <strong>Perhatian:</strong> Tanggal target sudah lewat ({liveGoalCalc.diffDays} hari yang lalu). Silakan pilih tanggal di masa depan.
            </div>
          )}

          <Textarea
            label="Deskripsi / Catatan Rencana"
            placeholder="Rincian pos tabungan atau strategi menabung..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={loading}>
              {editingGoal ? 'Simpan Perubahan' : 'Buat Target'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Setor / Tarik Tabungan */}
      {contributeGoal && (
        <Modal
          isOpen={Boolean(contributeGoal)}
          onClose={() => setContributeGoal(null)}
          title={`Mutasi Tabungan: ${contributeGoal.name}`}
          description={`Terkumpul saat ini: ${formatCurrency(contributeGoal.current_amount)} dari target ${formatCurrency(contributeGoal.target_amount)}`}
        >
          <form onSubmit={handleContributeSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setContribType('deposit')}
                className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  contribType === 'deposit'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Setor Dana</span>
              </button>
              <button
                type="button"
                onClick={() => setContribType('withdrawal')}
                className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  contribType === 'withdrawal'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Tarik Dana</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <CurrencyInput
                label={contribType === 'deposit' ? 'Nominal Setoran' : 'Nominal Penarikan'}
                value={contribAmount}
                onChange={setContribAmount}
                required
              />

              {/* Quick shortcut buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 mr-1 font-semibold">Cepat:</span>
                {[100000, 500000, 1000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setContribAmount((prev) => prev + amt)}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition cursor-pointer"
                  >
                    +{formatCurrency(amt)}
                  </button>
                ))}
                {contribType === 'deposit' && (
                  <button
                    type="button"
                    onClick={() => setContribAmount(Math.max(0, Number(contributeGoal.target_amount) - Number(contributeGoal.current_amount)))}
                    className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold transition cursor-pointer"
                  >
                    Genapkan Sisa ({formatCurrency(Math.max(0, Number(contributeGoal.target_amount) - Number(contributeGoal.current_amount)))})
                  </button>
                )}
              </div>
            </div>

            {/* Live Projected Savings Balance */}
            {liveContribProjection && contribAmount > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Saldo Tabungan Setelah Transaksi:</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {formatCurrency(liveContribProjection.newAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Progres Impian:</span>
                  <span className="font-bold text-emerald-700">
                    {liveContribProjection.newPercent.toFixed(1)}% ({formatCurrency(liveContribProjection.newAmount)} / {formatCurrency(contributeGoal.target_amount)})
                  </span>
                </div>
                <ProgressBar
                  value={liveContribProjection.newPercent}
                  color={liveContribProjection.isCompleted ? 'emerald' : 'emerald'}
                  size="sm"
                />
                {liveContribProjection.isCompleted && (
                  <p className="text-[11px] font-bold text-emerald-700 pt-1 text-center">
                    🎉 Luar biasa! Transaksi ini akan memenuhi target tabungan Anda 100%!
                  </p>
                )}
              </div>
            )}

            {/* Validation warning alerts */}
            {isAccountBalanceLow && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                <strong>Perhatian:</strong> Saldo rekening terpilih ({formatCurrency(selectedContribAccount?.current_balance)}) lebih kecil dari nominal setoran yang dimasukkan ({formatCurrency(contribAmount)}).
              </div>
            )}

            {contribType === 'withdrawal' && contribAmount > Number(contributeGoal.current_amount || 0) && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                <strong>Error:</strong> Nominal penarikan melebihi saldo tabungan saat ini ({formatCurrency(contributeGoal.current_amount)}).
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label={contribType === 'deposit' ? 'Sumber Rekening' : 'Tujuan Rekening'}
                value={contribAccountId}
                onChange={(e) => setContribAccountId(e.target.value)}
                required
              >
                <option value="">Pilih Rekening</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.current_balance)})
                  </option>
                ))}
              </Select>

              <Input
                type="date"
                label="Tanggal Transaksi"
                value={contribDate}
                onChange={(e) => setContribDate(e.target.value)}
                required
              />
            </div>

            <Input
              label="Catatan Mutasi"
              placeholder="Misal: Sisihan gaji bulanan..."
              value={contribNotes}
              onChange={(e) => setContribNotes(e.target.value)}
            />

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setContributeGoal(null)}>
                Batal
              </Button>
              <Button
                type="submit"
                loading={contribLoading}
                disabled={contribType === 'withdrawal' && contribAmount > Number(contributeGoal.current_amount || 0)}
              >
                {contribType === 'deposit' ? 'Konfirmasi Setoran' : 'Konfirmasi Penarikan'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Riwayat Mutasi Tabungan */}
      {historyGoal && (
        <Modal
          isOpen={Boolean(historyGoal)}
          onClose={() => setHistoryGoal(null)}
          title={`Riwayat Mutasi: ${historyGoal.name}`}
          description={`Total dana tersimpan: ${formatCurrency(historyGoal.current_amount)}`}
        >
          <div className="space-y-3">
            {(!historyGoal.transactions || historyGoal.transactions.length === 0) ? (
              <p className="text-center py-6 text-xs text-slate-400">Belum ada riwayat mutasi untuk target ini.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {historyGoal.transactions.map((t) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${t.type === 'deposit' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {t.type === 'deposit' ? 'Setoran' : 'Penarikan'}
                        </span>
                        <span className="font-semibold text-slate-800">{formatDate(t.transaction_date)}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {t.account?.name ? `Rekening: ${t.account.name}` : ''} {t.notes ? `• ${t.notes}` : ''}
                      </p>
                    </div>
                    <span className={`font-extrabold ${t.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'deposit' ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={() => setHistoryGoal(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteGoalId)}
        onClose={() => setDeleteGoalId(null)}
        onConfirm={async () => {
          if (deleteGoalId) {
            await onDeleteGoal(deleteGoalId);
            setDeleteGoalId(null);
            showToast('Target tabungan berhasil dihapus.', 'success');
          }
        }}
        title="Hapus Target Tabungan?"
        description="Target ini dan seluruh catatan mutasinya akan dihapus."
      />
    </div>
  );
};
