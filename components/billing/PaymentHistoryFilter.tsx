'use client'

import { useState, useMemo } from 'react'
import { Search, Filter, Download, Calendar } from 'lucide-react'

interface AdOrder {
  id: string
  created_at: string
  organization_name: string
  customer_email: string
  ad_type: string
  status: string
  amount_total: number
  currency: string
  payment_status: string | null
  stripe_session_id: string
  metadata: {
    billing_cycle?: string
    tier?: string
  }
}

interface PaymentHistoryFilterProps {
  orders: AdOrder[]
  children: (filteredOrders: AdOrder[]) => React.ReactNode
}

export default function PaymentHistoryFilter({
  orders,
  children,
}: PaymentHistoryFilterProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<'all' | '30d' | '90d' | 'year'>('all')

  // Filter and search logic
  const filteredOrders = useMemo(() => {
    let filtered = [...orders]

    // Search filter (organization name, email, session ID)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (order) =>
          order.organization_name.toLowerCase().includes(query) ||
          order.customer_email.toLowerCase().includes(query) ||
          order.stripe_session_id.toLowerCase().includes(query) ||
          order.ad_type.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const cutoffDate = new Date(now)

      switch (dateFilter) {
        case '30d':
          cutoffDate.setDate(now.getDate() - 30)
          break
        case '90d':
          cutoffDate.setDate(now.getDate() - 90)
          break
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1)
          break
      }

      filtered = filtered.filter((order) => new Date(order.created_at) >= cutoffDate)
    }

    return filtered
  }, [orders, searchQuery, statusFilter, dateFilter])

  // Export to CSV
  const handleExport = () => {
    const headers = ['Date', 'Organization', 'Email', 'Type', 'Amount', 'Status', 'Order ID']
    const rows = filteredOrders.map((order) => [
      new Date(order.created_at).toLocaleDateString(),
      order.organization_name,
      order.customer_email,
      order.metadata?.tier || order.ad_type,
      `$${(order.amount_total / 100).toFixed(2)}`,
      order.status,
      order.stripe_session_id,
    ])

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payment-history-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by organization, email, or order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-40">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
              <option value="disputed">Disputed</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="w-full sm:w-40">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground"
            >
              <option value="all">All Time</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="year">Last Year</option>
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={filteredOrders.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-foreground"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>

        {/* Results Count */}
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>
            Showing {filteredOrders.length} of {orders.length} order{orders.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Render filtered orders */}
      {children(filteredOrders)}
    </div>
  )
}
