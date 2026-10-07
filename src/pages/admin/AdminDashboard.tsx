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
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { dataStore } from '../../lib/dataStore';
import { Profile, AuditLog } from '../../types/database';
import { formatDate } from '../../lib/date';
import { useAuth } from '../../hooks/useAuth';

export const AdminDashboard: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { user, isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

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
            Monitoring pengguna dan audit log aktivitas sistem
          </p>
        </div>

        <Button size="sm" onClick={() => onNavigate('/admin/users')} icon={<UsersIcon className="w-4 h-4" />}>
          Kelola Pengguna
        </Button>
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
          <p className="text-xs text-slate-400 mt-1">{activeUsersCount} akun aktif</p>
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
    </div>
  );
};
