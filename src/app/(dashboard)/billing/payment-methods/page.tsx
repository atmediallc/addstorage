'use client';

import { trpc } from '@/lib/trpc';
import { useToast } from '@/components/ui/toast';
import { CreditCard, Trash2, Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function getCardBrandIcon(brand: string) {
  // Simplified — in production use proper card brand icons
  return brand?.toUpperCase() ?? 'CARD';
}

export default function PaymentMethodsPage() {
  const { toast } = useToast();
  const { data: methods, isLoading } = trpc.billing.getPaymentMethods.useQuery();
  const removeMethod = trpc.billing.removePaymentMethod.useMutation({
    onSuccess: () => {
      toast('Payment method removed', 'success');
      trpc.useUtils().billing.getPaymentMethods.invalidate();
    },
    onError: (err) => toast(err.message, 'error'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/billing" className="rounded p-1 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Saved Cards</h2>
          <button className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Add Card
          </button>
        </div>

        {isLoading ? (
          <div className="py-4 text-center text-sm text-gray-500">Loading...</div>
        ) : !methods || methods.length === 0 ? (
          <div className="py-8 text-center">
            <CreditCard className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No payment methods saved.</p>
            <p className="text-xs text-gray-400">Add a card to subscribe to a plan.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {methods.map((method: any) => (
              <div
                key={method.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {getCardBrandIcon(method.card?.brand)} •••• {method.card?.last4}
                    </p>
                    <p className="text-xs text-gray-500">
                      Expires {method.card?.exp_month}/{method.card?.exp_year}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Remove this payment method?')) {
                      removeMethod.mutate({ paymentMethodId: method.id });
                    }
                  }}
                  disabled={removeMethod.isPending}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
