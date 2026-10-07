import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider, useToast } from './components/ui/Toast';
import { AppLayout } from './layouts/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { ReceiptScanner } from './pages/ReceiptScanner';
import { Accounts } from './pages/Accounts';
import { Debts } from './pages/Debts';
import { Receivables } from './pages/Receivables';
import { SavingsGoals } from './pages/SavingsGoals';
import { Categories } from './pages/Categories';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { Users } from './pages/admin/Users';
import { TransactionFormModal } from './components/transactions/TransactionFormModal';
import { LoadingState } from './components/ui/LoadingState';
import { dataStore } from './lib/dataStore';
import { transactionService } from './services/transactionService';
import { accountService } from './services/accountService';
import { categoryService } from './services/categoryService';
import { debtService } from './services/debtService';
import { receivableService } from './services/receivableService';
import { savingsService } from './services/savingsService';
import {
  Account,
  Category,
  Debt,
  Receivable,
  SavingGoal,
  Transaction,
} from './types/database';

function MainApp() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [currentPath, setCurrentPath] = useState<string>('/dashboard');
  const [dataLoading, setDataLoading] = useState<boolean>(true);

  // Core entities
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>([]);

  // Transaction Modal State
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const userId = user?.id;

  const refreshAllData = useCallback(async () => {
    if (!userId) return;
    setDataLoading(true);
    try {
      const [accs, cats, txs, dbs, recs, sgs] = await Promise.all([
        dataStore.getAccounts(userId),
        dataStore.getCategories(userId),
        dataStore.getTransactions(userId),
        dataStore.getDebts(userId),
        dataStore.getReceivables(userId),
        dataStore.getSavingGoals(userId),
      ]);
      setAccounts(accs);
      setCategories(cats);
      setTransactions(txs);
      setDebts(dbs);
      setReceivables(recs);
      setSavingGoals(sgs);
    } catch (e) {
      console.error('Error loading financial data:', e);
    } finally {
      setDataLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  // Handle route change with admin guards
  const handleNavigate = (path: string) => {
    if (path.startsWith('/admin') && !isAdmin) {
      showToast('Akses khusus administrator', 'error');
      setCurrentPath('/dashboard');
      return;
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Transaction CRUD handlers
  const handleSaveTransaction = async (formData: any) => {
    if (!user) return;
    if (editingTransaction) {
      await transactionService.update(editingTransaction.id, formData);
      showToast('Transaksi berhasil diperbarui.', 'success');
    } else {
      await transactionService.create({
        ...formData,
        user_id: user.id,
      });
      showToast('Transaksi berhasil dicatat.', 'success');
    }
    setEditingTransaction(null);
    await refreshAllData();
  };

  const handleDeleteTransaction = async (id: string) => {
    await transactionService.delete(id);
    showToast('Transaksi berhasil dihapus.', 'success');
    await refreshAllData();
  };

  // Account Handlers
  const handleAddAccount = async (account: Omit<Account, 'id' | 'created_at' | 'updated_at'>) => {
    await accountService.create(account);
    await refreshAllData();
  };

  const handleUpdateAccount = async (id: string, updates: Partial<Account>) => {
    await accountService.update(id, updates);
    await refreshAllData();
  };

  const handleDeleteAccount = async (id: string) => {
    await accountService.delete(id);
    await refreshAllData();
  };

  const handleTransfer = async (payload: any) => {
    await accountService.transfer(payload);
    await refreshAllData();
  };

  // Category Handlers
  const handleAddCategory = async (cat: Omit<Category, 'id' | 'created_at'>) => {
    await categoryService.create(cat);
    await refreshAllData();
  };

  const handleUpdateCategory = async (id: string, updates: Partial<Category>) => {
    await categoryService.update(id, updates);
    await refreshAllData();
  };

  const handleDeleteCategory = async (id: string) => {
    await categoryService.delete(id);
    await refreshAllData();
  };

  // Debt Handlers
  const handleAddDebt = async (debt: Omit<Debt, 'id' | 'remaining_amount' | 'status' | 'created_at' | 'updated_at'>) => {
    await debtService.create(debt);
    await refreshAllData();
  };

  const handleUpdateDebt = async (id: string, updates: Partial<Debt>) => {
    await debtService.update(id, updates);
    await refreshAllData();
  };

  const handleDeleteDebt = async (id: string) => {
    await debtService.delete(id);
    await refreshAllData();
  };

  const handlePayDebt = async (debtId: string, payload: any) => {
    await debtService.pay(debtId, payload);
    await refreshAllData();
  };

  // Receivable Handlers
  const handleAddReceivable = async (rec: Omit<Receivable, 'id' | 'remaining_amount' | 'status' | 'created_at' | 'updated_at'>) => {
    await receivableService.create(rec);
    await refreshAllData();
  };

  const handleUpdateReceivable = async (id: string, updates: Partial<Receivable>) => {
    await receivableService.update(id, updates);
    await refreshAllData();
  };

  const handleDeleteReceivable = async (id: string) => {
    await receivableService.delete(id);
    await refreshAllData();
  };

  const handlePayReceivable = async (recId: string, payload: any) => {
    await receivableService.pay(recId, payload);
    await refreshAllData();
  };

  // Savings Goals Handlers
  const handleAddGoal = async (goal: Omit<SavingGoal, 'id' | 'current_amount' | 'status' | 'created_at' | 'updated_at'>) => {
    await savingsService.create(goal);
    await refreshAllData();
  };

  const handleUpdateGoal = async (id: string, updates: Partial<SavingGoal>) => {
    await savingsService.update(id, updates);
    await refreshAllData();
  };

  const handleDeleteGoal = async (id: string) => {
    await savingsService.delete(id);
    await refreshAllData();
  };

  const handleContributeGoal = async (goalId: string, payload: any) => {
    await savingsService.contribute(goalId, payload);
    await refreshAllData();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingState message="Menyiapkan data sesi Anda..." />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Active view renderer
  const renderView = () => {
    switch (currentPath) {
      case '/dashboard':
        return (
          <Dashboard
            accounts={accounts}
            transactions={transactions}
            debts={debts}
            receivables={receivables}
            savingGoals={savingGoals}
            loading={dataLoading}
            onNavigate={handleNavigate}
            onQuickAdd={() => {
              setEditingTransaction(null);
              setIsQuickAddOpen(true);
            }}
          />
        );

      case '/transactions':
        return (
          <Transactions
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            onAddTransaction={() => {
              setEditingTransaction(null);
              setIsQuickAddOpen(true);
            }}
            onEditTransaction={(tx) => {
              setEditingTransaction(tx);
              setIsQuickAddOpen(true);
            }}
            onDeleteTransaction={handleDeleteTransaction}
            onNavigateToScan={() => handleNavigate('/receipts')}
          />
        );

      case '/receipts':
        return (
          <ReceiptScanner
            accounts={accounts}
            categories={categories}
            onTransactionCreated={refreshAllData}
            onNavigate={handleNavigate}
          />
        );

      case '/accounts':
        return (
          <Accounts
            accounts={accounts}
            onAddAccount={handleAddAccount}
            onUpdateAccount={handleUpdateAccount}
            onDeleteAccount={handleDeleteAccount}
            onTransfer={handleTransfer}
          />
        );

      case '/categories':
        return (
          <Categories
            categories={categories}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onDeleteCategory={handleDeleteCategory}
          />
        );

      case '/debts':
        return (
          <Debts
            debts={debts}
            accounts={accounts}
            onAddDebt={handleAddDebt}
            onUpdateDebt={handleUpdateDebt}
            onDeleteDebt={handleDeleteDebt}
            onPayDebt={handlePayDebt}
          />
        );

      case '/receivables':
        return (
          <Receivables
            receivables={receivables}
            accounts={accounts}
            onAddReceivable={handleAddReceivable}
            onUpdateReceivable={handleUpdateReceivable}
            onDeleteReceivable={handleDeleteReceivable}
            onPayReceivable={handlePayReceivable}
          />
        );

      case '/savings':
        return (
          <SavingsGoals
            savingGoals={savingGoals}
            accounts={accounts}
            onAddGoal={handleAddGoal}
            onUpdateGoal={handleUpdateGoal}
            onDeleteGoal={handleDeleteGoal}
            onContribute={handleContributeGoal}
          />
        );

      case '/reports':
        return (
          <Reports
            transactions={transactions}
            accounts={accounts}
            debts={debts}
            receivables={receivables}
            savingGoals={savingGoals}
          />
        );

      case '/settings':
        return <Settings />;

      case '/admin':
        return <AdminDashboard onNavigate={handleNavigate} />;

      case '/admin/users':
        return <Users onNavigate={handleNavigate} />;

      default:
        return (
          <Dashboard
            accounts={accounts}
            transactions={transactions}
            debts={debts}
            receivables={receivables}
            savingGoals={savingGoals}
            loading={dataLoading}
            onNavigate={handleNavigate}
            onQuickAdd={() => {
              setEditingTransaction(null);
              setIsQuickAddOpen(true);
            }}
          />
        );
    }
  };

  return (
    <AppLayout
      currentPath={currentPath}
      onNavigate={handleNavigate}
      onQuickAdd={() => {
        setEditingTransaction(null);
        setIsQuickAddOpen(true);
      }}
    >
      {renderView()}

      {/* Quick Add / Edit Transaction Modal */}
      <TransactionFormModal
        isOpen={isQuickAddOpen}
        onClose={() => {
          setIsQuickAddOpen(false);
          setEditingTransaction(null);
        }}
        onSubmit={handleSaveTransaction}
        accounts={accounts}
        categories={categories}
        initialData={editingTransaction}
        onNavigateToScan={() => handleNavigate('/receipts')}
      />
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </AuthProvider>
  );
}
