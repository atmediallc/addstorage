'use client';

import { use } from 'react';
import { trpc } from '@/lib/trpc';
import { RefreshCw, Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function InvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const { data: invoice, isLoading, error } = trpc.billing.getInvoiceByToken.useQuery({ token });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm text-gray-500 font-medium">Loading Invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-gray-200 p-8 shadow-sm text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Invoice</h2>
          <p className="text-sm text-gray-500 mb-6">
            {error?.message || 'The requested invoice could not be found.'}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md text-sm shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Parse safety JSON structures
  const inv = invoice as any;
  const seller = (typeof inv.seller === 'string'
    ? JSON.parse(inv.seller)
    : inv.seller) as Record<string, string>;

  const client = (typeof inv.client === 'string'
    ? JSON.parse(inv.client)
    : inv.client) as Record<string, string>;

  const bag = (typeof inv.bag === 'string'
    ? JSON.parse(inv.bag)
    : inv.bag) as Array<{ description: string; date: string; amount: string }>;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 print:bg-white print:py-0 print:px-0">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Actions panel (hidden during printing) */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 print:hidden">
          <Link
            href="/billing/invoices"
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All Invoices
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Print Invoice
          </button>
        </div>

        {/* Invoice template layout */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 shadow-sm print:border-none print:shadow-none print:rounded-none">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-8 border-b border-gray-100">
            <div>
              <span className="text-3xl font-extrabold text-blue-600">TutisCloud</span>
              <p className="text-sm text-gray-500 font-medium mt-1">Invoice Token: {invoice.token}</p>
            </div>
            <div className="sm:text-right">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Date Issued</span>
              <p className="text-gray-900 font-bold mt-0.5">
                {new Date(invoice.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Seller / Client rows */}
          <div className="grid sm:grid-cols-2 gap-8 py-8 border-b border-gray-100">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Seller</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li className="font-semibold text-gray-900">{seller.name || 'TutisCloud LLC'}</li>
                {seller.email && <li>Email: {seller.email}</li>}
                {seller.phone && <li>Phone: {seller.phone}</li>}
                {seller.address && <li>Address: {seller.address}</li>}
                {seller.city && (
                  <li>
                    {seller.city}
                    {seller.postalCode ? `, ${seller.postalCode}` : ''}
                  </li>
                )}
                {seller.country && <li>{seller.country}</li>}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Client</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li className="font-semibold text-gray-900">{client.name || invoice.user.name}</li>
                <li>Email: {client.email || invoice.user.email}</li>
                {client.address && <li>Address: {client.address}</li>}
                {client.city && <li>{client.city}</li>}
              </ul>
            </div>
          </div>

          {/* Line items table */}
          <div className="py-8">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Line Items</h3>
            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 font-semibold text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">Billing Period</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {bag?.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3.5 font-medium text-gray-900">{item.description}</td>
                      <td className="px-4 py-3.5 text-gray-500 hidden sm:table-cell">{item.date}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-gray-900">
                        {parseFloat(item.amount).toLocaleString(undefined, {
                          style: 'currency',
                          currency: invoice.currency.toUpperCase(),
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invoice Summary Totals */}
          <div className="border-t border-gray-100 pt-6 flex justify-end">
            <div className="w-full sm:w-64 space-y-3">
              <div className="flex justify-between items-center text-lg font-bold text-gray-900 border-t border-gray-200 pt-3">
                <span>Total Amount:</span>
                <span>
                  {parseFloat(invoice.total).toLocaleString(undefined, {
                    style: 'currency',
                    currency: invoice.currency.toUpperCase(),
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
