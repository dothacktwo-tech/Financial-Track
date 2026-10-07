import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  ArrowLeftRight,
  Edit2,
  Trash2,
  Building2,
  Smartphone,
  Banknote,
  Store,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Badge } from '../components/ui/Badge';
import { Account, AccountType } from '../types/database';
import { formatCurrency } from '../lib/currency';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { getTodayString } from '../lib/date';

interface AccountsPageProps {
  accounts: Account[];
  onAddAccount: (acc: Omit<Account, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
  onTransfer: (payload: any) => Promise<void>;
}

export const Accounts: React.FC<AccountsPageProps> = ({
  accounts,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onTransfer,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('Bank');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // Transfer form states
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  const totalAssets = accounts.reduce((acc, a) => acc + (a.current_balance || 0), 0);

  const getAccountIcon = (accType: AccountType) => {
    switch (accType) {
      case 'Bank':
        return <Building2 className="w-5 h-5 text-blue-600" />;
      case 'E-Wallet':
        return <Smartphone className="w-5 h-5 text-emerald-600" />;
      case 'Cash':
        return <Banknote className="w-5 h-5 text-amber-600" />;
      case 'Toko':
        return <Store className="w-5 h-5 text-purple-600" />;
      default:
        return <Layers className="w-5 h-5 text-slate-600" />;
    }
  };

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setName('');
    setType('Bank');
    setOpeningBalance(0);
    setDescription('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (acc: Account) => {
    setEditingAccount(acc);
    setName(acc.name);
    setType(acc.type);
    setOpeningBalance(acc.opening_balance);
    setDescription(acc.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!user) return;

    setLoading(true);
    try {
      if (editingAccount) {
        await onUpdateAccount(editingAccount.id, {
          name,
          type,
          opening_balance: openingBalance,
          description,
        });
        showToast('Rekening berhasil diperbarui!', 'success');
      } else {
        await onAddAccount({
          user_id: user.id,
          name,
          type,
          opening_balance: openingBalance,
          description,
          is_active: true,
        });
        showToast('Rekening baru berhasil dibuat!', 'success');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan rekening', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferFrom || !transferTo || !transferAmount || transferAmount <= 0) {
      showToast('Lengkapi semua data transfer dengan benar', 'error');
      return;
    }
    if (transferFrom === transferTo) {
      showToast('Rekening asal dan tujuan tidak boleh sama', 'error');
      return;
    }
    if (!user) return;

    setTransferLoading(true);
    try {
      await onTransfer({
        user_id: user.id,
        source_account_id: transferFrom,
        destination_account_id: transferTo,
        amount: transferAmount,
        transaction_date: getTodayString(),
        description: `Transfer Antar Rekening`,
        notes: transferNotes || undefined,
      });
      showToast('Transfer saldo berhasil dilakukan!', 'success');
      setIsTransferModalOpen(false);
      setTransferAmount(0);
      setTransferNotes('');
    } catch (e: any) {
      showToast(e.message || 'Gagal melakukan transfer', 'error');
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Rekening & Dompet
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Total aset di seluruh rekening:{' '}
            <strong className="text-slate-800 font-bold">{formatCurrency(totalAssets)}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setTransferFrom(accounts[0]?.id || '');
              setTransferTo(accounts[1]?.id || '');
              setIsTransferModalOpen(true);
            }}
            icon={<ArrowLeftRight className="w-4 h-4 text-blue-600" />}
          >
            Transfer Antar Rekening
          </Button>
          <Button size="sm" onClick={handleOpenAdd} icon={<Plus className="w-4 h-4" />}>
            + Tambah Rekening
          </Button>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          return (
            <Card key={acc.id} className="relative overflow-hidden group hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shadow-xs">
                    {getAccountIcon(acc.type)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{acc.name}</h3>
                    <Badge variant="slate" size="sm" className="mt-0.5">
                      {acc.type}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleOpenEdit(acc)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteAccountId(acc.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Saldo Akhir */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Saldo Saat Ini
                </span>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {formatCurrency(acc.current_balance)}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>Saldo Awal: {formatCurrency(acc.opening_balance)}</span>
                  {acc.description && <span className="truncate max-w-[130px]">{acc.description}</span>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal Add / Edit Account */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAccount ? 'Edit Rekening' : 'Tambah Rekening Baru'}
        description="Kelola akun bank, e-wallet, atau dompet tunai Anda"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nama Rekening"
            placeholder="Misal: BCA Tahapan, GoPay, Dompet Tunai"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Select
            label="Jenis Rekening"
            value={type}
            onChange={(e) => setType(e.target.value as AccountType)}
          >
            <option value="Bank">Bank (BCA, Mandiri, BRI, dll)</option>
            <option value="E-Wallet">E-Wallet (GoPay, OVO, DANA, ShopeePay)</option>
            <option value="Cash">Cash / Uang Tunai</option>
            <option value="Toko">Toko / Merchant</option>
            <option value="Lainnya">Lainnya</option>
          </Select>

          <CurrencyInput
            label="Saldo Awal (Rp)"
            value={openingBalance}
            onChange={setOpeningBalance}
            helperText="Saldo mula-mula saat rekening ini didaftarkan"
          />

          <Input
            label="Keterangan (Opsional)"
            placeholder="Catatan rekening..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={loading}>
              {editingAccount ? 'Simpan Perubahan' : 'Tambah Rekening'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Transfer Antar Rekening */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transfer Antar Rekening"
        description="Pindahkan dana dari satu rekening ke rekening lain tanpa mempengaruhi laporan laba rugi"
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <Select
            label="Dari Rekening (Asal)"
            value={transferFrom}
            onChange={(e) => setTransferFrom(e.target.value)}
            required
          >
            <option value="">Pilih Rekening Asal</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({formatCurrency(a.current_balance)})
              </option>
            ))}
          </Select>

          <Select
            label="Ke Rekening (Tujuan)"
            value={transferTo}
            onChange={(e) => setTransferTo(e.target.value)}
            required
          >
            <option value="">Pilih Rekening Tujuan</option>
            {accounts
              .filter((a) => a.id !== transferFrom)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({formatCurrency(a.current_balance)})
                </option>
              ))}
          </Select>

          <CurrencyInput
            label="Nominal Transfer"
            value={transferAmount}
            onChange={setTransferAmount}
            required
          />

          <Input
            label="Catatan Transfer (Opsional)"
            placeholder="Misal: Top up e-wallet..."
            value={transferNotes}
            onChange={(e) => setTransferNotes(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsTransferModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={transferLoading}>
              Kirim Transfer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteAccountId)}
        onClose={() => setDeleteAccountId(null)}
        onConfirm={async () => {
          if (deleteAccountId) {
            await onDeleteAccount(deleteAccountId);
            setDeleteAccountId(null);
            showToast('Rekening berhasil dihapus.', 'success');
          }
        }}
        title="Hapus Rekening?"
        description="Rekening ini akan dihapus dari daftar. Transaksi yang telah tercatat sebelumnya tetap tersimpan."
      />
    </div>
  );
};
