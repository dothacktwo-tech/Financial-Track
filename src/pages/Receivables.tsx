import React, { useState } from 'react';
import {
  Coins,
  Plus,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Receipt,
  Download,
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
import { Account, Receivable } from '../types/database';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';

interface ReceivablesProps {
  receivables: Receivable[];
  accounts: Account[];
  onAddReceivable: (rec: Omit<Receivable, 'id' | 'remaining_amount' | 'status' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateReceivable: (id: string, updates: Partial<Receivable>) => Promise<void>;
  onDeleteReceivable: (id: string) => Promise<void>;
  onPayReceivable: (recId: string, payload: any) => Promise<void>;
}

export const Receivables: React.FC<ReceivablesProps> = ({
  receivables,
  accounts,
  onAddReceivable,
  onUpdateReceivable,
  onDeleteReceivable,
  onPayReceivable,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<Receivable | null>(null);
  const [payingRec, setPayingRec] = useState<Receivable | null>(null);
  const [deleteRecId, setDeleteRecId] = useState<string | null>(null);
  const [expandedRecId, setExpandedRecId] = useState<string | null>(null);

  // Form state
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [transactionDate, setTransactionDate] = useState(getTodayString());
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Payment reception state
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payAccountId, setPayAccountId] = useState('');
  const [payDate, setPayDate] = useState(getTodayString());
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const totalReceivable = receivables.reduce((acc, r) => acc + Number(r.amount), 0);
  const remainingReceivable = receivables.reduce((acc, r) => acc + Number(r.remaining_amount), 0);
  const collectedReceivable = totalReceivable - remainingReceivable;

  const handleOpenAdd = () => {
    setEditingRec(null);
    setPersonName('');
    setAmount(0);
    setTransactionDate(getTodayString());
    setDueDate('');
    setDescription('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: Receivable) => {
    setEditingRec(rec);
    setPersonName(rec.person_name);
    setAmount(rec.amount);
    setTransactionDate(rec.transaction_date || getTodayString());
    setDueDate(rec.due_date || '');
    setDescription(rec.description || '');
    setNotes(rec.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim() || !amount || amount <= 0 || !user) {
      showToast('Harap lengkapi formulir dengan benar', 'error');
      return;
    }

    setLoading(true);
    try {
      if (editingRec) {
        await onUpdateReceivable(editingRec.id, {
          person_name: personName,
          amount,
          transaction_date: transactionDate,
          due_date: dueDate || undefined,
          description: description || undefined,
          notes: notes || undefined,
        });
        showToast('Data piutang diperbarui!', 'success');
      } else {
        await onAddReceivable({
          user_id: user.id,
          person_name: personName,
          amount,
          transaction_date: transactionDate,
          due_date: dueDate || undefined,
          description: description || undefined,
          notes: notes || undefined,
        });
        showToast('Piutang baru berhasil dicatat!', 'success');
      }
      setIsModalOpen(false);
    } catch (e: any) {
      showToast(e.message || 'Gagal menyimpan piutang', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPay = (rec: Receivable) => {
    setPayingRec(rec);
    setPayAmount(rec.remaining_amount);
    setPayAccountId(accounts[0]?.id || '');
    setPayDate(getTodayString());
    setPayNotes(`Penerimaan piutang dari ${rec.person_name}`);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingRec || !payAmount || payAmount <= 0 || !user) {
      showToast('Nominal pembayaran tidak valid', 'error');
      return;
    }
    if (payAmount > payingRec.remaining_amount) {
      showToast(`Nominal melebihi sisa piutang (${formatCurrency(payingRec.remaining_amount)})`, 'error');
      return;
    }

    setPayLoading(true);
    try {
      await onPayReceivable(payingRec.id, {
        account_id: payAccountId || undefined,
        amount: payAmount,
        payment_date: payDate,
        notes: payNotes || undefined,
        user_id: user.id,
      });
      showToast('Penerimaan dana piutang berhasil dicatat!', 'success');
      setPayingRec(null);
    } catch (e: any) {
      showToast(e.message || 'Gagal memproses piutang', 'error');
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
            Catatan Piutang (Hak Tagih)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Pantau uang yang dipinjam pihak lain dan tagihan yang belum tertagih
          </p>
        </div>
        <Button size="sm" onClick={handleOpenAdd} icon={<Plus className="w-4 h-4" />}>
          + Catat Piutang Baru
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Sisa Piutang
          </p>
          <p className="mt-2 text-2xl font-extrabold text-blue-600">
            {formatCurrency(remainingReceivable)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {receivables.filter((r) => r.status !== 'paid').length} tagihan belum lunas
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Sudah Diterima Kembali
          </p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">
            {formatCurrency(collectedReceivable)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {totalReceivable > 0 ? ((collectedReceivable / totalReceivable) * 100).toFixed(0) : 0}% telah kembali
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Piutang Tercatat
          </p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {formatCurrency(totalReceivable)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Dari {receivables.length} pihak peminjam</p>
        </Card>
      </div>

      {/* Receivables List */}
      <Card className="p-0 overflow-hidden">
        {receivables.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak ada catatan piutang"
              description="Belum ada orang yang meminjam dana atau piutang yang perlu Anda tagih."
              actionText="+ Catat Piutang Baru"
              onAction={handleOpenAdd}
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {receivables.map((rec) => {
              const isPaid = rec.status === 'paid';
              const isOverdue = rec.status === 'overdue';
              const percentPaid = rec.amount > 0 ? Math.min(100, ((rec.amount - rec.remaining_amount) / rec.amount) * 100) : 100;
              const isExpanded = expandedRecId === rec.id;

              return (
                <div key={rec.id} className="p-4 sm:p-5 hover:bg-slate-50/50 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-600'
                            : isOverdue
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        <Coins className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-sm text-slate-900">
                            {rec.person_name}
                          </h3>
                          <Badge
                            variant={isPaid ? 'emerald' : isOverdue ? 'rose' : 'blue'}
                            size="sm"
                          >
                            {isPaid
                              ? 'Lunas'
                              : isOverdue
                              ? 'Terlambat'
                              : rec.status === 'partial'
                              ? 'Sebagian'
                              : 'Belum Dibayar'}
                          </Badge>
                        </div>
                        {rec.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{rec.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 flex-wrap">
                          <span>Tanggal: {formatDate(rec.transaction_date)}</span>
                          {rec.due_date && (
                            <>
                              <span>•</span>
                              <span
                                className={`flex items-center gap-1 ${
                                  isOverdue ? 'text-rose-600 font-bold' : ''
                                }`}
                              >
                                <Calendar className="w-3 h-3" /> Jatuh Tempo:{' '}
                                {formatDate(rec.due_date)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right numbers and actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Sisa Tagihan
                        </span>
                        <span
                          className={`text-base font-extrabold ${
                            isPaid ? 'text-emerald-600' : 'text-blue-600'
                          }`}
                        >
                          {formatCurrency(rec.remaining_amount)}
                        </span>
                        <span className="text-[11px] text-slate-400 block">
                          dari {formatCurrency(rec.amount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {!isPaid && (
                          <Button
                            size="sm"
                            onClick={() => handleOpenPay(rec)}
                            icon={<Download className="w-3.5 h-3.5" />}
                          >
                            Terima Dana
                          </Button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(rec)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteRecId(rec.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setExpandedRecId(isExpanded ? null : rec.id)}
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
                      color={isPaid ? 'emerald' : 'blue'}
                      size="sm"
                    />
                  </div>

                  {/* Payment history dropdown */}
                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                      <span className="font-bold text-slate-700 block">
                        Riwayat Pelunasan ({rec.payments?.length || 0})
                      </span>
                      {(!rec.payments || rec.payments.length === 0) ? (
                        <p className="text-slate-400 text-[11px]">Belum ada riwayat pembayaran.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 rounded-xl bg-slate-50 p-2">
                          {rec.payments.map((p) => (
                            <div key={p.id} className="py-2 flex items-center justify-between">
                              <div>
                                <span className="font-semibold text-slate-800">
                                  {formatCurrency(p.amount)}
                                </span>
                                <span className="text-[10px] text-slate-400 ml-2">
                                  {formatDate(p.payment_date)} • masuk ke {p.account?.name || 'Kas'}
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

      {/* Modal Add/Edit Receivable */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRec ? 'Edit Data Piutang' : 'Catat Piutang Baru'}
        description="Dokumentasikan pinjaman atau hak tagih dana kepada pihak lain"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nama Peminjam / Debitur"
            placeholder="Misal: Rudi Pratama, Siti Aminah, Klien Proyek"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            required
          />

          <CurrencyInput
            label="Nominal Piutang"
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
            label="Keterangan Pinjaman"
            placeholder="Misal: Talangan tiket konser, modal kue"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Textarea
            label="Catatan Tambahan (Opsional)"
            placeholder="Nomor kontak, perjanjian pengembalian..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={loading}>
              {editingRec ? 'Simpan Perubahan' : 'Catat Piutang'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Terima Pembayaran Piutang */}
      <Modal
        isOpen={Boolean(payingRec)}
        onClose={() => setPayingRec(null)}
        title={`Terima Dana: ${payingRec?.person_name}`}
        description={`Sisa tagihan piutang: ${formatCurrency(payingRec?.remaining_amount)}`}
      >
        <form onSubmit={handlePaySubmit} className="space-y-4">
          <CurrencyInput
            label="Nominal Diterima"
            value={payAmount}
            onChange={setPayAmount}
            required
            helperText={`Maksimal tagihan: ${formatCurrency(payingRec?.remaining_amount)}`}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Masuk ke Rekening"
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
              label="Tanggal Diterima"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              required
            />
          </div>

          <Input
            label="Catatan Penerimaan"
            placeholder="Misal: Transfer pelunasan bertahap"
            value={payNotes}
            onChange={(e) => setPayNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setPayingRec(null)}>
              Batal
            </Button>
            <Button type="submit" loading={payLoading}>
              Catat Penerimaan Dana
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteRecId)}
        onClose={() => setDeleteRecId(null)}
        onConfirm={async () => {
          if (deleteRecId) {
            await onDeleteReceivable(deleteRecId);
            setDeleteRecId(null);
            showToast('Catatan piutang berhasil dihapus.', 'success');
          }
        }}
        title="Hapus Catatan Piutang?"
        description="Data piutang dan riwayat penerimaan akan dihapus secara permanen."
      />
    </div>
  );
};
