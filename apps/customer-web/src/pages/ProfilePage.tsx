import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useProfile,
  useUpdateProfile,
  useAddresses,
  useCreateAddress,
  useDeleteAddress,
  type Address,
  type CreateAddressPayload,
} from '@/hooks/useProfile';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { cn } from '@/components/ui/cn';

type Tab = 'profile' | 'addresses';

export function ProfilePage() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  return (
    <div className="container-app py-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">My Account</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-muted p-1">
        {([
          { key: 'profile', label: 'Profile' },
          { key: 'addresses', label: 'Addresses' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-white text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' ? <ProfileSection /> : <AddressSection />}

      {/* Logout */}
      <div className="mt-8 border-t border-border pt-6">
        <Button
          variant="outline"
          className="text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Log out
        </Button>
      </div>
    </div>
  );
}

function ProfileSection() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  if (isLoading) return <LoadingSpinner fullPage />;
  if (!profile) return null;

  const startEditing = () => {
    setFirstName(profile.first_name);
    setLastName(profile.last_name);
    setEmail(profile.email || '');
    setPhone(profile.phone || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    await updateProfile.mutateAsync({
      first_name: firstName,
      last_name: lastName,
      email: email || undefined,
      phone: phone || undefined,
    });
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Personal Information</CardTitle>
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={startEditing}>
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Input
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div className="flex gap-3">
              <Button onClick={handleSave} isLoading={updateProfile.isPending}>
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <span className="text-xl font-bold">
                  {profile.first_name[0]}{profile.last_name[0]}
                </span>
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {profile.first_name} {profile.last_name}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant={profile.is_verified ? 'success' : 'warning'}>
                    {profile.is_verified ? 'Verified' : 'Unverified'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Email</p>
                <p className="mt-0.5 text-sm text-foreground">{profile.email || 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Phone</p>
                <p className="mt-0.5 text-sm text-foreground">{profile.phone || 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Member Since</p>
                <p className="mt-0.5 text-sm text-foreground">
                  {new Date(profile.created_at).toLocaleDateString('en-PH', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddressSection() {
  const { data: addresses, isLoading } = useAddresses();
  const createAddress = useCreateAddress();
  const deleteAddress = useDeleteAddress();
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // New address form state
  const [form, setForm] = useState<CreateAddressPayload>({
    label: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    province: '',
    postal_code: '',
    lat: 14.5995, // Default Metro Manila
    lng: 120.9842,
    is_default: false,
    contact_name: '',
    contact_phone: '',
    instructions: '',
  });

  const updateForm = (field: keyof CreateAddressPayload, value: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm({
      label: '', address_line_1: '', address_line_2: '', city: '', province: '',
      postal_code: '', lat: 14.5995, lng: 120.9842, is_default: false,
      contact_name: '', contact_phone: '', instructions: '',
    });
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!form.label || !form.address_line_1 || !form.city || !form.province || !form.contact_name || !form.contact_phone) {
      return;
    }
    await createAddress.mutateAsync(form);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteAddress.mutateAsync(id);
    setDeleteConfirm(null);
  };

  if (isLoading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {addresses?.length || 0} saved address{(addresses?.length || 0) !== 1 ? 'es' : ''}
        </p>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            + Add Address
          </Button>
        )}
      </div>

      {/* Add Address Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                label="Label (e.g. Home, Office)"
                value={form.label}
                onChange={(e) => updateForm('label', e.target.value)}
                placeholder="Home"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Contact Name"
                  value={form.contact_name}
                  onChange={(e) => updateForm('contact_name', e.target.value)}
                />
                <Input
                  label="Contact Phone"
                  type="tel"
                  value={form.contact_phone}
                  onChange={(e) => updateForm('contact_phone', e.target.value)}
                  placeholder="+63"
                />
              </div>
              <Input
                label="Address Line 1"
                value={form.address_line_1}
                onChange={(e) => updateForm('address_line_1', e.target.value)}
                placeholder="House/Unit number, Street"
              />
              <Input
                label="Address Line 2 (optional)"
                value={form.address_line_2 || ''}
                onChange={(e) => updateForm('address_line_2', e.target.value)}
                placeholder="Barangay, Building, Floor"
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  label="City"
                  value={form.city}
                  onChange={(e) => updateForm('city', e.target.value)}
                />
                <Input
                  label="Province"
                  value={form.province}
                  onChange={(e) => updateForm('province', e.target.value)}
                />
                <Input
                  label="Postal Code"
                  value={form.postal_code}
                  onChange={(e) => updateForm('postal_code', e.target.value)}
                />
              </div>
              <Input
                label="Delivery Instructions (optional)"
                value={form.instructions || ''}
                onChange={(e) => updateForm('instructions', e.target.value)}
                placeholder="Gate code, landmarks, etc."
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_default || false}
                  onChange={(e) => updateForm('is_default', e.target.checked)}
                  className="accent-primary"
                />
                Set as default address
              </label>
              <div className="flex gap-3">
                <Button onClick={handleCreate} isLoading={createAddress.isPending}>
                  Save Address
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Address List */}
      {addresses && addresses.length > 0 ? (
        addresses.map((addr: Address) => (
          <Card key={addr.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground">{addr.label}</p>
                    {addr.is_default && <Badge variant="muted">Default</Badge>}
                  </div>
                  <p className="text-sm text-foreground">
                    {addr.address_line_1}
                    {addr.address_line_2 ? `, ${addr.address_line_2}` : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {addr.city}, {addr.province} {addr.postal_code}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {addr.contact_name} &middot; {addr.contact_phone}
                  </p>
                  {addr.instructions && (
                    <p className="mt-1 text-xs text-muted-foreground italic">
                      Note: {addr.instructions}
                    </p>
                  )}
                </div>

                <div>
                  {deleteConfirm === addr.id ? (
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(addr.id)}
                        isLoading={deleteAddress.isPending}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteConfirm(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteConfirm(addr.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        !showForm && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                No addresses saved yet.
              </p>
              <Button size="sm" onClick={() => setShowForm(true)}>
                Add your first address
              </Button>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
