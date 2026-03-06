import { Link } from 'react-router-dom';

interface PendingAction {
  label: string;
  count: number;
  path: string;
  color: string;
  bgColor: string;
}

interface PendingActionsWidgetProps {
  pendingVendors: number;
  openDisputes: number;
  pendingReturns: number;
  pendingProducts: number;
}

export function PendingActionsWidget({
  pendingVendors,
  openDisputes,
  pendingReturns,
  pendingProducts,
}: PendingActionsWidgetProps) {
  const actions: PendingAction[] = [
    {
      label: 'Vendor Approvals',
      count: pendingVendors,
      path: '/vendors?status=pending',
      color: 'text-amber-700',
      bgColor: 'bg-amber-50 border-amber-200',
    },
    {
      label: 'Open Disputes',
      count: openDisputes,
      path: '/disputes?status=open',
      color: 'text-red-700',
      bgColor: 'bg-red-50 border-red-200',
    },
    {
      label: 'Pending Returns',
      count: pendingReturns,
      path: '/returns?status=pending',
      color: 'text-blue-700',
      bgColor: 'bg-blue-50 border-blue-200',
    },
    {
      label: 'Products to Review',
      count: pendingProducts,
      path: '/products?status=pending_review',
      color: 'text-purple-700',
      bgColor: 'bg-purple-50 border-purple-200',
    },
  ];

  const totalPending = actions.reduce((sum, a) => sum + a.count, 0);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Pending Actions</h3>
        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
          {totalPending} total
        </span>
      </div>

      <div className="space-y-3">
        {actions.map((action) => (
          <Link
            key={action.label}
            to={action.path}
            className={`flex items-center justify-between rounded-lg border p-3 transition-colors hover:opacity-80 ${action.bgColor}`}
          >
            <span className={`text-sm font-medium ${action.color}`}>{action.label}</span>
            <span className={`text-lg font-bold ${action.color}`}>{action.count}</span>
          </Link>
        ))}
      </div>

      {totalPending === 0 && (
        <p className="py-4 text-center text-sm text-gray-500">All caught up!</p>
      )}
    </div>
  );
}
