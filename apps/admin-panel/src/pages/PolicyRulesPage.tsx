import { useState } from 'react';
import {
  useAdminPolicyRules,
  useCreatePolicyRule,
  useUpdatePolicyRule,
  PolicyRule,
  PolicyCategory,
  PolicySeverity,
  PenaltyType,
  POLICY_CATEGORY_LABELS,
  POLICY_SEVERITY_LABELS,
  SEVERITY_COLORS,
  PENALTY_TYPE_LABELS,
} from '@/hooks/usePolicy';

const categoryTabs: { label: string; value: PolicyCategory | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Quality', value: 'quality' },
  { label: 'Delivery', value: 'delivery' },
  { label: 'Pricing', value: 'pricing' },
  { label: 'Listing', value: 'listing' },
  { label: 'Fraud', value: 'fraud' },
  { label: 'Compliance', value: 'compliance' },
  { label: 'Safety', value: 'safety' },
  { label: 'Communication', value: 'communication' },
  { label: 'Content', value: 'content' },
];

const PENALTY_BADGE_COLORS: Record<PenaltyType, string> = {
  warning: 'bg-yellow-100 text-yellow-700',
  suspension: 'bg-orange-100 text-orange-700',
  fine: 'bg-red-100 text-red-700',
  termination: 'bg-red-200 text-red-800',
};

interface RuleFormData {
  code: string;
  name: string;
  description: string;
  category: PolicyCategory;
  severity: PolicySeverity;
  penalty_type: PenaltyType;
  penalty_value: number;
  suspension_days: number;
  auto_detect: boolean;
  max_violations: number;
}

const defaultForm: RuleFormData = {
  code: '',
  name: '',
  description: '',
  category: 'quality',
  severity: 'warning',
  penalty_type: 'warning',
  penalty_value: 0,
  suspension_days: 0,
  auto_detect: false,
  max_violations: 3,
};

export function PolicyRulesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<PolicyCategory | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<PolicyRule | null>(null);
  const [form, setForm] = useState<RuleFormData>(defaultForm);

  const { data, isLoading } = useAdminPolicyRules({
    page,
    limit: 50,
    search: search || undefined,
    category: activeCategory || undefined,
  });

  const createMutation = useCreatePolicyRule();
  const updateMutation = useUpdatePolicyRule();

  const rules = data?.data || [];

  const openCreate = () => {
    setEditTarget(null);
    setForm(defaultForm);
    setShowForm(true);
  };

  const openEdit = (rule: PolicyRule) => {
    setEditTarget(rule);
    setForm({
      code: rule.code,
      name: rule.name,
      description: rule.description || '',
      category: rule.category,
      severity: rule.severity,
      penalty_type: rule.penalty_type,
      penalty_value: rule.penalty_value,
      suspension_days: rule.suspension_days,
      auto_detect: rule.auto_detect,
      max_violations: rule.max_violations,
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (editTarget) {
      updateMutation.mutate(
        { id: editTarget.id, ...form },
        { onSuccess: () => { setShowForm(false); setEditTarget(null); } },
      );
    } else {
      createMutation.mutate(form, { onSuccess: () => { setShowForm(false); } });
    }
  };

  const handleToggleActive = (rule: PolicyRule) => {
    updateMutation.mutate({ id: rule.id, is_active: !rule.is_active });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Policy Rules</h1>
          <p className="text-gray-500 mt-1">Manage platform policy rules that vendors must follow</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Rule
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder="Search by code or name..."
        className="w-full md:w-96 border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
      />

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {categoryTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setActiveCategory(tab.value); setPage(1); }}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeCategory === tab.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      )}

      {/* Rules table */}
      {!isLoading && rules.length > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Penalty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Viol.</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rules.map((r) => (
                  <tr key={r.id} className={`hover:bg-gray-50 ${!r.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">{r.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.name}</td>
                    <td className="px-4 py-3 text-sm">{POLICY_CATEGORY_LABELS[r.category]}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${SEVERITY_COLORS[r.severity]}`}>
                        {POLICY_SEVERITY_LABELS[r.severity]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${PENALTY_BADGE_COLORS[r.penalty_type]}`}>
                        {PENALTY_TYPE_LABELS[r.penalty_type]}
                      </span>
                      {r.penalty_type === 'fine' && r.penalty_value > 0 && (
                        <span className="text-xs text-gray-500 ml-1">₱{r.penalty_value.toLocaleString()}</span>
                      )}
                      {r.penalty_type === 'suspension' && r.suspension_days > 0 && (
                        <span className="text-xs text-gray-500 ml-1">{r.suspension_days}d</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">{r.max_violations}</td>
                    <td className="px-4 py-3 text-sm">
                      {r.auto_detect ? (
                        <span className="text-blue-600 text-xs font-medium">Auto</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Manual</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openEdit(r)}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleActive(r)}
                          className={`px-2 py-1 text-xs rounded ${
                            r.is_active
                              ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {r.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && rules.length === 0 && (
        <div className="bg-white rounded-lg border p-12 text-center">
          <p className="text-gray-500">No policy rules found</p>
          <button onClick={openCreate} className="text-blue-600 hover:underline mt-2">
            Create your first rule
          </button>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">{editTarget ? 'Edit Policy Rule' : 'Create Policy Rule'}</h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    disabled={!!editTarget}
                    className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                    placeholder="LATE_DELIVERY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Late Delivery Violation"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as PolicyCategory })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {Object.entries(POLICY_CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <select
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value as PolicySeverity })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {Object.entries(POLICY_SEVERITY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Penalty Type</label>
                  <select
                    value={form.penalty_type}
                    onChange={(e) => setForm({ ...form, penalty_type: e.target.value as PenaltyType })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    {Object.entries(PENALTY_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Violations</label>
                  <input
                    type="number"
                    value={form.max_violations}
                    onChange={(e) => setForm({ ...form, max_violations: Number(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    min={1}
                    max={50}
                  />
                </div>
              </div>

              {form.penalty_type === 'fine' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fine Amount (₱)</label>
                  <input
                    type="number"
                    value={form.penalty_value}
                    onChange={(e) => setForm({ ...form, penalty_value: Number(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    min={0}
                  />
                </div>
              )}

              {form.penalty_type === 'suspension' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Suspension Days</label>
                  <input
                    type="number"
                    value={form.suspension_days}
                    onChange={(e) => setForm({ ...form, suspension_days: Number(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    min={1}
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto_detect"
                  checked={form.auto_detect}
                  onChange={(e) => setForm({ ...form, auto_detect: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="auto_detect" className="text-sm text-gray-700">
                  Auto-detect by system (will trigger violations automatically)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setShowForm(false); setEditTarget(null); }} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isPending || !form.code || !form.name}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? 'Saving...' : editTarget ? 'Update Rule' : 'Create Rule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
