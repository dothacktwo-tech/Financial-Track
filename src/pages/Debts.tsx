import React, { useState } from 'react';
import {
  HandCoins,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
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
import { Account, Debt } from '../types/database';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';

interface DebtsProps {
  debts: Debt[];
  accounts: Account[];
  onAddDebt: (debt: Omit<Debt, 'id' | 'remaining_amount' | 'status' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateDebt: (id: string, updates: Partial<Debt>) => Promise<void>;
  onDeleteDebt: (id: string) => Promise<void>;
  onPayDebt: (debtId: string, payload: any) => Promise<void>;
}

export const Debts: React.FC<DebtsProps> = ({
  debts,
  accounts,
  onAddDebt,
  onUpdateDebt,
  onDeleteDebt,
  onPayDebt,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [payingDebt, setPayingDebt] = useState<Debt | null>(null);
  const [deleteDebtId, setDeleteDebtId] = useState<string | null>(null);
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);

  // Form state
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [transactionDate, setTransactionDate] = useState(getTodayString());
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Pay form state
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payAccountId, setPayAccountId] = useState('');
  const [payDate, setPayDate] = useState(getTodayString());
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const totalDebt = debts.reduce((acc, d) => acc + Number(d.amount), 0);
  const remainingDebt = debts.reduce((acc, d) => acc + Number(d.remaining_amount), 0);
  const paidDebt = totalDebt - remainingDebt;

  const handleOpenAdd = () => {
    setEditingDebt(null);
    setPersonName('');
    setAmount(0);
    setTransactionDate(getTodayString());
    setDueDate('');
    setDescription('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (debt: Debt) => {
    setEditingDebt(debt);
    setPersonName(debt.person_name);
    setAmount(debt.amount);
    setTransactionDate(debt.transaction_date || getTodayString());
    setDueDate(debt.due_date || '');
    setDescription(debt.description || '');
    setNotes(debt.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim() || !amount || amount <= 0 || !user) {
      showToast('Harap isi data dengan lengkap', 'error');
      return;
    }

    setLoading(true);
    try {
      if (editingDebt) {
        await onUpdateDebt(editingDebt.id, {
          person_name: personName,
          amount,
          transaction_date: transactionDate,
          due_date: dueDate || undefined,
          description: description || undefined,
          notes: notes || undefined,
        });
        showToast('Data hutang diperbarui!', 'success');
      } else {
        await onAddDebt({
          user_id: user.id,
          person_name: personName,
          amount,
          transaction_date: transactionDate,
          due_date: dueDate || undefined,
          description: description || undefined,
          notes: notes || undefined,
        });
        showToast('Hutang baru berhasil dicatat!', 'success');
      }
      setIsModalOpen(false);
    } catch (e: any) {
      showToast(e.message || 'Gagal menyimpan hutang', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPay = (debt: Debt) => {
    setPayingDebt(debt);
    setPayAmount(debt.remaining_amount);
    setPayAccountId(accounts[0]?.id || '');
    setPayDate(getTodayString());
    setPayNotes(`Pembayaran hutang kepada ${debt.person_name}`);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebt || !payAmount || payAmount <= 0 || !user) {
      showToast('Nominal pembayaran tidak valid', 'error');
      return;
    }
    if (payAmount > payingDebt.remaining_amount) {
      showToast(`Nominal melebihi sisa hutang (${formatCurrency(payingDebt.remaining_amount)})`, 'error');
      return;
    }

    setPayLoading(true);
    try {
      await onPayDebt(payingDebt.id, {
        account_id: payAccountId || undefined,
        amount: payAmount,
        payment_date: payDate,
        notes: payNotes || undefined,
        user_id: user.id,
      });
      showToast('Pembayaran hutang berhasil dicatat!', 'success');
      setPayingDebt(null);
    } catch (e: any) {
      showToast(e.message || 'Gagal memproses pembayaran hutang', 'error');
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Catatan Hutang (Kewajiban)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Lacak pinjaman, cicilan, dan komitmen pembayaran kepada pihak lain
          </p>
        </div>
        <Button size="sm" onClick={handleOpenAdd} icon={<Plus className="w-4 h-4" />}>
          + Catat Hutang Baru
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Sisa Hutang
          </p>
          <p className="mt-2 text-2xl font-extrabold text-rose-600">
            {formatCurrency(remainingDebt)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {debts.filter((d) => d.status !== 'paid').length} pinjaman aktif
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Terbayar
          </p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">
            {formatCurrency(paidDebt)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {totalDebt > 0 ? ((paidDebt / totalDebt) * 100).toFixed(0) : 0}% terlunasi
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Komitmen Pinjaman
          </p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {formatCurrency(totalDebt)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Dari {debts.length} catatan hutang</p>
        </Card>
      </div>

      {/* Debt List */}
      <Card className="p-0 overflow-hidden">
        {debts.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak ada catatan hutang"
              description="Anda bebas hutang! Atau Anda dapat mencatat pinjaman baru bila diperlukan."
              actionText="+ Catat Hutang Baru"
              onAction={handleOpenAdd}
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {debts.map((debt) => {
              const isPaid = debt.status === 'paid';
              const isOverdue = debt.status === 'overdue';
              const percentPaid = debt.amount > 0 ? Math.min(100, ((debt.amount - debt.remaining_amount) / debt.amount) * 100) : 100;
              const isExpanded = expandedDebtId === debt.id;

              return (
                <div key={debt.id} className="p-4 sm:p-5 hover:bg-slate-50/50 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-600'
                            : isOverdue
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        <HandCoins className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-sm text-slate-900">
                            {debt.person_name}
                          </h3>
                          <Badge
                            variant={isPaid ? 'emerald' : isOverdue ? 'rose' : 'amber'}
                            size="sm"
                          >
                            {isPaid
                              ? 'Lunas'
                              : isOverdue
                              ? 'Terlambat'
                              : debt.status === 'partial'
                              ? 'Sebagian'
                              : 'Belum Lunas'}
                          </Badge>
                        </div>
                        {debt.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{debt.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                          <span>Dibuat: {formatDate(debt.transaction_date)}</span>
                          {debt.due_date && (
                            <>
                              <span>•</span>
                              <span
                                className={`flex items-center gap-1 ${
                                  isOverdue ? 'text-rose-600 font-bold' : ''
                                }`}
                              >
                                <Calendar className="w-3 h-3" /> Jatuh Tempo:{' '}
                                {formatDate(debt.due_date)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Numbers & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Sisa Hutang
                        </span>
                        <span
                          className={`text-base font-extrabold ${
                            isPaid ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {formatCurrency(debt.remaining_amount)}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          dari {formatCurrency(debt.amount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isPaid && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenPay(debt)}
                            icon={<CreditCard className="w-3.5 h-3.5" />}
                          >
                            Bayar
                          </Button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(debt)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteDebtId(debt.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setExpandedDebtId(isExpanded ? null : debt.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                          title="Riwayat"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <ProgressBar
                      value={percentPaid}
                      color={isPaid ? 'emerald' : 'amber'}
                      size="sm"
                    />
                  </div>

                  {/* Payment history dropdown */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                      <span className="font-bold text-slate-700 block">
                        Riwayat Pembayaran Hutang ({debt.payments?.length || 0})
                      </span>
                      {(!debt.payments || debt.payments.length === 0) ? (
                        <p className="text-slate-400 text-[11px]">Belum ada riwayat pembayaran.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 rounded-xl bg-slate-50 p-2">
                          {debt.payments.map((p) => (
                            <div key={p.id} className="py-2 flex items-center justify-between">
                              <div>
                                <span className="font-semibold text-slate-800">
                                  {formatCurrency(p.amount)}
                                </span>
                                <span className="text-[10px] text-slate-400 ml-2">
                                  {formatDate(p.payment_date)} • via {p.account?.name || 'Kas'}
                                </span>
                                {p.notes && (
                                  <p className="text-[10px] text-slate-500 mt-0.5">{p.notes}</p>
                                )}
                              </div>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal Add/Edit Debt */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDebt ? 'Edit Data Hutang' : 'Catat Hutang Baru'}
        description="Dokumentasikan kewajiban finansial kepada pihak lain"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nama Pihak / Kreditur"
            placeholder="Misal: Bank Mandiri, Pak Hendra, Teman Kantor"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            required
          />

          <CurrencyInput
            label="Nominal Hutang"
            value={amount}
            onChange={setAmount}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="date"
              label="Tanggal Pinjam"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              required
            />
            <Input
              type="date"
              label="Jatuh Tempo (Opsional)"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <Input
            label="Keterangan / Tujuan Pinjaman"
            placeholder="Misal: Cicilan laptop, pinjaman darurat"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Textarea
            label="Catatan Tambahan (Opsional)"
            placeholder="Catatan nomor rekening, bunga, dll..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={loading}>
              {editingDebt ? 'Simpan Perubahan' : 'Catat Hutang'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Bayar Hutang */}
      <Modal
        isOpen={Boolean(payingDebt)}
        onClose={() => setPayingDebt(null)}
        title={`Bayar Hutang: ${payingDebt?.person_name}`}
        description={`Sisa hutang saat ini: ${formatCurrency(payingDebt?.remaining_amount)}`}
      >
        <form onSubmit={handlePaySubmit} className="space-y-4">
          <CurrencyInput
            label="Nominal Pembayaran"
            value={payAmount}
            onChange={setPayAmount}
            required
            helperText={`Maksimal pembayaran: ${formatCurrency(payingDebt?.remaining_amount)}`}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Dibayar dari Rekening"
              value={payAccountId}
              onChange={(e) => setPayAccountId(e.target.value)}
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
              label="Tanggal Pembayaran"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="Catatan Pembayaran"
            placeholder="Misal: Cicilan ke-2 transfer BCA"
            value={payNotes}
            onChange={(e) => setPayNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setPayingDebt(null)}>
              Batal
            </Button>
            <Button type="submit" loading={payLoading}>
              Konfirmasi Pembayaran
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteDebtId)}
        onClose={() => setDeleteDebtId(null)}
        onConfirm={async () => {
          if (deleteDebtId) {
            await onDeleteDebt(deleteDebtId);
            setDeleteDebtId(null);
            showToast('Catatan hutang berhasil dihapus.', 'success');
          }
        }}
        title="Hapus Catatan Hutang?"
        description="Data hutang dan riwayat pembayarannya akan dihapus secara permanen."
      />
    </div>
  );
};
