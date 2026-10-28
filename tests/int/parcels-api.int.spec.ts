// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/parcels/route'

const mocks = vi.hoisted(() => ({ getPayload: vi.fn(), find: vi.fn(), count: vi.fn() }))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))
vi.mock('@/payload.config', () => ({ default: {} }))

const firstPage = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  from: `Sender ${i + 1}`,
  to: 'Recipient',
  status: 'received',
}))

beforeEach(() => {
  mocks.getPayload.mockResolvedValue({ find: mocks.find, count: mocks.count })
  mocks.find.mockResolvedValue({
    docs: firstPage,
    totalDocs: 574,
    totalPages: 72,
    page: 1,
    limit: 8,
    hasNextPage: true,
    hasPrevPage: false,
  })
  mocks.count
    .mockResolvedValueOnce({ totalDocs: 574 })
    .mockResolvedValueOnce({ totalDocs: 522 })
    .mockResolvedValueOnce({ totalDocs: 3 })
    .mockResolvedValueOnce({ totalDocs: 15 })
})

afterEach(() => {
  vi.resetAllMocks()
})

describe('parcel list counts', () => {
  it('returns 574 records and 72 pages even though only eight rows are loaded', async () => {
    const response = await GET(new NextRequest('http://localhost:3000/api/parcels?page=1&limit=8'))
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data).toHaveLength(8)
    expect(body.pagination).toMatchObject({ totalDocs: 574, totalPages: 72 })
    expect(body.stats).toEqual({
      totalParcels: 574,
      pendingParcels: 522,
      collectedToday: 3,
      urgentParcels: 15,
    })
    expect(mocks.count).toHaveBeenCalledWith({
      collection: 'parcel-logs',
      where: { status: { equals: 'received' } },
    })
  })

  it('preserves matching totals when searching rather than using current-page length', async () => {
    mocks.find.mockResolvedValueOnce({
      docs: firstPage,
      totalDocs: 40,
      totalPages: 5,
      page: 2,
      limit: 8,
      hasNextPage: true,
      hasPrevPage: true,
    })
    const response = await GET(
      new NextRequest('http://localhost:3000/api/parcels?search=laptop&page=2&limit=8'),
    )
    const body = await response.json()
    expect(body.pagination).toMatchObject({ totalDocs: 40, totalPages: 5, page: 2 })
    expect(body.data).toHaveLength(8)
    expect(body.stats.totalParcels).toBe(574)
    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        where: {
          or: expect.arrayContaining([
            { 'items.description': { contains: 'laptop' } },
            { 'items.serialNumbers.serialNumber': { contains: 'laptop' } },
          ]),
        },
      }),
    )
  })

  it('counts collected-today and urgent records across the full collection', async () => {
    await GET(new NextRequest('http://localhost:3000/api/parcels'))
    const todayQuery = mocks.count.mock.calls[2][0]
    expect(todayQuery.where.and[0]).toEqual({ status: { equals: 'collected' } })
    const start = new Date(todayQuery.where.and[1].collectedAt.greater_than_equal)
    const end = new Date(todayQuery.where.and[2].collectedAt.less_than)
    expect(start.getHours()).toBe(0)
    expect(end.getHours()).toBe(0)
    expect(end.getTime()).toBeGreaterThan(start.getTime())
    expect(mocks.count.mock.calls[3][0]).toEqual({
      collection: 'parcel-logs',
      where: {
        or: [
          { notes: { contains: 'urgent' } },
          { notes: { contains: 'immediate' } },
          { notes: { contains: 'asap' } },
        ],
      },
    })
  })
})
