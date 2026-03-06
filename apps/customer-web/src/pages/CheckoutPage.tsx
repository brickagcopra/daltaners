import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '@/stores/cart.store';
import { useAddresses, type Address } from '@/hooks/useProfile';
import { useCreateOrder, useValidateCoupon, type CreateOrderPayload, type CouponValidationResult } from '@/hooks/useOrders';
import { useStore, type OperatingHours } from '@/hooks/useStores';
import { useLoyaltyAccount } from '@/hooks/useLoyalty';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatPHP } from '@/components/product/PriceDisplay';
import { cn } from '@/components/ui/cn';

type OrderType = 'delivery' | 'pickup';
type DeliveryType = 'standard' | 'express' | 'scheduled';
type PaymentMethod = 'card' | 'gcash' | 'maya' | 'cod' | 'wallet';

function getPickupDates(): { value: string; label: string }[] {
  const dates: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 3; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const value = d.toISOString().split('T')[0];
    const label =
      i === 0
        ? 'Today'
        : i === 1
          ? 'Tomorrow'
          : d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
    dates.push({ value, label });
  }
  return dates;
}

function getPickupTimeSlots(hours: OperatingHours[], dateStr: string): string[] {
  const date = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = date.getDay();
  const dayHours = hours.find((h) => h.day_of_week === dayOfWeek);
  if (!dayHours || dayHours.is_closed) return [];

  const [openH, openM] = dayHours.open_time.split(':').map(Number);
  const [closeH, closeM] = dayHours.close_time.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  const slots: string[] = [];
  const now = new Date();
  const isToday = dateStr === now.toISOString().split('T')[0];
  const currentMinutes = isToday ? now.getHours() * 60 + now.getMinutes() : 0;

  // Start from open time (or current time + 30min rounding up for today)
  let start = openMinutes;
  if (isToday) {
    const earliest = currentMinutes + 30;
    start = Math.max(start, Math.ceil(earliest / 30) * 30);
  }

  // Last slot is 30 min before close
  for (let m = start; m <= closeMinutes - 30; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
  }
  return slots;
}

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

  const [orderType, setOrderType] = useState<OrderType>('delivery');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('standard');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('gcash');
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [orderError, setOrderError] = useState<string | null>(null);
  const [loyaltyPointsToUse, setLoyaltyPointsToUse] = useState(0);
  const validateCoupon = useValidateCoupon();
  const { data: loyaltyAccount } = useLoyaltyAccount();

  // Auto-select default address
  const defaultAddress = addresses?.find((a) => a.is_default);
  const activeAddressId = selectedAddressId || defaultAddress?.id || '';

  const itemsByStore = useMemo(() => getItemsByStore(), [items]);
  const subtotal = getTotal();
  const storeIds = Object.keys(itemsByStore);
  const isSingleStore = storeIds.length === 1;
  const canPickup = isSingleStore;

  // Fetch store data for pickup (only when single store)
  const singleStoreId = isSingleStore ? storeIds[0] : '';
  const { data: storeData } = useStore(singleStoreId);

  const isPickup = orderType === 'pickup';
  const pickupDates = useMemo(() => getPickupDates(), []);
  const pickupTimeSlots = useMemo(
    () =>
      isPickup && pickupDate && storeData?.operating_hours
        ? getPickupTimeSlots(storeData.operating_hours, pickupDate)
        : [],
    [isPickup, pickupDate, storeData?.operating_hours],
  );

  const deliveryOption = DELIVERY_OPTIONS.find((d) => d.type === deliveryType)!;
  const baseDeliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : deliveryOption.fee;
  const serviceFee = Math.round(subtotal * 0.02 * 100) / 100; // 2% service fee
  const discount = couponResult?.discount_amount ?? 0;
  const isFreeDelivery = couponResult?.discount_type === 'free_delivery';
  const deliveryFee = isPickup ? 0 : isFreeDelivery ? 0 : baseDeliveryFee;
  const loyaltyDiscount = loyaltyPointsToUse * 0.5; // 1 point = P0.50
  const totalAmount = Math.max(0, subtotal + deliveryFee + serviceFee - discount - loyaltyDiscount);

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

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError(null);
    setCouponResult(null);

    try {
      const result = await validateCoupon.mutateAsync({
        code: couponCode.trim().toUpperCase(),
        subtotal,
        store_id: storeIds.length === 1 ? storeIds[0] : undefined,
      });
      if (result.valid) {
        setCouponResult(result);
      } else {
        setCouponError(result.message || 'This coupon is not valid.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid coupon code';
      setCouponError(msg);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponResult(null);
    setCouponError(null);
  };

  const handlePlaceOrder = async () => {
    if (isPickup) {
      if (!pickupDate || !pickupTime) {
        setOrderError('Please select a pickup date and time.');
        return;
      }
    } else {
      if (!activeAddressId) {
        setOrderError('Please select a delivery address.');
        return;
      }
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
        order_type: orderType,
        delivery_address_id: isPickup ? null : activeAddressId,
        delivery_type: deliveryType,
        payment_method: paymentMethod,
        notes: notes || undefined,
        scheduled_at: isPickup
          ? new Date(`${pickupDate}T${pickupTime}`).toISOString()
          : deliveryType === 'scheduled' && scheduledDate && scheduledTime
            ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
            : undefined,
        coupon_code: couponResult ? couponResult.coupon_code : undefined,
        loyalty_points_used: loyaltyPointsToUse > 0 ? loyaltyPointsToUse : undefined,
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
          {/* Order Type Toggle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  1
                </span>
                Order Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setOrderType('delivery')}
                  className={cn(
                    'flex-1 rounded-lg border p-4 text-center transition-colors',
                    orderType === 'delivery'
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  <span className="block text-lg">&#128666;</span>
                  <span className="mt-1 block text-sm font-semibold text-foreground">Delivery</span>
                  <span className="block text-xs text-muted-foreground">Delivered to your door</span>
                </button>
                <button
                  type="button"
                  onClick={() => canPickup && setOrderType('pickup')}
                  disabled={!canPickup}
                  className={cn(
                    'flex-1 rounded-lg border p-4 text-center transition-colors',
                    !canPickup && 'cursor-not-allowed opacity-50',
                    orderType === 'pickup'
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/40',
                  )}
                >
                  <span className="block text-lg">&#127978;</span>
                  <span className="mt-1 block text-sm font-semibold text-foreground">In-Store Pickup</span>
                  <span className="block text-xs text-muted-foreground">
                    {canPickup ? 'Pick up at the store' : 'Single-store orders only'}
                  </span>
                </button>
              </div>
              {!canPickup && (
                <p className="mt-2 text-xs text-muted-foreground">
                  In-store pickup is only available for single-store orders. Your cart has items from {storeIds.length} stores.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Delivery Address (hidden for pickup) */}
          {!isPickup && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    2
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
          )}

          {/* Pickup Details (shown only for pickup) */}
          {isPickup && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    2
                  </span>
                  Pickup Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Store Location */}
                {storeData && (
                  <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Pickup Location</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{storeData.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {storeData.location?.address || storeData.address}
                    </p>
                  </div>
                )}

                {/* Pickup Date */}
                <div className="mb-4">
                  <p className="mb-2 text-sm font-medium text-foreground">Select Pickup Date</p>
                  <div className="flex gap-2">
                    {pickupDates.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => { setPickupDate(d.value); setPickupTime(''); }}
                        className={cn(
                          'flex-1 rounded-lg border px-3 py-2.5 text-center transition-colors',
                          pickupDate === d.value
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/40',
                        )}
                      >
                        <span className="block text-sm font-semibold text-foreground">{d.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {new Date(d.value + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pickup Time */}
                {pickupDate && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground">Select Pickup Time</p>
                    {pickupTimeSlots.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {pickupTimeSlots.map((slot) => {
                          const [h, m] = slot.split(':').map(Number);
                          const period = h >= 12 ? 'PM' : 'AM';
                          const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
                          const display = `${displayH}:${String(m).padStart(2, '0')} ${period}`;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setPickupTime(slot)}
                              className={cn(
                                'rounded-md border px-2 py-2 text-sm transition-colors',
                                pickupTime === slot
                                  ? 'border-primary bg-primary/5 font-semibold text-primary ring-2 ring-primary/20'
                                  : 'border-border text-foreground hover:border-primary/40',
                              )}
                            >
                              {display}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No available time slots for this date. The store may be closed.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Delivery Type (hidden for pickup) */}
          {!isPickup && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    3
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
          )}

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {isPickup ? 3 : 4}
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

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {isPickup ? 4 : 5}
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
                {couponResult ? (
                  <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/5 p-3">
                    <div>
                      <p className="text-sm font-semibold text-success">
                        {couponResult.coupon_code}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {couponResult.discount_type === 'free_delivery'
                          ? 'Free delivery applied'
                          : `You save ${formatPHP(couponResult.discount_amount)}`}
                      </p>
                    </div>
                    <button
                      onClick={handleRemoveCoupon}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Coupon code"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase());
                          setCouponError(null);
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim() || validateCoupon.isPending}
                        isLoading={validateCoupon.isPending}
                      >
                        Apply
                      </Button>
                    </div>
                    {couponError && (
                      <p className="mt-2 text-xs text-destructive">{couponError}</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Loyalty Points */}
            {loyaltyAccount && loyaltyAccount.is_active && loyaltyAccount.points_balance > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Use Loyalty Points</p>
                      <p className="text-xs text-muted-foreground">
                        Available: {loyaltyAccount.points_balance.toLocaleString()} pts (P{(loyaltyAccount.points_balance * 0.5).toLocaleString('en-PH', { minimumFractionDigits: 2 })})
                      </p>
                    </div>
                    <Badge variant="muted" className="capitalize">{loyaltyAccount.tier}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max={loyaltyAccount.points_balance}
                      value={loyaltyPointsToUse || ''}
                      onChange={(e) => {
                        const val = Math.min(
                          Math.max(0, parseInt(e.target.value) || 0),
                          loyaltyAccount.points_balance,
                        );
                        setLoyaltyPointsToUse(val);
                      }}
                      placeholder="Points to use"
                      className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLoyaltyPointsToUse(loyaltyAccount.points_balance)}
                    >
                      Use All
                    </Button>
                    {loyaltyPointsToUse > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLoyaltyPointsToUse(0)}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {loyaltyPointsToUse > 0 && (
                    <p className="mt-2 text-xs text-success font-medium">
                      Discount: {formatPHP(loyaltyPointsToUse * 0.5)} ({loyaltyPointsToUse} points)
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Price Breakdown */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatPHP(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {isPickup ? 'Delivery Fee' : 'Delivery Fee'}
                    </span>
                    {deliveryFee === 0 ? (
                      <span className="font-medium text-success">
                        {isPickup ? 'Free (pickup)' : isFreeDelivery ? 'Free (coupon)' : 'Free'}
                      </span>
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
                      <span>Coupon Discount</span>
                      <span className="font-medium">-{formatPHP(discount)}</span>
                    </div>
                  )}
                  {loyaltyDiscount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Loyalty Points</span>
                      <span className="font-medium">-{formatPHP(loyaltyDiscount)}</span>
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
                  disabled={
                    createOrder.isPending ||
                    (isPickup ? !pickupDate || !pickupTime : !activeAddressId)
                  }
                >
                  {isPickup ? 'Schedule Pickup' : 'Place Order'} &middot; {formatPHP(totalAmount)}
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
