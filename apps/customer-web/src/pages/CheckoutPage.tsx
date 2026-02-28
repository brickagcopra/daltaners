import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '@/stores/cart.store';
import { useAddresses, type Address } from '@/hooks/useProfile';
import { useCreateOrder, type CreateOrderPayload } from '@/hooks/useOrders';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatPHP } from '@/components/product/PriceDisplay';
import { cn } from '@/components/ui/cn';

type DeliveryType = 'standard' | 'express' | 'scheduled';
type PaymentMethod = 'card' | 'gcash' | 'maya' | 'cod' | 'wallet';

const DELIVERY_OPTIONS: { type: DeliveryType; label: string; description: string; fee: number }[] = [
  { type: 'standard', label: 'Standard Delivery', description: 'Within 24 hours', fee: 49 },
  { type: 'express', label: 'Express Delivery', description: '2-4 hours', fee: 99 },
  { type: 'scheduled', label: 'Scheduled Delivery', description: 'Choose your time slot', fee: 39 },
];

const PAYMENT_METHODS: { method: PaymentMethod; label: string; icon: string }[] = [
  { method: 'gcash', label: 'GCash', icon: 'G' },
  { method: 'maya', label: 'Maya', icon: 'M' },
  { method: 'card', label: 'Credit/Debit Card', icon: 'C' },
  { method: 'cod', label: 'Cash on Delivery', icon: '$' },
  { method: 'wallet', label: 'Daltaners Wallet', icon: 'B' },
];

const FREE_DELIVERY_THRESHOLD = 500;

export function CheckoutPage() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const getTotal = useCartStore((s) => s.getTotal);
  const getItemsByStore = useCartStore((s) => s.getItemsByStore);
  const clearStoreItems = useCartStore((s) => s.clearStoreItems);

  const { data: addresses, isLoading: addressesLoading } = useAddresses();
  const createOrder = useCreateOrder();

  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('gcash');
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [orderError, setOrderError] = useState<string | null>(null);

  // Auto-select default address
  const defaultAddress = addresses?.find((a) => a.is_default);
  const activeAddressId = selectedAddressId || defaultAddress?.id || '';

  const itemsByStore = useMemo(() => getItemsByStore(), [items]);
  const subtotal = getTotal();
  const storeIds = Object.keys(itemsByStore);

  const deliveryOption = DELIVERY_OPTIONS.find((d) => d.type === deliveryType)!;
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : deliveryOption.fee;
  const serviceFee = Math.round(subtotal * 0.02 * 100) / 100; // 2% service fee
  const discount = couponApplied ? Math.min(subtotal * 0.1, 100) : 0; // 10% up to 100
  const totalAmount = subtotal + deliveryFee + serviceFee - discount;

  if (items.length === 0) {
    return (
      <div className="container-app py-8">
        <EmptyState
          title="Your cart is empty"
          description="Add some items to your cart before checking out."
          actionLabel="Browse stores"
          onAction={() => navigate('/search')}
        />
      </div>
    );
  }

  const handleApplyCoupon = () => {
    if (couponCode.trim().length > 0) {
      setCouponApplied(true);
    }
  };

  const handlePlaceOrder = async () => {
    if (!activeAddressId) {
      setOrderError('Please select a delivery address.');
      return;
    }

    setOrderError(null);

    // Create one order per store
    for (const storeId of storeIds) {
      const storeItems = itemsByStore[storeId];
      const payload: CreateOrderPayload = {
        store_id: storeId,
        items: storeItems.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
        })),
        delivery_address_id: activeAddressId,
        delivery_type: deliveryType,
        payment_method: paymentMethod,
        notes: notes || undefined,
        scheduled_at:
          deliveryType === 'scheduled' && scheduledDate && scheduledTime
            ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
            : undefined,
      };

      try {
        await createOrder.mutateAsync(payload);
        clearStoreItems(storeId);
      } catch {
        setOrderError('Failed to place order. Please try again.');
        return;
      }
    }

    navigate('/orders');
  };

  return (
    <div className="container-app py-6">
      <div className="mb-6">
        <Link to="/cart" className="text-sm text-primary hover:underline">
          &larr; Back to cart
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Checkout</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Checkout Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  1
                </span>
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              {addressesLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner />
                </div>
              ) : addresses && addresses.length > 0 ? (
                <div className="space-y-3">
                  {addresses.map((addr: Address) => (
                    <label
                      key={addr.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
                        activeAddressId === addr.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/40',
                      )}
                    >
                      <input
                        type="radio"
                        name="address"
                        value={addr.id}
                        checked={activeAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="mt-1 accent-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {addr.label}
                          </span>
                          {addr.is_default && (
                            <Badge variant="muted">Default</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {addr.address_line_1}
                          {addr.address_line_2 ? `, ${addr.address_line_2}` : ''}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {addr.city}, {addr.province} {addr.postal_code}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {addr.contact_name} &middot; {addr.contact_phone}
                        </p>
                      </div>
                    </label>
                  ))}
                  <Link
                    to="/profile"
                    className="inline-block text-sm text-primary hover:underline"
                  >
                    + Add new address
                  </Link>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-3">
                    No saved addresses found.
                  </p>
                  <Link to="/profile">
                    <Button variant="outline" size="sm">
                      Add an address
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  2
                </span>
                Delivery Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DELIVERY_OPTIONS.map((option) => (
                  <label
                    key={option.type}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors',
                      deliveryType === option.type
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="delivery"
                        value={option.type}
                        checked={deliveryType === option.type}
                        onChange={() => setDeliveryType(option.type)}
                        className="accent-primary"
                      />
                      <div>
                        <span className="text-sm font-semibold text-foreground">
                          {option.label}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {subtotal >= FREE_DELIVERY_THRESHOLD ? (
                        <span className="text-success">Free</span>
                      ) : (
                        formatPHP(option.fee)
                      )}
                    </span>
                  </label>
                ))}
              </div>

              {deliveryType === 'scheduled' && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <Input
                    label="Time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              )}

              {subtotal >= FREE_DELIVERY_THRESHOLD && (
                <p className="mt-3 text-xs text-success font-medium">
                  You qualify for free delivery on orders over {formatPHP(FREE_DELIVERY_THRESHOLD)}!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  3
                </span>
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {PAYMENT_METHODS.map((pm) => (
                  <label
                    key={pm.method}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors',
                      paymentMethod === pm.method
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40',
                    )}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={pm.method}
                      checked={paymentMethod === pm.method}
                      onChange={() => setPaymentMethod(pm.method)}
                      className="accent-primary"
                    />
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-bold text-foreground">
                        {pm.icon}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {pm.label}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  4
                </span>
                Additional Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any special instructions for your order or delivery..."
                rows={3}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(itemsByStore).map(([storeId, storeItems]) => (
                    <div key={storeId}>
                      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                        Store ({storeItems.length} {storeItems.length === 1 ? 'item' : 'items'})
                      </p>
                      <div className="space-y-2">
                        {storeItems.map((item) => (
                          <div
                            key={`${item.product_id}-${item.variant_id || ''}`}
                            className="flex items-center gap-3"
                          >
                            <img
                              src={item.image_url || '/placeholder-product.png'}
                              alt={item.name}
                              className="h-10 w-10 rounded-md border border-border object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm text-foreground">{item.name}</p>
                              <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {formatPHP(item.price * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Coupon */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-2">
                  <Input
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      setCouponApplied(false);
                    }}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={!couponCode.trim() || couponApplied}
                  >
                    {couponApplied ? 'Applied' : 'Apply'}
                  </Button>
                </div>
                {couponApplied && (
                  <p className="mt-2 text-xs text-success font-medium">
                    Coupon applied! You saved {formatPHP(discount)}.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Price Breakdown */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatPHP(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    {deliveryFee === 0 ? (
                      <span className="font-medium text-success">Free</span>
                    ) : (
                      <span className="font-medium">{formatPHP(deliveryFee)}</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Service Fee</span>
                    <span className="font-medium">{formatPHP(serviceFee)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Discount</span>
                      <span className="font-medium">-{formatPHP(discount)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-3 mt-3">
                    <div className="flex justify-between text-base font-bold">
                      <span>Total</span>
                      <span className="text-primary">{formatPHP(totalAmount)}</span>
                    </div>
                  </div>
                </div>

                {orderError && (
                  <p className="mt-3 text-xs text-destructive">{orderError}</p>
                )}

                <Button
                  size="lg"
                  className="mt-4 w-full"
                  onClick={handlePlaceOrder}
                  isLoading={createOrder.isPending}
                  disabled={!activeAddressId || createOrder.isPending}
                >
                  Place Order &middot; {formatPHP(totalAmount)}
                </Button>

                <p className="mt-3 text-center text-xs text-muted-foreground">
                  By placing this order, you agree to our Terms of Service and Privacy Policy.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
