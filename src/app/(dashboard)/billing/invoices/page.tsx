'use client';

import { trpc } from '@/lib/trpc';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import Link from 'next/link';

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function InvoicesPage() {
  const { data: invoices, isLoading } = trpc.billing.getInvoices.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/billing" className="rounded p-1 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Invoice History</h2>

        {isLoading ? (
          <div className="py-4 text-center text-sm text-gray-500">Loading...</div>
        ) : !invoices || invoices.length === 0 ? (
          <div className="py-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">No invoices yet.</p>
            <p className="text-xs text-gray-400">Invoices will appear here after your first payment.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {invoices.map((invoice: any) => (
                  <tr key={invoice.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {new Date(invoice.created * 1000).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {formatAmount(invoice.amount_paid, invoice.currency)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'open' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {invoice.invoice_pdf && (
                        <a
                          href={invoice.invoice_pdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          <Download className="h-4 w-4" />
                          PDF
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
