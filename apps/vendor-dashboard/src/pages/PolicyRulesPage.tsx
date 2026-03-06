import { useState } from 'react';
import {
  usePolicyRules,
  PolicyCategory,
  POLICY_CATEGORY_LABELS,
  POLICY_SEVERITY_LABELS,
  PENALTY_TYPE_LABELS,
} from '@/hooks/usePolicy';

const SEVERITY_BADGE_COLORS: Record<string, string> = {
  warning: 'bg-gray-100 text-gray-600',
  minor: 'bg-blue-100 text-blue-600',
  major: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const PENALTY_BADGE_COLORS: Record<string, string> = {
  warning: 'bg-yellow-100 text-yellow-700',
  suspension: 'bg-orange-100 text-orange-700',
  fine: 'bg-red-100 text-red-700',
  termination: 'bg-red-200 text-red-800',
};

const categoryTabs: { label: string; value: PolicyCategory | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Quality', value: 'quality' },
  { label: 'Delivery', value: 'delivery' },
  { label: 'Pricing', value: 'pricing' },
  { label: 'Listing', value: 'listing' },
  { label: 'Communication', value: 'communication' },
  { label: 'Fraud', value: 'fraud' },
  { label: 'Compliance', value: 'compliance' },
  { label: 'Safety', value: 'safety' },
  { label: 'Content', value: 'content' },
];

export function PolicyRulesPage() {
  const [activeCategory, setActiveCategory] = useState<PolicyCategory | ''>('');

  const { data: rules, isLoading } = usePolicyRules(activeCategory || undefined);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Policy Rules</h1>
        <p className="text-gray-500 mt-1">
          Review the policies and rules that apply to all vendors on the Daltaners platform
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {categoryTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveCategory(tab.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeCategory === tab.value
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      )}

      {/* Rules list */}
      {!isLoading && rules && rules.length > 0 && (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white rounded-lg border p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-gray-900">{rule.name}</h3>
                    <span className="text-xs text-gray-400 font-mono">{rule.code}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${SEVERITY_BADGE_COLORS[rule.severity] || ''}`}>
                    {POLICY_SEVERITY_LABELS[rule.severity]}
                  </span>
                  <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${PENALTY_BADGE_COLORS[rule.penaltyType] || ''}`}>
                    {PENALTY_TYPE_LABELS[rule.penaltyType]}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-500">
                <span>Category: <strong className="text-gray-700">{POLICY_CATEGORY_LABELS[rule.category]}</strong></span>
                <span>Max Violations: <strong className="text-gray-700">{rule.maxViolations}</strong></span>
                {rule.penaltyType === 'fine' && rule.penaltyValue > 0 && (
                  <span>Fine Amount: <strong className="text-gray-700">₱{rule.penaltyValue.toLocaleString()}</strong></span>
                )}
                {rule.penaltyType === 'suspension' && rule.suspensionDays > 0 && (
                  <span>Suspension: <strong className="text-gray-700">{rule.suspensionDays} days</strong></span>
                )}
                {rule.autoDetect && (
                  <span className="text-blue-600">Auto-detected by system</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!rules || rules.length === 0) && (
        <div className="bg-white rounded-lg border p-12 text-center">
          <p className="text-gray-500">No policy rules found for this category</p>
        </div>
      )}
    </div>
  );
}
