// app/(app)/(dashboard)/parcels/page.tsx
'use client'

import React, { useState, useEffect } from 'react'
import {
  Plus,
  Package,
  Truck,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import ParcelCheckin from '@/components/parcel-checkin'
import { toast } from 'sonner'
import Link from 'next/link'
import type { ParcelLog } from '@/payload-types'

// Update the Parcel interface
interface Parcel {
  id: string
  items?: ParcelLog['items']
  from: string
  senderType: 'incoming' | 'outgoing' | 'other'
  to: string // Changed to string
  receivedAt: string
  collectedAt: string | null
  status: 'received' | 'collected' | 'returned'
  weight?: string
  dimensions?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

// API response type
interface ParcelsResponse {
  success: boolean
  data: Parcel[]
  stats: {
    totalParcels: number
    pendingParcels: number
    collectedToday: number
    urgentParcels: number
  }
  pagination?: {
    totalDocs: number
    totalPages: number
    page: number
    limit: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export default function ParcelsPage() {
  const [parcels, setParcels] = useState<Parcel[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<ParcelsResponse['pagination'] | null>(null)
  const [stats, setStats] = useState<ParcelsResponse['stats'] | null>(null)

  // Check if user is admin (you'll need to implement your own auth logic)
  const isAdmin = true // Replace with actual admin check

  // Fetch parcels on component mount
  useEffect(() => {
    fetchParcels(undefined, 1)
  }, [])

  const fetchParcels = async (search?: string, pageOverride?: number) => {
    try {
      setRefreshing(true)
      const params = new URLSearchParams()
      if (search) {
        params.append('search', search)
      }
      params.append('page', String(pageOverride ?? page))
      params.append('limit', '8')

      const response = await fetch(`/api/parcels?${params.toString()}`)
      const result: ParcelsResponse = await response.json()

      if (result.success) {
        setParcels(result.data)
        setPagination(result.pagination ?? null)
        setStats(result.stats ?? null)
        setPage(result.pagination?.page ?? pageOverride ?? page)
      } else {
        console.error('Failed to fetch parcels:', result)
        toast.error('Failed to load parcels')
      }
    } catch (error) {
      console.error('Error fetching parcels:', error)
      toast.error('Error loading parcels')
    } finally {
      setRefreshing(false)
    }
  }

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setPage(1)
    fetchParcels(value, 1)
  }

  const totalParcels = stats?.totalParcels ?? pagination?.totalDocs ?? 0
  const pendingParcels = stats?.pendingParcels ?? 0
  const collectedToday = stats?.collectedToday ?? 0
  const urgentParcels = stats?.urgentParcels ?? 0

  const handleMarkAsCollected = async (parcelId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/parcels/${parcelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'collected',
          collectedAt: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        // Refresh the parcel list
        fetchParcels(searchTerm, page)
        toast.success('Parcel marked as collected successfully')
      } else {
        const error = await response.json()
        console.error('Failed to update parcel:', error)
        toast.error(`Failed to mark as collected: ${error.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating parcel:', error)
      toast.error('Error updating parcel. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (parcelId: string) => {
    if (!isAdmin) {
      toast.error('Only administrators can delete parcels')
      return
    }

    if (window.confirm('Are you sure you want to delete this parcel record?')) {
      try {
        setLoading(true)
        const response = await fetch(`/api/parcels/${parcelId}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          // Refresh the parcel list
          fetchParcels(searchTerm, page)
          toast.success('Parcel deleted successfully')
        } else {
          const error = await response.json()
          console.error('Failed to delete parcel:', error)
          toast.error(`Failed to delete parcel: ${error.message || 'Unknown error'}`)
        }
      } catch (error) {
        console.error('Error deleting parcel:', error)
        toast.error('Error deleting parcel. Please try again.')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleAddParcel = () => {
    // Refresh the parcel list to include the new one
    fetchParcels(searchTerm, page)
    setIsAddDialogOpen(false)
  }

  const refreshData = () => {
    fetchParcels(searchTerm, page)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
      case 'collected':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Collected</Badge>
      case 'returned':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Returned</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getSenderTypeBadge = (type: string) => {
    const colors = {
      incoming: 'bg-blue-100 text-blue-800',
      outgoing: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800',
    }
    const labels = {
      incoming: 'Incoming',
      outgoing: 'Outgoing',
      other: 'Other',
    }
    return (
      <Badge
        className={`${colors[type as keyof typeof colors] || 'bg-gray-100'} hover:bg-opacity-80`}
      >
        {labels[type as keyof typeof labels] || type}
      </Badge>
    )
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Render table body based on state
  const renderTableBody = () => {
    if (refreshing) {
      return (
        <TableRow key="loading">
          <TableCell colSpan={6} className="text-center py-8">
            <div className="flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">Loading parcels...</span>
            </div>
          </TableCell>
        </TableRow>
      )
    }

    if (parcels.length === 0) {
      return (
        <TableRow key="empty">
          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'No parcels found. Try adjusting your search.' : 'No parcels found.'}
          </TableCell>
        </TableRow>
      )
    }

    return parcels.map((parcel) => (
      <TableRow key={parcel.id}>
        <TableCell className="align-top whitespace-normal [overflow-wrap:anywhere]">
          <div>
            <p className="font-medium">{parcel.from}</p>
            <div className="mt-1">{getSenderTypeBadge(parcel.senderType)}</div>
          </div>
        </TableCell>
        <TableCell className="align-top whitespace-normal [overflow-wrap:anywhere]">
          <p className="font-medium">{parcel.to}</p>
        </TableCell>
        <TableCell className="align-top whitespace-normal [overflow-wrap:anywhere]">
          <div
            role="region"
            aria-label={`Items for parcel from ${parcel.from} to ${parcel.to}`}
            tabIndex={0}
            className="max-h-48 overflow-y-auto pr-2 rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
          >
            {parcel.items && parcel.items.length > 0 ? (
              <div className="space-y-1">
                {parcel.items.map((item, index) => (
                  <div key={item.id ?? index} className="text-sm">
                    <p className="font-medium">{item.description}</p>
                    {item.serialNumbers && item.serialNumbers.length > 0 && (
                      <ul className="text-muted-foreground space-y-1">
                        {item.serialNumbers.map((serial, serialIndex) => (
                          <li key={serial.id ?? serialIndex}>{serial.serialNumber}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No items recorded</p>
            )}
            {parcel.notes && (
              <p className="text-xs text-muted-foreground mt-2">Note: {parcel.notes}</p>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              {parcel.weight && <span>{parcel.weight} • </span>}
              {parcel.dimensions && <span>{parcel.dimensions}</span>}
            </div>
          </div>
        </TableCell>
        <TableCell className="align-top whitespace-normal">
          <div>
            <p className="text-sm">{formatDate(parcel.receivedAt)}</p>
            <p className="text-xs text-muted-foreground">{formatTime(parcel.receivedAt)}</p>
          </div>
        </TableCell>
        <TableCell className="align-top whitespace-normal">
          {getStatusBadge(parcel.status)}
          {parcel.collectedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Collected: {formatDate(parcel.collectedAt)}
            </p>
          )}
        </TableCell>
        <TableCell className="text-right align-top">
          <div className="flex justify-end gap-2">
            <Link href={`/dashboard/parcels/${parcel.id}`}>
              <Button variant="ghost" size="icon" title="View Details">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            {parcel.status === 'received' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleMarkAsCollected(parcel.id)}
                disabled={loading}
                title="Mark as Collected"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(parcel.id)}
                disabled={loading}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    ))
  }

  return (
    <div className="min-w-0 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parcel Management</h1>
          <p className="text-muted-foreground">
            Track and manage all incoming and outgoing parcels
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={refreshData}
            disabled={refreshing}
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Log Parcel
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Log New Parcel</DialogTitle>
                <DialogDescription>
                  Enter parcel details to log it into the system.
                </DialogDescription>
              </DialogHeader>
              <ParcelCheckin onSubmitSuccess={handleAddParcel} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Parcels</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalParcels}</div>
            <p className="text-xs text-muted-foreground">All parcels in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Collection</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingParcels}</div>
            <p className="text-xs text-muted-foreground">Awaiting pickup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected Today</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collectedToday}</div>
            <p className="text-xs text-muted-foreground">Successful deliveries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Parcels</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{urgentParcels}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="min-w-0 max-w-full">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>Parcel Tracking</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search parcels..."
                  className="pl-9 w-full md:w-[300px]"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" onClick={refreshData} disabled={refreshing}>
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="min-w-0 overflow-hidden rounded-md border">
            <Table className="table-fixed min-w-[1100px]">
              <colgroup>
                <col className="w-[16%]" />
                <col className="w-[16%]" />
                <col className="w-[28%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[14%]" />
              </colgroup>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To (Recipient)</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{renderTableBody()}</TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between gap-4 mt-4">
            <Button
              variant="outline"
              disabled={!pagination?.hasPrevPage || refreshing}
              onClick={() => {
                const next = page - 1
                if (next < 1) return
                setPage(next)
                fetchParcels(searchTerm, next)
              }}
            >
              Previous
            </Button>
            <div className="text-sm text-muted-foreground text-center">
              <div>
                Showing {parcels.length > 0 && pagination ? (page - 1) * pagination.limit + 1 : 0}–
                {parcels.length > 0 && pagination
                  ? (page - 1) * pagination.limit + parcels.length
                  : parcels.length}{' '}
                of {pagination?.totalDocs ?? 0} parcels
              </div>
              <div>
                Page <span className="font-medium text-foreground">{page}</span>
                {pagination?.totalPages ? (
                  <>
                    {' '}
                    of <span className="font-medium text-foreground">{pagination.totalPages}</span>
                  </>
                ) : null}
              </div>
            </div>
            <Button
              variant="outline"
              disabled={!pagination?.hasNextPage || refreshing}
              onClick={() => {
                const next = page + 1
                setPage(next)
                fetchParcels(searchTerm, next)
              }}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
