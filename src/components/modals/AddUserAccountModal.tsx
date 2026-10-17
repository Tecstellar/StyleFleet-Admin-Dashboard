import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Users,
  Shield,
  Lock,
  Mail,
  User,
  Check,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  CrmUserAccount,
  ALL_AVAILABLE_MODULES,
  fetchCrmUserAccounts,
  createCrmUserAccount,
  deleteCrmUserAccount,
} from '../../services/crmUserService';
import { useAuth } from '../../context/AuthContext';

interface AddUserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddUserAccountModal: React.FC<AddUserAccountModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<CrmUserAccount[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [crmRole, setCrmRole] = useState<'admin' | 'staff'>('staff');
  const [accessType, setAccessType] = useState<'full' | 'strict'>('full');
  const [selectedModules, setSelectedModules] = useState<string[]>(
    ALL_AVAILABLE_MODULES.map((m) => m.id)
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load existing accounts
  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  const loadAccounts = async () => {
    setLoading(true);
    const data = await fetchCrmUserAccounts();
    setAccounts(data);
    setLoading(false);
  };

  if (!isOpen) return null;

  const handleToggleModule = (modId: string) => {
    setSelectedModules((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );
  };

  const handleSelectAllModules = () => {
    setSelectedModules(ALL_AVAILABLE_MODULES.map((m) => m.id));
  };

  const handleClearAllModules = () => {
    setSelectedModules([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setError('Please provide staff or admin name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!password.trim() || password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (accessType === 'strict' && selectedModules.length === 0) {
      setError('Please select at least one permitted module for strict access.');
      return;
    }

    setSaving(true);
    const result = await createCrmUserAccount({
      name: name.trim(),
      email: email.trim(),
      password: password.trim(),
      crm_role: crmRole,
      access_type: accessType,
      allowed_modules: accessType === 'full' ? ALL_AVAILABLE_MODULES.map((m) => m.id) : selectedModules,
      created_by: user?.email || 'info@tecstellar.com',
    });
    setSaving(false);

    if (!result.success) {
      setError(result.error || 'Failed to create user account.');
      return;
    }

    setSuccessMsg(`User account for ${name} (${email}) created successfully!`);
    setName('');
    setEmail('');
    setPassword('');
    setAccessType('full');
    setSelectedModules(ALL_AVAILABLE_MODULES.map((m) => m.id));
    loadAccounts();
  };

  const handleDelete = async (id: string, userEmail: string) => {
    if (window.confirm(`Are you sure you want to delete access for ${userEmail}?`)) {
      await deleteCrmUserAccount(id);
      loadAccounts();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-[#F8F3F0] rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-[#071952]/30 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#071952] px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Add User Account
              </h3>
              <p className="text-xs text-white/80">
                Created by <strong>{user?.email || 'info@tecstellar.com'}</strong> • Staff credentials &amp; permissions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-black">
          {/* Notifications */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="font-bold text-black uppercase tracking-wider block text-[11px]">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full pl-8.5 pr-3 py-2 rounded-lg border border-[#071952]/30 bg-white text-black text-xs focus:outline-none focus:border-[#071952] focus:ring-1 focus:ring-[#071952]"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="font-bold text-black uppercase tracking-wider block text-[11px]">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. ramesh@tecstellar.com"
                    className="w-full pl-8.5 pr-3 py-2 rounded-lg border border-[#071952]/30 bg-white text-black text-xs focus:outline-none focus:border-[#071952] focus:ring-1 focus:ring-[#071952]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Password */}
              <div className="space-y-1">
                <label className="font-bold text-black uppercase tracking-wider block text-[11px]">
                  Login Password *
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Staff password (min 6 chars)"
                    className="w-full pl-8.5 pr-8 py-2 rounded-lg border border-[#071952]/30 bg-white text-black text-xs focus:outline-none focus:border-[#071952] focus:ring-1 focus:ring-[#071952]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* CRM Role */}
              <div className="space-y-1">
                <label className="font-bold text-black uppercase tracking-wider block text-[11px]">
                  CRM Role *
                </label>
                <select
                  value={crmRole}
                  onChange={(e) => setCrmRole(e.target.value as 'admin' | 'staff')}
                  className="w-full p-2 rounded-lg border border-[#071952]/30 bg-white text-black text-xs focus:outline-none focus:border-[#071952] cursor-pointer"
                >
                  <option value="staff">Staff (Operational)</option>
                  <option value="admin">Admin (Manager)</option>
                </select>
              </div>

              {/* Access Limits Dropdown */}
              <div className="space-y-1">
                <label className="font-bold text-black uppercase tracking-wider block text-[11px]">
                  Access Limits *
                </label>
                <select
                  value={accessType}
                  onChange={(e) => setAccessType(e.target.value as 'full' | 'strict')}
                  className="w-full p-2 rounded-lg border border-[#071952]/30 bg-white text-black text-xs focus:outline-none focus:border-[#071952] cursor-pointer"
                >
                  <option value="full">Full Role Access (All Pages)</option>
                  <option value="strict">Strict Access Limits (Selected Only)</option>
                </select>
              </div>
            </div>

            {/* Strict Access Limits: Module Checkbox Matrix */}
            {accessType === 'strict' && (
              <div className="rounded-xl border border-[#071952]/25 bg-white p-4 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-[#071952]/15">
                  <div>
                    <h4 className="font-bold text-black text-xs flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#071952]" />
                      <span>Select Permitted Sidebar Modules</span>
                    </h4>
                    <p className="text-[11px] text-black/60">
                      Tick only the specific modules this user is allowed to access
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllModules}
                      className="px-2 py-1 rounded bg-[#071952]/10 hover:bg-[#071952]/20 text-[#071952] font-semibold text-[10px] cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllModules}
                      className="px-2 py-1 rounded bg-black/5 hover:bg-black/10 text-black/70 font-semibold text-[10px] cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {ALL_AVAILABLE_MODULES.map((mod) => {
                    const isChecked = selectedModules.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition-colors ${
                          isChecked
                            ? 'bg-[#071952]/5 border-[#071952]/40 text-[#071952] font-semibold'
                            : 'bg-white border-black/10 text-black/70 hover:border-black/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleModule(mod.id)}
                          className="w-3.5 h-3.5 rounded text-[#071952] accent-[#071952] cursor-pointer"
                        />
                        <span className="text-[11px] leading-tight truncate" title={mod.label}>
                          {mod.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submit button */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#071952] hover:bg-[#0b2575] text-white font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving ? (
                  <span>Saving to Database...</span>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Create User Account</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Existing User Accounts List */}
          <div className="pt-4 border-t border-[#071952]/15 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#071952]" />
                <h4 className="font-bold text-black text-xs uppercase tracking-wider">
                  Active Staff &amp; Admin Accounts ({accounts.length})
                </h4>
              </div>
              <span className="text-[10px] text-black/60">
                Master: info@tecstellar.com
              </span>
            </div>

            {loading ? (
              <div className="py-4 text-center text-black/50">Loading accounts...</div>
            ) : accounts.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[#071952]/20 bg-white/50 text-center text-black/60">
                No extra staff accounts created yet. Use the form above to add your team members.
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-3 rounded-xl border border-[#071952]/15 bg-white flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-black text-xs">{acc.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[#071952] text-white">
                          {acc.crm_role}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          acc.access_type === 'full' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {acc.access_type === 'full' ? 'Full Access' : `${acc.allowed_modules.length} Modules`}
                        </span>
                      </div>
                      <p className="text-[11px] text-black/70 font-mono truncate">{acc.email}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(acc.id, acc.email)}
                      className="p-1.5 text-black/40 hover:text-red-600 transition-colors cursor-pointer"
                      title="Remove access"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
