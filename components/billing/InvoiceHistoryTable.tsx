'use client'

import { useEffect, useState } from 'react'
import { FileText, Download, ExternalLink, Loader2, Receipt } from 'lucide-react'
import { Invoice, getInvoiceStatusLabel, getInvoiceStatusColor } from '@/lib/billing/invoices'

interface InvoiceHistoryTableProps {
  limit?: number
}

export default function InvoiceHistoryTable({ limit = 12 }: InvoiceHistoryTableProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const response = await fetch(`/api/billing/invoices?limit=${limit}`)
        if (!response.ok) {
          throw new Error('Failed to fetch invoices')
        }
        const data = await response.json()
        setInvoices(data.invoices || [])
      } catch (err) {
        console.error('Error fetching invoices:', err)
        setError(err instanceof Error ? err.message : 'Failed to load invoice history')
      } finally {
        setLoading(false)
      }
    }

    fetchInvoices()
  }, [limit])

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border shadow-sm p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading invoice history...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border shadow-sm p-8">
        <div className="text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Unable to load invoice history</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border shadow-sm p-8">
        <div className="text-center text-muted-foreground">
          <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">No invoices yet</p>
          <p className="text-sm mt-1">
            Your invoice history will appear here once you make a purchase
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice History
          </h3>
          <span className="text-sm text-muted-foreground">{invoices.length} invoices</span>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Invoice
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-foreground font-mono">
                    {invoice.number || invoice.id.substring(0, 12)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-muted-foreground">
                    {invoice.created.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  {invoice.paidAt && (
                    <div className="text-xs text-muted-foreground/70">
                      Paid{' '}
                      {invoice.paidAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-foreground">
                    {invoice.lines[0]?.description || 'Subscription Payment'}
                  </div>
                  {invoice.lines.length > 1 && (
                    <div className="text-xs text-muted-foreground">
                      +{invoice.lines.length - 1} more items
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="text-sm font-semibold text-foreground">
                    ${invoice.total.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">{invoice.currency}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getInvoiceStatusColor(invoice.status)}`}
                  >
                    {getInvoiceStatusLabel(invoice.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    {invoice.pdfUrl && (
                      <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                        <span className="hidden lg:inline">PDF</span>
                      </a>
                    )}
                    {invoice.hostedUrl && (
                      <a
                        href={invoice.hostedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                        title="View invoice"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span className="hidden lg:inline">View</span>
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden divide-y divide-border">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="p-4 hover:bg-muted/20 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-foreground font-mono">
                  {invoice.number || invoice.id.substring(0, 12)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {invoice.created.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getInvoiceStatusColor(invoice.status)}`}
              >
                {getInvoiceStatusLabel(invoice.status)}
              </span>
            </div>

            <div className="mb-3">
              <p className="text-sm text-foreground">
                {invoice.lines[0]?.description || 'Subscription Payment'}
              </p>
              {invoice.lines.length > 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  +{invoice.lines.length - 1} more items
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-foreground">
                ${invoice.total.toFixed(2)}
              </div>
              <div className="flex items-center gap-3">
                {invoice.pdfUrl && (
                  <a
                    href={invoice.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    PDF
                  </a>
                )}
                {invoice.hostedUrl && (
                  <a
                    href={invoice.hostedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-muted/10 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          Need help with an invoice? Contact{' '}
          <a href="mailto:billing@judgefinder.io" className="text-primary hover:underline">
            billing@judgefinder.io
          </a>
        </p>
      </div>
    </div>
  )
}
