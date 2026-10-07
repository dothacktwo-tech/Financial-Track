import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Edit2,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  X,
  Eye,
  Calendar,
  Wallet,
  Tag,
  CreditCard,
  FileText,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { formatCurrency } from '../lib/currency';
import { formatDate } from '../lib/date';
import { Account, Category, Transaction, TransactionType } from '../types/database';

interface TransactionsPageProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onAddTransaction: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => Promise<void>;
  onNavigateToScan: () => void;
}

const PAGE_SIZE = 10;

export const Transactions: React.FC<TransactionsPageProps> = ({
  transactions,
  accounts,
  categories,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onNavigateToScan,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | TransactionType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [viewingTransaction, setViewingTransaction] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered transactions
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      // Tab type filter
      if (activeTab !== 'all' && tx.type !== activeTab) return false;

      // Account filter
      if (selectedAccount && tx.account_id !== selectedAccount && tx.destination_account_id !== selectedAccount) {
        return false;
      }

      // Category filter
      if (selectedCategory && tx.category_id !== selectedCategory) return false;

      // Month filter (YYYY-MM)
      if (selectedMonth && !tx.transaction_date.startsWith(selectedMonth)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const desc = (tx.description || '').toLowerCase();
        const notes = (tx.notes || '').toLowerCase();
        const cat = (tx.category?.name || '').toLowerCase();
        const acc = (tx.account?.name || '').toLowerCase();
        if (!desc.includes(q) && !notes.includes(q) && !cat.includes(q) && !acc.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, activeTab, selectedAccount, selectedCategory, selectedMonth, searchQuery]);

  // Reset page when filters change
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    try {
      await onDeleteTransaction(deleteTargetId);
      if (viewingTransaction?.id === deleteTargetId) {
        setViewingTransaction(null);
      }
      setDeleteTargetId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const clearFilters = () => {
    setActiveTab('all');
    setSearchQuery('');
    setSelectedAccount('');
    setSelectedCategory('');
    setSelectedMonth('');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    activeTab !== 'all' || searchQuery || selectedAccount || selectedCategory || selectedMonth
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Semua Transaksi
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Total {transactions.length} riwayat pemasukan, pengeluaran, dan transfer
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onNavigateToScan}
            icon={<Sparkles className="w-4 h-4 text-emerald-600" />}
          >
            Scan Struk AI
          </Button>
          <Button size="sm" onClick={onAddTransaction} icon={<Plus className="w-4 h-4" />}>
            + Tambah Transaksi
          </Button>
        </div>
      </div>

      {/* Main Filter & Tabs Card */}
      <Card className="p-4 sm:p-5">
        <div className="space-y-4">
          {/* Type Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
            {[
              { id: 'all', label: 'Semua Transaksi' },
              { id: 'income', label: 'Pemasukan' },
              { id: 'expense', label: 'Pengeluaran' },
              { id: 'transfer', label: 'Transfer Saldo' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setCurrentPage(1);
                }}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search and Dropdowns Filter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-1">
              <Input
                placeholder="Cari deskripsi, catatan..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>

            <Select
              value={selectedAccount}
              onChange={(e) => {
                setSelectedAccount(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Semua Rekening</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>

            <Select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {hasActiveFilters && (
            <div className="flex items-center justify-between text-xs pt-1 text-slate-500">
              <span>
                Ditemukan <strong>{filtered.length}</strong> transaksi dari filter yang dipilih
              </span>
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 font-semibold text-rose-600 hover:underline cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Reset Filter
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Transaction List */}
      <Card className="p-0 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Tidak ada transaksi yang cocok"
              description={
                hasActiveFilters
                  ? 'Coba ubah kata kunci atau bersihkan filter pencarian.'
                  : 'Mulai dengan menambahkan catatan transaksi pemasukan atau pengeluaran.'
              }
              actionText={hasActiveFilters ? 'Reset Filter' : '+ Tambah Transaksi'}
              onAction={hasActiveFilters ? clearFilters : onAddTransaction}
            />
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Jenis</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Deskripsi</th>
                    <th className="py-3 px-4">Rekening</th>
                    <th className="py-3 px-4 text-right">Nominal</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {paginatedTransactions.map((tx) => {
                    const isInc = tx.type === 'income';
                    const isTrans = tx.type === 'transfer';

                    return (
                      <tr
                        key={tx.id}
                        onClick={() => setViewingTransaction(tx)}
                        className="hover:bg-slate-50/70 transition cursor-pointer"
                      >
                        <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                          {formatDate(tx.transaction_date)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge
                            variant={isInc ? 'emerald' : isTrans ? 'blue' : 'rose'}
                            size="sm"
                          >
                            {isInc ? 'Pemasukan' : isTrans ? 'Transfer' : 'Pengeluaran'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">
                          {tx.category?.name || (isTrans ? 'Transfer Saldo' : '-')}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-bold text-slate-900 truncate">
                            {tx.description}
                          </div>
                          {tx.notes && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">{tx.notes}</p>
                          )}
                          {tx.source === 'receipt_ai' && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mt-0.5">
                              <Sparkles className="w-3 h-3" /> Scan Struk AI
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                          {isTrans ? (
                            <span>
                              {tx.account?.name} &rarr; {tx.destination_account?.name}
                            </span>
                          ) : (
                            tx.account?.name || '-'
                          )}
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-extrabold whitespace-nowrap text-sm ${
                            isInc
                              ? 'text-emerald-600'
                              : isTrans
                              ? 'text-blue-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {isInc ? '+' : isTrans ? '' : '-'}
                          {formatCurrency(tx.amount)}
                        </td>
                        <td
                          className="py-3.5 px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setViewingTransaction(tx)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Lihat Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onEditTransaction(tx)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTargetId(tx.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards List View */}
            <div className="md:hidden divide-y divide-slate-100">
              {paginatedTransactions.map((tx) => {
                const isInc = tx.type === 'income';
                const isTrans = tx.type === 'transfer';

                return (
                  <div
                    key={tx.id}
                    onClick={() => setViewingTransaction(tx)}
                    className="p-4 space-y-2 hover:bg-slate-50/50 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
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
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-tight">
                            {tx.description}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {formatDate(tx.transaction_date)} • {tx.account?.name}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
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
                        <Badge
                          variant={isInc ? 'emerald' : isTrans ? 'blue' : 'rose'}
                          size="sm"
                          className="mt-0.5"
                        >
                          {isInc ? 'Pemasukan' : isTrans ? 'Transfer' : 'Pengeluaran'}
                        </Badge>
                      </div>
                    </div>

                    <div
                      className="flex items-center justify-between pt-1 border-t border-slate-50 text-[11px] text-slate-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>{tx.category?.name || (isTrans ? 'Transfer Saldo' : '-')}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewingTransaction(tx)}
                          className="text-blue-600 font-semibold p-1"
                        >
                          Detail
                        </button>
                        <span>•</span>
                        <button
                          onClick={() => onEditTransaction(tx)}
                          className="text-slate-600 hover:text-slate-900 p-1"
                        >
                          Edit
                        </button>
                        <span>•</span>
                        <button
                          onClick={() => setDeleteTargetId(tx.id)}
                          className="text-rose-600 hover:text-rose-800 p-1"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="p-4 bg-slate-50/40">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filtered.length}
                pageSize={PAGE_SIZE}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Transaction Detail Modal */}
      {viewingTransaction && (
        <Modal
          isOpen={Boolean(viewingTransaction)}
          onClose={() => setViewingTransaction(null)}
          title="Detail Transaksi"
          description={`ID: ${viewingTransaction.id}`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Nominal
                </span>
                <p
                  className={`text-2xl font-extrabold ${
                    viewingTransaction.type === 'income'
                      ? 'text-emerald-600'
                      : viewingTransaction.type === 'transfer'
                      ? 'text-blue-600'
                      : 'text-rose-600'
                  }`}
                >
                  {viewingTransaction.type === 'income' ? '+' : viewingTransaction.type === 'transfer' ? '' : '-'}
                  {formatCurrency(viewingTransaction.amount)}
                </p>
              </div>
              <Badge
                variant={
                  viewingTransaction.type === 'income'
                    ? 'emerald'
                    : viewingTransaction.type === 'transfer'
                    ? 'blue'
                    : 'rose'
                }
                size="md"
              >
                {viewingTransaction.type === 'income'
                  ? 'Pemasukan'
                  : viewingTransaction.type === 'transfer'
                  ? 'Transfer'
                  : 'Pengeluaran'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                <span className="text-slate-400 flex items-center gap-1 font-medium">
                  <Calendar className="w-3.5 h-3.5" /> Tanggal
                </span>
                <p className="font-bold text-slate-800">
                  {formatDate(viewingTransaction.transaction_date)}
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                <span className="text-slate-400 flex items-center gap-1 font-medium">
                  <Wallet className="w-3.5 h-3.5" /> Rekening
                </span>
                <p className="font-bold text-slate-800">
                  {viewingTransaction.type === 'transfer'
                    ? `${viewingTransaction.account?.name} → ${viewingTransaction.destination_account?.name}`
                    : viewingTransaction.account?.name || '-'}
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                <span className="text-slate-400 flex items-center gap-1 font-medium">
                  <Tag className="w-3.5 h-3.5" /> Kategori
                </span>
                <p className="font-bold text-slate-800">
                  {viewingTransaction.category?.name || '-'}
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                <span className="text-slate-400 flex items-center gap-1 font-medium">
                  <CreditCard className="w-3.5 h-3.5" /> Metode Bayar
                </span>
                <p className="font-bold text-slate-800">
                  {viewingTransaction.payment_method || 'Cash'}
                </p>
              </div>
            </div>

            {/* Description & Notes */}
            <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Deskripsi:</span>
                <p className="font-bold text-slate-800 mt-0.5">{viewingTransaction.description}</p>
              </div>
              {viewingTransaction.notes && (
                <div>
                  <span className="text-slate-400 font-medium">Catatan:</span>
                  <p className="text-slate-600 mt-0.5">{viewingTransaction.notes}</p>
                </div>
              )}
            </div>

            {/* Items Breakdown if present */}
            {viewingTransaction.items && viewingTransaction.items.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-xs font-bold text-slate-700 block">
                  Rincian Item Barang ({viewingTransaction.items.length})
                </span>
                <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-40 overflow-y-auto text-xs">
                  {viewingTransaction.items.map((it, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{it.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {it.quantity}x @ {formatCurrency(it.unit_price)}
                        </p>
                      </div>
                      <span className="font-bold text-slate-900">{formatCurrency(it.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingTransaction(null)}
              >
                Tutup
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setDeleteTargetId(viewingTransaction.id);
                }}
                icon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Hapus
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  const tx = viewingTransaction;
                  setViewingTransaction(null);
                  onEditTransaction(tx);
                }}
                icon={<Edit2 className="w-3.5 h-3.5" />}
              >
                Edit Transaksi
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus transaksi?"
        description="Data transaksi ini akan dihapus dan tidak dapat dikembalikan. Saldo rekening akan disesuaikan otomatis."
        confirmText="Hapus"
        loading={isDeleting}
      />
    </div>
  );
};
