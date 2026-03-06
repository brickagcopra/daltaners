import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useOrder } from '@/hooks/useOrders';
import {
  useCreateReturn,
  RETURN_REASON_LABELS,
  RETURN_RESOLUTION_LABELS,
  RETURN_CONDITION_LABELS,
  type ReturnReasonCategory,
  type ReturnResolution,
  type ReturnItemCondition,
} from '@/hooks/useReturns';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface SelectedItem {
  order_item_id: string;
  product_name: string;
  quantity: number;
  max_quantity: number;
  unit_price: number;
  condition: ReturnItemCondition;
}

const REASON_OPTIONS = Object.entries(RETURN_REASON_LABELS) as [ReturnReasonCategory, string][];
const RESOLUTION_OPTIONS = Object.entries(RETURN_RESOLUTION_LABELS) as [ReturnResolution, string][];
const CONDITION_OPTIONS = Object.entries(RETURN_CONDITION_LABELS) as [ReturnItemCondition, string][];

export function CreateReturnPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading, isError } = useOrder(orderId!);
  const createReturn = useCreateReturn();

  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [reasonCategory, setReasonCategory] = useState<ReturnReasonCategory>('damaged');
  const [reasonDetails, setReasonDetails] = useState('');
  const [requestedResolution, setRequestedResolution] = useState<ReturnResolution>('refund');
  const [formError, setFormError] = useState('');

  if (isLoading) return <LoadingSpinner fullPage />;
  if (isError || !order) {
    return (
      <div className="container-app py-8">
        <EmptyState
          title="Order not found"
          description="The order you're trying to create a return for doesn't exist."
          actionLabel="Back to Orders"
          onAction={() => navigate('/orders')}
        />
      </div>
    );
  }

  const orderItems = order.items ?? [];
  const canReturn = order.status === 'delivered';

  if (!canReturn) {
    return (
      <div className="container-app py-8">
        <EmptyState
          title="Cannot create return"
          description="Returns can only be created for delivered orders."
          actionLabel="Back to Order"
          onAction={() => navigate(`/orders/${orderId}`)}
        />
      </div>
    );
  }

  const toggleItem = (item: { product_id: string; name: string; quantity: number; price: number }, itemId: string) => {
    setSelectedItems((prev) => {
      const exists = prev.find((s) => s.order_item_id === itemId);
      if (exists) {
        return prev.filter((s) => s.order_item_id !== itemId);
      }
      return [
        ...prev,
        {
          order_item_id: itemId,
          product_name: item.name,
          quantity: item.quantity,
          max_quantity: item.quantity,
          unit_price: item.price,
          condition: 'unknown' as ReturnItemCondition,
        },
      ];
    });
  };

  const updateItemQuantity = (itemId: string, qty: number) => {
    setSelectedItems((prev) =>
      prev.map((s) =>
        s.order_item_id === itemId ? { ...s, quantity: Math.max(1, Math.min(s.max_quantity, qty)) } : s,
      ),
    );
  };

  const updateItemCondition = (itemId: string, condition: ReturnItemCondition) => {
    setSelectedItems((prev) =>
      prev.map((s) => (s.order_item_id === itemId ? { ...s, condition } : s)),
    );
  };

  const totalRefund = selectedItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const handleSubmit = async () => {
    setFormError('');

    if (selectedItems.length === 0) {
      setFormError('Please select at least one item to return.');
      return;
    }
    if (!reasonDetails.trim() && reasonCategory !== 'change_of_mind') {
      setFormError('Please provide details about your return reason.');
      return;
    }

    try {
      const result = await createReturn.mutateAsync({
        order_id: orderId!,
        reason_category: reasonCategory,
        reason_details: reasonDetails || undefined,
        requested_resolution: requestedResolution,
        items: selectedItems.map((s) => ({
          order_item_id: s.order_item_id,
          quantity: s.quantity,
          condition: s.condition,
        })),
      });
      navigate(`/returns/${result.id}`);
    } catch {
      setFormError('Failed to submit return request. Please try again.');
    }
  };

  return (
    <div className="container-app py-6 max-w-3xl">
      <Link to={`/orders/${orderId}`} className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">
        &larr; Back to Order
      </Link>
      <h1 className="text-2xl font-bold mb-6">Request a Return</h1>

      {/* Step 1: Select Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>1. Select Items to Return</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orderItems.map((item) => {
              const itemId = ('id' in item) ? (item as { id: string }).id : item.product_id;
              const selected = selectedItems.find((s) => s.order_item_id === itemId);
              return (
                <div
                  key={itemId}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    selected ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                  }`}
                  onClick={() => toggleItem(item, itemId)}
                >
                  <input
                    type="checkbox"
                    checked={!!selected}
                    onChange={() => {}}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ₱{item.price.toFixed(2)} x {item.quantity}
                    </p>
                    {selected && (
                      <div className="mt-2 flex flex-wrap gap-3" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Qty to return</label>
                          <select
                            value={selected.quantity}
                            onChange={(e) => updateItemQuantity(itemId, parseInt(e.target.value))}
                            className="text-sm border rounded px-2 py-1"
                          >
                            {Array.from({ length: selected.max_quantity }, (_, i) => i + 1).map((n) => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">Condition</label>
                          <select
                            value={selected.condition}
                            onChange={(e) => updateItemCondition(itemId, e.target.value as ReturnItemCondition)}
                            className="text-sm border rounded px-2 py-1"
                          >
                            {CONDITION_OPTIONS.map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Reason */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>2. Reason for Return</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">Category</label>
              <select
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value as ReturnReasonCategory)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {REASON_OPTIONS.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1.5">
                Details {reasonCategory !== 'change_of_mind' && <span className="text-destructive">*</span>}
              </label>
              <textarea
                value={reasonDetails}
                onChange={(e) => setReasonDetails(e.target.value)}
                placeholder="Please describe the issue in detail..."
                rows={3}
                maxLength={2000}
                className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">{reasonDetails.length}/2000</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Resolution */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>3. Preferred Resolution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {RESOLUTION_OPTIONS.map(([val, label]) => (
              <button
                key={val}
                onClick={() => setRequestedResolution(val)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  requestedResolution === val
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-muted-foreground/30'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary & Submit */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">Items selected</span>
            <span className="font-medium">{selectedItems.length}</span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">Estimated refund</span>
            <span className="font-bold text-lg">
              ₱{totalRefund.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {formError && (
            <p className="text-sm text-destructive mb-4">{formError}</p>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={createReturn.isPending || selectedItems.length === 0}
          >
            {createReturn.isPending ? 'Submitting...' : 'Submit Return Request'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
