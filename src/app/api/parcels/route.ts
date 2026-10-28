// app/api/parcels/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '@/payload.config'

// app/api/parcels/route.ts - Update the GET function
export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const searchParams = request.nextUrl.searchParams

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '8')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const where: Where = {}

    if (status) {
      where.status = { equals: status }
    }

    if (search) {
      where.or = [
        { from: { contains: search } },
        { to: { contains: search } },
        { notes: { contains: search } },
        { 'items.description': { contains: search } },
        { 'items.serialNumbers.serialNumber': { contains: search } },
      ]
    }

    if (dateFrom || dateTo) {
      where.receivedAt = {}
      if (dateFrom) {
        where.receivedAt.greater_than_equal = new Date(dateFrom).toISOString()
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        where.receivedAt.less_than_equal = endDate.toISOString()
      }
    }

    const result = await payload.find({
      collection: 'parcel-logs',
      where: Object.keys(where).length > 0 ? where : undefined,
      page,
      limit,
      sort: '-receivedAt',
      depth: 1,
    })

    // Summary cards describe the whole collection, not just the current table page.
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const [total, pending, collectedToday, urgent] = await Promise.all([
      payload.count({ collection: 'parcel-logs' }),
      payload.count({
        collection: 'parcel-logs',
        where: { status: { equals: 'received' } },
      }),
      payload.count({
        collection: 'parcel-logs',
        where: {
          and: [
            { status: { equals: 'collected' } },
            { collectedAt: { greater_than_equal: today.toISOString() } },
            { collectedAt: { less_than: tomorrow.toISOString() } },
          ],
        },
      }),
      payload.count({
        collection: 'parcel-logs',
        where: {
          or: ['urgent', 'immediate', 'asap'].map((word) => ({
            notes: { contains: word },
          })),
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      data: result.docs,
      stats: {
        totalParcels: total.totalDocs,
        pendingParcels: pending.totalDocs,
        collectedToday: collectedToday.totalDocs,
        urgentParcels: urgent.totalDocs,
      },
      pagination: {
        totalDocs: result.totalDocs,
        totalPages: result.totalPages,
        page: result.page,
        limit: result.limit,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
    })
  } catch (error) {
    console.error('Error fetching parcels:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch parcels',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// app/api/parcels/route.ts - Update POST handler
export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const body = await request.json()

    // Validate required fields
    if (!body.from || !body.senderType || !body.to) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: 'from, senderType, and to are required',
        },
        { status: 400 },
      )
    }

    const parcel = await payload.create({
      collection: 'parcel-logs',
      data: {
        ...body,
        items: body.items || [],
      },
    })

    return NextResponse.json({
      success: true,
      data: parcel,
      message: 'Parcel logged successfully',
    })
  } catch (error) {
    console.error('Error creating parcel:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create parcel',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
