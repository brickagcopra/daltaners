import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  useCreateDispute,
  DisputeCategory,
  DisputeRequestedResolution,
  DISPUTE_CATEGORY_LABELS,
  DISPUTE_RESOLUTION_LABELS,
} from '@/hooks/useDisputes';

const CATEGORY_OPTIONS: DisputeCategory[] = [
  'order_not_received',
  'item_missing',
  'wrong_item',
  'damaged_item',
  'quality_issue',
  'overcharged',
  'late_delivery',
  'vendor_behavior',
  'delivery_behavior',
  'unauthorized_charge',
  'other',
];

const RESOLUTION_OPTIONS: DisputeRequestedResolution[] = [
  'refund',
  'partial_refund',
  'replacement',
  'store_credit',
  'apology',
  'other',
];

export function CreateDisputePage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const createDispute = useCreateDispute();

  const [category, setCategory] = useState<DisputeCategory | ''>('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [requestedResolution, setRequestedResolution] = useState<DisputeRequestedResolution>('refund');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!category) {
      setError('Please select a dispute category.');
      return;
    }
    if (!subject.trim()) {
      setError('Please enter a subject.');
      return;
    }
    if (!description.trim()) {
      setError('Please describe your issue.');
      return;
    }
    if (description.trim().length < 20) {
      setError('Please provide more details (at least 20 characters).');
      return;
    }

    createDispute.mutate(
      {
        order_id: orderId || '',
        category: category as DisputeCategory,
        subject: subject.trim(),
        description: description.trim(),
        requested_resolution: requestedResolution,
      },
      {
        onSuccess: (dispute) => {
          navigate(`/disputes/${dispute.id}`);
        },
        onError: () => {
          setError('Failed to create dispute. Please try again.');
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Back link */}
      <Link
        to={orderId ? `/orders/${orderId}` : '/disputes'}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {orderId ? 'Back to Order' : 'Back to Disputes'}
      </Link>

      <h1 className="mb-1 text-2xl font-bold text-gray-900">File a Dispute</h1>
      <p className="mb-6 text-sm text-gray-500">
        Tell us about the issue with your order and we'll work to resolve it.
      </p>

      {orderId && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
          <p className="text-sm text-blue-700">
            Filing dispute for Order: <span className="font-semibold">{orderId}</span>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Category */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-900">
            What's the issue? <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  category === cat
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                {DISPUTE_CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-gray-900">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            id="subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief summary of your issue"
            maxLength={255}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-gray-900">
            Describe the issue <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please provide as much detail as possible about what happened..."
            rows={5}
            maxLength={5000}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <p className="mt-1 text-xs text-gray-400">{description.length}/5000 characters</p>
        </div>

        {/* Requested Resolution */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-900">
            How would you like this resolved?
          </label>
          <div className="flex flex-wrap gap-2">
            {RESOLUTION_OPTIONS.map((res) => (
              <button
                key={res}
                type="button"
                onClick={() => setRequestedResolution(res)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  requestedResolution === res
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {DISPUTE_RESOLUTION_LABELS[res]}
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={createDispute.isPending}
          className="w-full rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createDispute.isPending ? 'Submitting...' : 'Submit Dispute'}
        </button>
      </form>
    </div>
  );
}
