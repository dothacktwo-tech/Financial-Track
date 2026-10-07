import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users as UsersIcon,
  Activity,
  UserCheck,
  UserX,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Key,
  Lock,
  Code2,
  ArrowRight,
  UserPlus,
  Shield,
  Copy,
  Check,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { dataStore } from '../../lib/dataStore';
import { Profile, AuditLog } from '../../types/database';
import { formatDate } from '../../lib/date';
import { useAuth } from '../../hooks/useAuth';
import { SUPABASE_USER_MANAGEMENT_SQL } from '../../lib/schemaSql';
import { useToast } from '../../components/ui/Toast';

export const AdminDashboard: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersData, logsData] = await Promise.all([
          dataStore.getProfiles(),
          dataStore.getAuditLogs(),
        ]);
        setProfiles(usersData);
        setLogs(logsData);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_USER_MANAGEMENT_SQL);
    setCopiedSql(true);
    showToast('Skema SQL Manajemen Pengguna berhasil disalin!', 'success');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  if (!isAdmin) {
    return (
      <div className="py-12 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">Akses Ditolak</h3>
        <p className="text-xs text-slate-500 mt-1">
          Halaman ini khusus untuk administrator sistem.
        </p>
      </div>
    );
  }

  const activeUsersCount = profiles.filter((p) => p.status === 'active').length;
  const adminUsersCount = profiles.filter((p) => p.role === 'admin').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="rose" size="sm">
              Area Administrator
            </Badge>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Admin Control Panel
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Monitoring pengguna, pengaturan data login aplikasi, dan audit log aktivitas sistem
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsSqlModalOpen(true)}
            icon={<Code2 className="w-4 h-4 text-emerald-600" />}
          >
            Skema SQL Login
          </Button>
          <Button
            size="sm"
            onClick={() => onNavigate('/admin/users')}
            icon={<UsersIcon className="w-4 h-4" />}
          >
            Pengaturan Pengguna
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Pengguna
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <UsersIcon className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{profiles.length}</p>
          <p className="text-xs text-slate-400 mt-1">{activeUsersCount} akun aktif (dapat login)</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Akun Administrator
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{adminUsersCount}</p>
          <p className="text-xs text-slate-400 mt-1">Memiliki hak akses manajemen sistem</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Log Aktivitas
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{logs.length}</p>
          <p className="text-xs text-slate-400 mt-1">Tercatat dalam audit log sistem</p>
        </Card>
      </div>

      {/* Pengaturan Manajemen Pengguna Section (Featured Banner & Quick List) */}
      <Card className="p-5 border-emerald-100 bg-gradient-to-br from-white to-slate-50/50 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                <Key className="w-4 h-4" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Pengaturan Manajemen Pengguna & Login Username
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Data pengguna diatur di sini sebagai akun autentikasi untuk login ke aplikasi berbasis USERNAME & Password (tanpa kewajiban atribut email).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => onNavigate('/admin/users')}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Buka Manajemen Pengguna
            </Button>
          </div>
        </div>

        {/* Quick User List Preview */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {profiles.slice(0, 6).map((p) => (
            <div
              key={p.id}
              className="p-3 bg-white rounded-xl border border-slate-200/80 hover:border-emerald-300 transition-all flex items-center justify-between gap-3 shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {p.avatar_url ? (
                  <img
                    src={p.avatar_url}
                    alt={p.full_name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                    {p.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-extrabold text-slate-900 text-xs truncate">{p.full_name}</p>
                  <p className="text-[10px] text-emerald-700 font-bold truncate font-mono">@{p.username || (p.email ? p.email.split('@')[0] : 'user')}</p>
                </div>
              </div>

              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                <Badge variant={p.role === 'admin' ? 'rose' : 'slate'} size="sm" className="text-[9px] py-0">
                  {p.role === 'admin' ? 'Admin' : 'User'}
                </Badge>
                <span className={`inline-block w-2 h-2 rounded-full ${p.status === 'active' ? 'bg-emerald-500' : 'bg-amber-400'}`} title={p.status === 'active' ? 'Aktif' : 'Nonaktif'} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Audit Logs (PRD Section 39) */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Audit Logs (Catatan Aktivitas)</h3>
            <p className="text-xs text-slate-400">Pencatatan login, transaksi, dan perubahan data</p>
          </div>
          <Badge variant="slate" size="sm">
            {logs.length} Log
          </Badge>
        </div>

        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {logs.slice(0, 20).map((log) => (
            <div key={log.id} className="p-3.5 flex items-center justify-between gap-4 text-xs hover:bg-slate-50/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-mono font-bold text-[10px] text-slate-600 shrink-0">
                  LOG
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900">{log.action}</span>
                    <Badge variant="slate" size="sm" className="font-mono text-[10px]">
                      {log.entity || 'system'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    User: {log.user_email}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[11px] text-slate-400 font-medium">
                  {formatDate(log.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* SQL Modal */}
      <Modal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
        title="Skema SQL Supabase: Manajemen Pengguna & Login"
        description="Skema SQL lengkap untuk tabel profiles, ekstensi pgcrypto, dan stored procedure autentikasi."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Kode SQL:</span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopySql}
              icon={copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            >
              {copiedSql ? 'Tersalin!' : 'Salin SQL'}
            </Button>
          </div>

          <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[10px] rounded-xl overflow-x-auto max-h-72 leading-relaxed select-all">
            {SUPABASE_USER_MANAGEMENT_SQL}
          </pre>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button variant="primary" onClick={() => setIsSqlModalOpen(false)}>
              Tutup
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
