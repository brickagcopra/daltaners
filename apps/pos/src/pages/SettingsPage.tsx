import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, EmptyTable } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { useTerminals, useCreateTerminal, useUpdateTerminal } from '@/hooks/useTerminals';
import { useAuthStore } from '@/stores/auth.store';
import { useTerminalStore } from '@/stores/terminal.store';
import { formatDateTime } from '@/lib/format';
import type { Terminal } from '@/types/pos';

const SETTINGS_TABS = [
  { id: 'terminals', label: 'Terminals' },
  { id: 'receipt', label: 'Receipt' },
  { id: 'preferences', label: 'Preferences' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' },
];

const PAPER_WIDTH_OPTIONS = [
  { value: '58', label: '58mm (Small)' },
  { value: '80', label: '80mm (Standard)' },
];

const CURRENCY_OPTIONS = [
  { value: 'PHP', label: 'PHP - Philippine Peso' },
  { value: 'USD', label: 'USD - US Dollar' },
];

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark (Default)' },
  { value: 'light', label: 'Light' },
];

const AUTO_LOCK_OPTIONS = [
  { value: '0', label: 'Never' },
  { value: '1', label: '1 minute' },
  { value: '5', label: '5 minutes' },
  { value: '10', label: '10 minutes' },
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'gcash', label: 'GCash' },
  { value: 'maya', label: 'Maya' },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('terminals');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-pos-border flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Terminal configuration and preferences</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-4 flex-shrink-0">
        <Tabs tabs={SETTINGS_TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {activeTab === 'terminals' && <TerminalsView />}
        {activeTab === 'receipt' && <ReceiptSettingsView />}
        {activeTab === 'preferences' && <PreferencesView />}
      </div>
    </div>
  );
}

/* ---- Terminals Management ---- */
function TerminalsView() {
  const user = useAuthStore((s) => s.user);
  const storeId = user?.vendorId;
  const { data: terminals, isLoading } = useTerminals(storeId);
  const activeTerminal = useTerminalStore((s) => s.activeTerminal);
  const [showCreate, setShowCreate] = useState(false);
  const [editTerminal, setEditTerminal] = useState<Terminal | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Registered Terminals</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          + Add Terminal
        </Button>
      </div>

      <Card padding="none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Last Heartbeat</TableHead>
              <TableHead>Current</TableHead>
              <TableHead align="right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">Loading...</td>
              </tr>
            ) : terminals && terminals.length > 0 ? (
              terminals.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <span className="text-white font-medium">{t.name}</span>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-pos-surface px-2 py-0.5 rounded text-gray-300">{t.terminal_code}</code>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      t.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : t.status === 'maintenance'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {t.status}
                    </span>
                  </TableCell>
                  <TableCell>{t.ip_address || '—'}</TableCell>
                  <TableCell>{t.last_heartbeat_at ? formatDateTime(t.last_heartbeat_at) : '—'}</TableCell>
                  <TableCell>
                    {activeTerminal?.id === t.id && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-500/20 text-primary-400">
                        Active
                      </span>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Button variant="ghost" size="sm" onClick={() => setEditTerminal(t)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <EmptyTable colSpan={7} message="No terminals registered. Add one to get started." />
            )}
          </TableBody>
        </Table>
      </Card>

      <CreateTerminalModal open={showCreate} storeId={storeId!} onClose={() => setShowCreate(false)} />
      <EditTerminalModal open={!!editTerminal} terminal={editTerminal} onClose={() => setEditTerminal(null)} />
    </div>
  );
}

function CreateTerminalModal({ open, storeId, onClose }: { open: boolean; storeId: string; onClose: () => void }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [ip, setIp] = useState('');
  const createMutation = useCreateTerminal();

  const handleSubmit = () => {
    if (!name.trim() || !code.trim()) return;
    createMutation.mutate(
      { store_id: storeId, name: name.trim(), terminal_code: code.trim(), ip_address: ip.trim() || undefined },
      {
        onSuccess: () => {
          setName('');
          setCode('');
          setIp('');
          onClose();
        },
      },
    );
  };

  return (
    <Modal open={open} title="Add Terminal" onClose={onClose} size="md">
      <div className="space-y-4">
        <Input label="Terminal Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Counter" />
        <Input label="Terminal Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. T-001" />
        <Input label="IP Address (optional)" value={ip} onChange={(e) => setIp(e.target.value)} placeholder="e.g. 192.168.1.100" />
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} loading={createMutation.isPending} disabled={!name.trim() || !code.trim()}>
          Create Terminal
        </Button>
      </div>
    </Modal>
  );
}

function EditTerminalModal({ open, terminal, onClose }: { open: boolean; terminal: Terminal | null; onClose: () => void }) {
  const [name, setName] = useState(terminal?.name ?? '');
  const [status, setStatus] = useState(terminal?.status ?? 'active');
  const [ip, setIp] = useState(terminal?.ip_address ?? '');
  const updateMutation = useUpdateTerminal();

  // Sync state when terminal changes
  if (terminal && name === '' && terminal.name !== '') {
    setName(terminal.name);
    setStatus(terminal.status);
    setIp(terminal.ip_address ?? '');
  }

  const handleSubmit = () => {
    if (!terminal || !name.trim()) return;
    updateMutation.mutate(
      { id: terminal.id, name: name.trim(), status, ip_address: ip.trim() || undefined },
      {
        onSuccess: () => {
          setName('');
          onClose();
        },
      },
    );
  };

  return (
    <Modal open={open} title="Edit Terminal" onClose={onClose} size="md">
      <div className="space-y-4">
        <Input label="Terminal Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as Terminal['status'])}
          options={STATUS_OPTIONS}
        />
        <Input label="IP Address" value={ip} onChange={(e) => setIp(e.target.value)} placeholder="192.168.1.100" />
        {terminal && (
          <div className="text-xs text-gray-500">
            <p>Terminal Code: <code className="text-gray-400">{terminal.terminal_code}</code></p>
            <p>Created: {formatDateTime(terminal.created_at)}</p>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} loading={updateMutation.isPending} disabled={!name.trim()}>
          Save Changes
        </Button>
      </div>
    </Modal>
  );
}

/* ---- Receipt Settings ---- */
function ReceiptSettingsView() {
  const [storeName, setStoreName] = useState('Daltaners Store');
  const [storeAddress, setStoreAddress] = useState('123 Main St, Manila, Philippines');
  const [storePhone, setStorePhone] = useState('+63 912 345 6789');
  const [tinNumber, setTinNumber] = useState('000-000-000-000');
  const [footerMessage, setFooterMessage] = useState('Thank you for shopping with us!');
  const [showBarcode, setShowBarcode] = useState(true);
  const [paperWidth, setPaperWidth] = useState('80');

  return (
    <div className="max-w-2xl space-y-6">
      <Card padding="lg">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Store Information (Receipt Header)</h3>
        <div className="space-y-4">
          <Input label="Store Name" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          <Input label="Store Address" value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} />
          <Input label="Phone Number" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} />
          <Input label="TIN Number" value={tinNumber} onChange={(e) => setTinNumber(e.target.value)} placeholder="BIR Tax Identification Number" />
        </div>
      </Card>

      <Card padding="lg">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Receipt Options</h3>
        <div className="space-y-4">
          <Input label="Footer Message" value={footerMessage} onChange={(e) => setFooterMessage(e.target.value)} />
          <Select
            label="Paper Width"
            value={paperWidth}
            onChange={(e) => setPaperWidth(e.target.value)}
            options={PAPER_WIDTH_OPTIONS}
          />
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showBarcode}
              onChange={(e) => setShowBarcode(e.target.checked)}
              className="w-4 h-4 rounded border-pos-border bg-pos-surface text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-300">Show barcode on receipt</span>
          </label>
        </div>
      </Card>

      {/* Receipt Preview */}
      <Card padding="lg">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Preview</h3>
        <div className="bg-white text-black p-4 rounded-lg font-mono text-xs leading-relaxed max-w-[280px] mx-auto">
          <div className="text-center space-y-0.5">
            <p className="font-bold text-sm">{storeName}</p>
            <p>{storeAddress}</p>
            <p>{storePhone}</p>
            {tinNumber && <p>TIN: {tinNumber}</p>}
          </div>
          <p className="border-t border-dashed border-gray-400 my-2" />
          <p>TX#: POS-20260302-000001</p>
          <p>Date: Mar 2, 2026 10:30 AM</p>
          <p>Cashier: Maria Santos</p>
          <p className="border-t border-dashed border-gray-400 my-2" />
          <div className="flex justify-between"><span>Lucky Me! Pancit x2</span><span>60.00</span></div>
          <div className="flex justify-between"><span>Argentina Corned Beef</span><span>85.00</span></div>
          <div className="flex justify-between"><span>Coca-Cola 1.5L</span><span>75.00</span></div>
          <p className="border-t border-dashed border-gray-400 my-2" />
          <div className="flex justify-between"><span>Subtotal:</span><span>220.00</span></div>
          <div className="flex justify-between"><span>VAT (12%):</span><span>23.57</span></div>
          <div className="flex justify-between font-bold"><span>TOTAL:</span><span>220.00</span></div>
          <div className="flex justify-between"><span>Cash:</span><span>250.00</span></div>
          <div className="flex justify-between"><span>Change:</span><span>30.00</span></div>
          <p className="border-t border-dashed border-gray-400 my-2" />
          <p className="text-center">Items: 3</p>
          {showBarcode && <p className="text-center mt-1">||||| ||||| ||||| |||||</p>}
          <p className="text-center mt-1">{footerMessage}</p>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button>Save Receipt Settings</Button>
      </div>
    </div>
  );
}

/* ---- Preferences ---- */
function PreferencesView() {
  const [taxRate, setTaxRate] = useState('12');
  const [currency, setCurrency] = useState('PHP');
  const [theme, setTheme] = useState('dark');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoLock, setAutoLock] = useState('5');
  const [quickPayDefault, setQuickPayDefault] = useState('cash');

  return (
    <div className="max-w-2xl space-y-6">
      <Card padding="lg">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Tax Configuration</h3>
        <div className="space-y-4">
          <Input
            label="VAT Rate (%)"
            type="number"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            placeholder="12"
          />
          <Select
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={CURRENCY_OPTIONS}
          />
        </div>
      </Card>

      <Card padding="lg">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Display & Interface</h3>
        <div className="space-y-4">
          <Select
            label="Theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            options={THEME_OPTIONS}
          />
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={(e) => setSoundEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-pos-border bg-pos-surface text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-300">Enable sound effects (transaction complete, new order)</span>
          </label>
          <Select
            label="Auto-lock Timeout"
            value={autoLock}
            onChange={(e) => setAutoLock(e.target.value)}
            options={AUTO_LOCK_OPTIONS}
          />
        </div>
      </Card>

      <Card padding="lg">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Transaction Defaults</h3>
        <div className="space-y-4">
          <Select
            label="Default Payment Method"
            value={quickPayDefault}
            onChange={(e) => setQuickPayDefault(e.target.value)}
            options={PAYMENT_METHOD_OPTIONS}
          />
        </div>
      </Card>

      <Card padding="lg">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Keyboard Shortcuts</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'F1', action: 'New Transaction' },
            { key: 'F2', action: 'Quick Pay' },
            { key: 'F3', action: 'Hold Order' },
            { key: 'F4', action: 'Recall Order' },
            { key: 'F5', action: 'Search Product' },
            { key: 'F6', action: 'Apply Discount' },
            { key: 'F7', action: 'Clear Cart' },
            { key: 'F8', action: 'Void Transaction' },
            { key: 'F9', action: 'POS Terminal' },
            { key: 'F10', action: 'Shifts' },
            { key: 'F11', action: 'Transactions' },
            { key: 'F12', action: 'Reports' },
          ].map((s) => (
            <div key={s.key} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-gray-400">{s.action}</span>
              <kbd className="px-2 py-0.5 bg-pos-surface border border-pos-border rounded text-xs text-gray-300 font-mono">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button>Save Preferences</Button>
      </div>
    </div>
  );
}
