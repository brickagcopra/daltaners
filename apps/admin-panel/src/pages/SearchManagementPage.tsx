import { useState } from 'react';
import {
  useSynonyms,
  useCreateSynonym,
  useUpdateSynonym,
  useDeleteSynonym,
  useBoostRules,
  useCreateBoostRule,
  useUpdateBoostRule,
  useDeleteBoostRule,
  useSearchAnalytics,
  useIndexHealth,
  useReindex,
  BOOST_TYPE_LABELS,
  BOOST_TYPE_COLORS,
  INDEX_STATUS_COLORS,
  SUGGESTED_ACTION_LABELS,
} from '@/hooks/useSearchAdmin';
import type { SearchSynonym, BoostRule } from '@/hooks/useSearchAdmin';

type Tab = 'analytics' | 'synonyms' | 'boost-rules' | 'index-health';

export function SearchManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>('analytics');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'analytics', label: 'Search Analytics' },
    { key: 'synonyms', label: 'Synonyms' },
    { key: 'boost-rules', label: 'Boost Rules' },
    { key: 'index-health', label: 'Index Health' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage search synonyms, boost rules, analytics, and index health
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'analytics' && <AnalyticsTab />}
      {activeTab === 'synonyms' && <SynonymsTab />}
      {activeTab === 'boost-rules' && <BoostRulesTab />}
      {activeTab === 'index-health' && <IndexHealthTab />}
    </div>
  );
}

// ── Analytics Tab ───────────────────────────────────────────────────────

function AnalyticsTab() {
  const { data: analytics, isLoading } = useSearchAnalytics();

  if (isLoading) return <div className="py-12 text-center text-gray-500">Loading analytics...</div>;
  if (!analytics) return <div className="py-12 text-center text-gray-500">No data available</div>;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Total Searches" value={analytics.total_searches.toLocaleString()} change={analytics.total_searches_change} />
        <StatCard title="Unique Searchers" value={analytics.unique_searchers.toLocaleString()} change={analytics.unique_searchers_change} />
        <StatCard title="Avg CTR" value={`${analytics.avg_ctr}%`} change={analytics.avg_ctr_change} />
        <StatCard title="Zero Result Rate" value={`${analytics.zero_result_rate}%`} change={analytics.zero_result_rate_change} invertColor />
        <StatCard title="Avg Response Time" value={`${analytics.avg_response_time_ms}ms`} change={0} />
      </div>

      {/* Searches by Day Chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Daily Search Volume (30 days)</h3>
        <div className="h-48 flex items-end gap-1">
          {analytics.searches_by_day.map((day) => {
            const maxSearches = Math.max(...analytics.searches_by_day.map((d) => d.searches));
            const height = (day.searches / maxSearches) * 100;
            return (
              <div key={day.date} className="group relative flex-1" title={`${day.date}: ${day.searches} searches`}>
                <div
                  className="rounded-t bg-primary/80 transition-colors group-hover:bg-primary"
                  style={{ height: `${height}%` }}
                />
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t bg-red-400/60"
                  style={{ height: `${(day.zero_results / maxSearches) * 100}%` }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-primary" /> Searches</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-red-400" /> Zero Results</span>
        </div>
      </div>

      {/* Top Queries + Zero Result Queries */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Queries */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Top Queries</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-500">
                  <th className="pb-2 pr-4">Query</th>
                  <th className="pb-2 pr-4 text-right">Count</th>
                  <th className="pb-2 pr-4 text-right">CTR</th>
                  <th className="pb-2 text-right">Conv.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {analytics.top_queries.slice(0, 10).map((q) => (
                  <tr key={q.query} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-900">{q.query}</td>
                    <td className="py-2 pr-4 text-right text-gray-600">{q.count.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right text-gray-600">{q.ctr}%</td>
                    <td className="py-2 text-right text-gray-600">{q.conversion_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Zero Result Queries */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Zero Result Queries</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase text-gray-500">
                  <th className="pb-2 pr-4">Query</th>
                  <th className="pb-2 pr-4 text-right">Count</th>
                  <th className="pb-2">Suggested</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {analytics.zero_result_queries.map((q) => (
                  <tr key={q.query} className="hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-900">{q.query}</td>
                    <td className="py-2 pr-4 text-right text-gray-600">{q.count}</td>
                    <td className="py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        q.suggested_action === 'add_synonym' ? 'bg-blue-100 text-blue-800' :
                        q.suggested_action === 'add_product' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {SUGGESTED_ACTION_LABELS[q.suggested_action]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Synonyms Tab ────────────────────────────────────────────────────────

function SynonymsTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSynonym, setEditingSynonym] = useState<SearchSynonym | null>(null);
  const [formTerm, setFormTerm] = useState('');
  const [formSynonyms, setFormSynonyms] = useState('');

  const { data, isLoading } = useSynonyms({ page, search, is_active: statusFilter });
  const createMutation = useCreateSynonym();
  const updateMutation = useUpdateSynonym();
  const deleteMutation = useDeleteSynonym();

  const openCreate = () => {
    setEditingSynonym(null);
    setFormTerm('');
    setFormSynonyms('');
    setShowModal(true);
  };

  const openEdit = (syn: SearchSynonym) => {
    setEditingSynonym(syn);
    setFormTerm(syn.term);
    setFormSynonyms(syn.synonyms.join(', '));
    setShowModal(true);
  };

  const handleSave = () => {
    const synonymsArr = formSynonyms.split(',').map((s) => s.trim()).filter(Boolean);
    if (editingSynonym) {
      updateMutation.mutate({ id: editingSynonym.id, term: formTerm, synonyms: synonymsArr });
    } else {
      createMutation.mutate({ term: formTerm, synonyms: synonymsArr });
    }
    setShowModal(false);
  };

  const toggleActive = (syn: SearchSynonym) => {
    updateMutation.mutate({ id: syn.id, is_active: !syn.is_active });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search synonyms..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <div className="flex-1" />
        <button onClick={openCreate} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
          Add Synonym
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Term</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Synonyms</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Updated</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.data.map((syn) => (
                <tr key={syn.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{syn.term}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {syn.synonyms.map((s) => (
                        <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${syn.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {syn.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(syn.updated_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toggleActive(syn)} className="text-xs text-gray-600 hover:text-primary">
                        {syn.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => openEdit(syn)} className="text-xs text-blue-600 hover:text-blue-800">Edit</button>
                      <button onClick={() => deleteMutation.mutate(syn.id)} className="text-xs text-red-600 hover:text-red-800">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * (data.meta.limit) + 1}–{Math.min(page * data.meta.limit, data.meta.total)} of {data.meta.total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50">Prev</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.meta.totalPages} className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">{editingSynonym ? 'Edit Synonym' : 'Add Synonym'}</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Term</label>
                <input
                  type="text"
                  value={formTerm}
                  onChange={(e) => setFormTerm(e.target.value)}
                  placeholder="e.g., bigas"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Synonyms (comma-separated)</label>
                <input
                  type="text"
                  value={formSynonyms}
                  onChange={(e) => setFormSynonyms(e.target.value)}
                  placeholder="e.g., rice, kanin, sinangag"
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={!formTerm || !formSynonyms} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
                {editingSynonym ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Boost Rules Tab ─────────────────────────────────────────────────────

function BoostRulesTab() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<BoostRule | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<BoostRule['type']>('boost');
  const [formPattern, setFormPattern] = useState('');
  const [formTargetType, setFormTargetType] = useState<BoostRule['target_type']>('product');
  const [formTargetNames, setFormTargetNames] = useState('');
  const [formBoostValue, setFormBoostValue] = useState(10);

  const { data, isLoading } = useBoostRules({ page, search, type: typeFilter, is_active: statusFilter });
  const createMutation = useCreateBoostRule();
  const updateMutation = useUpdateBoostRule();
  const deleteMutation = useDeleteBoostRule();

  const openCreate = () => {
    setEditingRule(null);
    setFormName('');
    setFormType('boost');
    setFormPattern('');
    setFormTargetType('product');
    setFormTargetNames('');
    setFormBoostValue(10);
    setShowModal(true);
  };

  const openEdit = (rule: BoostRule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormType(rule.type);
    setFormPattern(rule.query_pattern);
    setFormTargetType(rule.target_type);
    setFormTargetNames(rule.target_names.join(', '));
    setFormBoostValue(rule.boost_value);
    setShowModal(true);
  };

  const handleSave = () => {
    const names = formTargetNames.split(',').map((n) => n.trim()).filter(Boolean);
    const payload = {
      name: formName,
      type: formType,
      query_pattern: formPattern,
      target_type: formTargetType,
      target_ids: names.map((_, i) => `target-${i}`),
      target_names: names,
      boost_value: formBoostValue,
      is_active: true,
      start_date: null,
      end_date: null,
    };
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
    setShowModal(false);
  };

  const toggleActive = (rule: BoostRule) => {
    updateMutation.mutate({ id: rule.id, is_active: !rule.is_active });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search rules..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">All Types</option>
          <option value="pin">Pin</option>
          <option value="boost">Boost</option>
          <option value="bury">Bury</option>
          <option value="filter">Filter</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <div className="flex-1" />
        <button onClick={openCreate} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
          Add Boost Rule
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {isLoading ? (
          <div className="py-12 text-center text-gray-500">Loading...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Pattern</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Target</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500">Boost</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.data.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{rule.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${BOOST_TYPE_COLORS[rule.type]}`}>
                      {BOOST_TYPE_LABELS[rule.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{rule.query_pattern}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-500 capitalize">{rule.target_type}</div>
                    <div className="text-sm text-gray-700">{rule.target_names.join(', ')}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-sm">{rule.boost_value > 0 ? `+${rule.boost_value}` : rule.boost_value}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${rule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toggleActive(rule)} className="text-xs text-gray-600 hover:text-primary">
                        {rule.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button onClick={() => openEdit(rule)} className="text-xs text-blue-600 hover:text-blue-800">Edit</button>
                      <button onClick={() => deleteMutation.mutate(rule.id)} className="text-xs text-red-600 hover:text-red-800">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * data.meta.limit + 1}–{Math.min(page * data.meta.limit, data.meta.total)} of {data.meta.total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50">Prev</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.meta.totalPages} className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">{editingRule ? 'Edit Boost Rule' : 'Add Boost Rule'}</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Rule name" className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Type</label>
                  <select value={formType} onChange={(e) => setFormType(e.target.value as BoostRule['type'])} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none">
                    <option value="boost">Boost</option>
                    <option value="pin">Pin</option>
                    <option value="bury">Bury</option>
                    <option value="filter">Filter</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Target Type</label>
                  <select value={formTargetType} onChange={(e) => setFormTargetType(e.target.value as BoostRule['target_type'])} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none">
                    <option value="product">Product</option>
                    <option value="category">Category</option>
                    <option value="brand">Brand</option>
                    <option value="store">Store</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Query Pattern</label>
                <input type="text" value={formPattern} onChange={(e) => setFormPattern(e.target.value)} placeholder="e.g., bigas*" className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Target Names (comma-separated)</label>
                <input type="text" value={formTargetNames} onChange={(e) => setFormTargetNames(e.target.value)} placeholder="Product/brand/category names" className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Boost Value</label>
                <input type="number" value={formBoostValue} onChange={(e) => setFormBoostValue(parseInt(e.target.value) || 0)} className="w-full rounded-lg border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={!formName || !formPattern} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
                {editingRule ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Index Health Tab ────────────────────────────────────────────────────

function IndexHealthTab() {
  const { data: indexes, isLoading } = useIndexHealth();
  const reindexMutation = useReindex();

  if (isLoading) return <div className="py-12 text-center text-gray-500">Loading index health...</div>;
  if (!indexes) return <div className="py-12 text-center text-gray-500">No data available</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {indexes.map((idx) => (
          <div key={idx.index_name} className="rounded-lg border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-mono text-sm font-semibold text-gray-900">{idx.index_name}</h4>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${INDEX_STATUS_COLORS[idx.status]}`}>
                {idx.status.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Documents</span>
                <p className="font-medium text-gray-900">{idx.doc_count.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500">Size</span>
                <p className="font-medium text-gray-900">{idx.store_size_mb} MB</p>
              </div>
              <div>
                <span className="text-gray-500">Shards</span>
                <p className="font-medium text-gray-900">{idx.primary_shards}p / {idx.replica_shards}r</p>
              </div>
              <div>
                <span className="text-gray-500">Sync Lag</span>
                <p className={`font-medium ${idx.sync_lag_seconds > 60 ? 'text-red-600' : 'text-gray-900'}`}>
                  {idx.sync_lag_seconds > 60 ? `${Math.floor(idx.sync_lag_seconds / 60)}m ${idx.sync_lag_seconds % 60}s` : `${idx.sync_lag_seconds}s`}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Pending</span>
                <p className={`font-medium ${idx.pending_docs > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>{idx.pending_docs}</p>
              </div>
              <div>
                <span className="text-gray-500">Last Synced</span>
                <p className="font-medium text-gray-900">{new Date(idx.last_synced).toLocaleTimeString()}</p>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => reindexMutation.mutate(idx.index_name)}
                disabled={reindexMutation.isPending}
                className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {reindexMutation.isPending ? 'Re-indexing...' : 'Trigger Re-index'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared Components ───────────────────────────────────────────────────

function StatCard({ title, value, change, invertColor = false }: { title: string; value: string; change: number; invertColor?: boolean }) {
  const isPositive = invertColor ? change < 0 : change > 0;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {change !== 0 && (
        <p className={`mt-1 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {change > 0 ? '+' : ''}{change}% vs last period
        </p>
      )}
    </div>
  );
}

export default SearchManagementPage;
