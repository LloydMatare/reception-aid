import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import ParcelsPage from '@/app/(app)/(dashboard)/dashboard/parcels/page'

vi.mock('@/components/parcel-checkin', () => ({ default: () => null }))

const records = (count: number, start = 1) =>
  Array.from({ length: count }, (_, i) => ({
    id: String(start + i),
    from: `Sender ${start + i}`,
    to: 'Recipient',
    senderType: 'incoming',
    status: 'received',
    receivedAt: '2026-10-01T12:00:00.000Z',
    collectedAt: null,
  }))

const response = (page = 1, totalDocs = 574) => ({
  success: true,
  data: records(page === 72 ? 6 : 8, (page - 1) * 8 + 1),
  stats: { totalParcels: 574, pendingParcels: 522, collectedToday: 3, urgentParcels: 15 },
  pagination: {
    totalDocs,
    totalPages: Math.ceil(totalDocs / 8),
    page,
    limit: 8,
    hasNextPage: page < Math.ceil(totalDocs / 8),
    hasPrevPage: page > 1,
  },
})

const fetchMock = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockImplementation(async () => ({ json: async () => response() }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.resetAllMocks()
})

const card = (title: string) => {
  const element = screen.getByText(title).closest('[data-slot="card"]')
  if (!element) throw new Error(`Missing card: ${title}`)
  return within(element as HTMLElement)
}

describe('parcel management totals', () => {
  it('shows full-dataset summaries and explicitly separates records from pages', async () => {
    render(React.createElement(ParcelsPage))
    await screen.findByText('Showing 1–8 of 574 parcels')
    expect(card('Total Parcels').getByText('574')).toBeDefined()
    expect(card('Pending Collection').getByText('522')).toBeDefined()
    expect(card('Collected Today').getByText('3')).toBeDefined()
    expect(card('Urgent Parcels').getByText('15')).toBeDefined()
    expect(screen.getByText('72')).toBeDefined()
    expect(screen.getAllByRole('row')).toHaveLength(9)
  })

  it('keeps totals unchanged when moving to another page', async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => response() })
      .mockResolvedValueOnce({ json: async () => response(2) })
    render(React.createElement(ParcelsPage))
    await screen.findByText('Showing 1–8 of 574 parcels')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Showing 9–16 of 574 parcels')
    expect(card('Total Parcels').getByText('574')).toBeDefined()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/parcels?page=2&limit=8')
  })

  it('shows matching record totals without shrinking the all-system summary', async () => {
    fetchMock
      .mockResolvedValueOnce({ json: async () => response() })
      .mockResolvedValueOnce({ json: async () => response(1, 40) })
    render(React.createElement(ParcelsPage))
    await screen.findByText('Showing 1–8 of 574 parcels')
    fireEvent.change(screen.getByPlaceholderText('Search parcels...'), {
      target: { value: 'laptop' },
    })
    await screen.findByText('Showing 1–8 of 40 parcels')
    expect(card('Total Parcels').getByText('574')).toBeDefined()
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith('/api/parcels?search=laptop&page=1&limit=8'),
    )
  })
})

describe('parcel item display', () => {
  it('constrains long values and large item lists without removing any details', async () => {
    const description = `Laptop ${'long-unbroken-description'.repeat(30)}`
    const serialNumbers = Array.from({ length: 80 }, (_, index) => ({
      id: `serial-${index}`,
      serialNumber: `SERIAL-${index}-${'X'.repeat(100)}`,
    }))
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        ...response(),
        data: [
          {
            ...records(1)[0],
            from: 'Sender'.repeat(50),
            to: 'Recipient'.repeat(50),
            items: [{ description, serialNumbers }],
            notes: 'Notes'.repeat(100),
          },
        ],
      }),
    })
    render(React.createElement(ParcelsPage))
    await screen.findByText(description)
    const table = screen.getByRole('table')
    expect(table.classList.contains('table-fixed')).toBe(true)
    expect(table.classList.contains('min-w-[1100px]')).toBe(true)
    expect(table.querySelectorAll('col')).toHaveLength(6)
    const row = screen.getByText(description).closest('tr')!
    const cells = within(row).getAllByRole('cell')
    for (const cell of cells.slice(0, 3)) {
      expect(cell.classList.contains('whitespace-normal')).toBe(true)
      expect(cell.classList.contains('[overflow-wrap:anywhere]')).toBe(true)
    }
    const details = within(row).getByRole('region', { name: /^Items for parcel/ })
    expect(details.classList.contains('max-h-48')).toBe(true)
    expect(details.classList.contains('overflow-y-auto')).toBe(true)
    expect(details.getAttribute('tabindex')).toBe('0')
    expect(within(details).getAllByRole('listitem')).toHaveLength(80)
    expect(within(details).getByText(serialNumbers[79].serialNumber)).toBeDefined()
  })
  it('renders all descriptions and nested serial numbers from the API', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        ...response(),
        data: [
          {
            ...records(1)[0],
            items: [
              {
                id: 'item-1',
                description: 'HP laptop',
                serialNumbers: [
                  { id: 'serial-1', serialNumber: 'HP-001' },
                  { id: 'serial-2', serialNumber: 'HP-002' },
                ],
              },
              {
                id: 'item-2',
                description: 'Dell monitor',
                serialNumbers: [{ id: 'serial-3', serialNumber: 'DELL-003' }],
              },
            ],
          },
        ],
      }),
    })
    render(React.createElement(ParcelsPage))
    await screen.findByText('HP laptop')
    expect(screen.getByText('Dell monitor')).toBeDefined()
    for (const serial of ['HP-001', 'HP-002', 'DELL-003']) {
      expect(screen.getByText(serial)).toBeDefined()
    }
    expect(screen.queryByText('No items recorded')).toBeNull()
  })

  it('shows item descriptions when serial numbers are missing or empty', async () => {
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        ...response(),
        data: [
          {
            ...records(1)[0],
            items: [
              { description: 'Office stationery' },
              { description: 'Packing supplies', serialNumbers: [] },
              { description: 'Documents', serialNumbers: null },
            ],
          },
        ],
      }),
    })
    render(React.createElement(ParcelsPage))
    await screen.findByText('Office stationery')
    expect(screen.getByText('Packing supplies')).toBeDefined()
    expect(screen.getByText('Documents')).toBeDefined()
    expect(screen.queryByText('No items recorded')).toBeNull()
  })

  it.each([undefined, null, []])(
    'shows the empty message only for no items (%j)',
    async (items) => {
      fetchMock.mockResolvedValueOnce({
        json: async () => ({
          ...response(),
          data: [{ ...records(1)[0], items }],
        }),
      })
      render(React.createElement(ParcelsPage))
      expect(await screen.findByText('No items recorded')).toBeDefined()
    },
  )
})
