import { fireEvent, within, waitFor } from '@testing-library/react'
import { render } from '../../test-utils'
import { Main } from './index'
import { chromeProvider } from '../../services/chromeProvider'
import { mockChrome } from '../../mocks/mock-chrome'
import { act } from 'react-dom/test-utils'

jest.mock('../../services/chromeProvider')

jest.mock('@/hooks/useHighlight', () => ({
  useHighlight: () => ({
    markup: '<div>hi</div>',
    loading: false,
  }),
}))

jest.mock('@/services/userSettingsService', () => ({
  getUserSettings: jest.fn(),
  setUserSettings: jest.fn(),
}))

const mockChromeProvider = chromeProvider as jest.Mock

const mockOnNavigated = () => {
  let triggerOnNavigated: () => void
  mockChromeProvider.mockReturnValue({
    ...mockChrome,
    devtools: {
      ...mockChrome.devtools,
      network: {
        ...mockChrome.devtools.network,
        onNavigated: {
          addListener: (cb: any) => {
            triggerOnNavigated = cb
          },
          removeListener: () => {},
        },
      },
    },
  })

  return () => {
    triggerOnNavigated()
  }
}

describe('Main', () => {
  beforeEach(() => {
    mockChromeProvider.mockReturnValue(mockChrome)
  })

  it('renders the table only by default', async () => {
    const { queryByTestId, getByText } = render(<Main />)

    await waitFor(() => {
      expect(getByText(/getMovie/i)).toBeInTheDocument()
    })

    expect(queryByTestId('network-table')).toBeInTheDocument()
    expect(queryByTestId('network-tabs')).not.toBeInTheDocument()
  })

  it('opens the side panel when clicking a table row', async () => {
    const { getByText, getByTestId } = render(<Main />)

    await waitFor(() => {
      expect(getByText(/getMovie/i)).toBeInTheDocument()
    })

    fireEvent.click(getByText(/getMovie/i))

    expect(getByTestId('network-tabs')).toBeInTheDocument()
  })

  it("closes the side panel when clicking the 'x' button", async () => {
    const { queryByTestId, getByTestId, getByText } = render(<Main />)

    await waitFor(() => {
      expect(getByText(/getMovie/i)).toBeInTheDocument()
    })

    fireEvent.click(getByText(/getMovie/i))
    fireEvent.click(getByTestId('close-side-panel'))

    expect(queryByTestId('network-tabs')).not.toBeInTheDocument()
  })

  it('renders all network data within the table', async () => {
    const { queryByTestId } = render(<Main />)
    const table = queryByTestId('network-table')
    if (!table) {
      throw new Error('Table not found in dom')
    }
    const { queryAllByRole, getByText } = within(table)

    await waitFor(() => {
      expect(getByText(/getMovie/i)).toBeInTheDocument()
    })

    expect(queryAllByRole('row')).toHaveLength(9)
  })

  it('renders correct values for each column within the table', async () => {
    const { queryByTestId } = render(<Main />)
    const table = queryByTestId('network-table')
    if (!table) {
      throw new Error('Table not found in dom')
    }
    const {
      queryAllByRole: queryAllByRoleWithinTable,
      getByText: getByTextWithinTable,
    } = within(table)

    await waitFor(() => {
      expect(getByTextWithinTable(/getMovie/i)).toBeInTheDocument()
    })

    const rows = queryAllByRoleWithinTable('row')

    const firstRow = rows[1]
    const { queryByTestId: queryByTestIdWithinRow } = within(firstRow)

    expect(queryByTestIdWithinRow('column-operation')).toHaveTextContent(
      'QgetMovie'
    )
    expect(queryByTestIdWithinRow('column-url')).toHaveTextContent(
      'http://graphql-network-monitor.com/graphql'
    )
    expect(queryByTestIdWithinRow('column-time')).toHaveTextContent('1s')
    expect(queryByTestIdWithinRow('column-size')).toHaveTextContent('3.36 kB')
    expect(queryByTestIdWithinRow('column-status')).toHaveTextContent('200')

    const errorRow = rows[rows.length - 2]
    const operationColumn = within(errorRow).queryByTestId('column-operation')
    expect(operationColumn).not.toBeNull()

    const errorDot = within(operationColumn!).queryByTestId('dot')
    expect(errorDot).not.toBeNull()
    expect(errorDot).toHaveTextContent('1')
    expect(errorDot).toHaveProperty(
      'title',
      'Details for actor with ID 3 could not be fetched'
    )
  })

  it('clears the table of all network data when clicking the clear button', async () => {
    const { queryByTestId, getByTestId } = render(<Main />)
    const table = queryByTestId('network-table')
    const { queryAllByRole, getByText } = within(table!)

    await waitFor(() => {
      expect(getByText(/getMovie/i)).toBeInTheDocument()
    })

    fireEvent.click(getByTestId('clear-network-table'))

    expect(queryAllByRole('row')).toHaveLength(1)
  })

  it('clears the table of all network data when reloading', async () => {
    const triggerOnNavigated = mockOnNavigated()

    const { queryByTestId } = render(<Main />)
    const table = queryByTestId('network-table')
    const { queryAllByRole, getByText } = within(table!)

    await waitFor(() => {
      expect(getByText(/getMovie/i)).toBeInTheDocument()
    })

    act(() => {
      triggerOnNavigated()
    })

    expect(queryAllByRole('row')).toHaveLength(1)
  })

  it('does not clear the table of all network data when reloading and preserve log checked', async () => {
    const triggerOnNavigated = mockOnNavigated()

    const { getByTestId, queryByTestId } = render(<Main />)
    const table = queryByTestId('network-table')
    const { queryAllByRole, getByText } = within(table!)

    await waitFor(() => {
      expect(getByText(/getMovie/i)).toBeInTheDocument()
    })

    act(() => {
      fireEvent.click(getByTestId('preserve-log-checkbox'))
    })

    act(() => {
      triggerOnNavigated()
    })

    expect(queryAllByRole('row')).toHaveLength(9)
  })

  it('filters network data with the given search query', async () => {
    const { getByTestId, queryByTestId } = render(<Main />)
    const table = queryByTestId('network-table')
    const { queryAllByRole, getByText } = within(table!)
    const filterInput = getByTestId('filter-input') as HTMLInputElement

    await waitFor(() => {
      expect(getByText(/getMovie/i)).toBeInTheDocument()
    })

    act(() => {
      fireEvent.change(filterInput, {
        target: { value: 'getmovie' },
      })
    })

    expect(filterInput.value).toBe('getmovie')
    expect(queryAllByRole('row')).toHaveLength(2)
    queryAllByRole('row').forEach((row, i) => {
      // First row is header
      if (i !== 0) {
        expect(row).toHaveTextContent('getMovie')
      }
    })
  })

  it('filters network data with the given search query inverted', async () => {
    const { getByTestId, queryByTestId } = render(<Main />)
    const table = queryByTestId('network-table')
    const { queryAllByRole, getByText } = within(table!)
    const filterInput = getByTestId('filter-input') as HTMLInputElement

    await waitFor(() => {
      expect(getByText(/getMovie/i)).toBeInTheDocument()
    })

    act(() => {
      fireEvent.click(getByTestId('inverted-checkbox'))
    })

    act(() => {
      fireEvent.change(filterInput, {
        target: { value: 'getmovie' },
      })
    })

    expect(filterInput.value).toBe('getmovie')
    expect(queryAllByRole('row')).toHaveLength(8)
    queryAllByRole('row').forEach((row, i) => {
      // First row is header
      if (i !== 0) {
        expect(row).not.toHaveTextContent('getMovie')
      }
    })
  })

  it('filters network data with the given regex query', async () => {
    const { getByTestId, queryByTestId } = render(<Main />)
    const table = queryByTestId('network-table')
    const { queryAllByRole, getByText } = within(table!)
    const filterInput = getByTestId('filter-input') as HTMLInputElement

    await waitFor(() => {
      expect(getByText(/getMovie/i)).toBeInTheDocument()
    })

    act(() => {
      fireEvent.click(getByTestId('regex-checkbox'))
    })

    act(() => {
      fireEvent.change(filterInput, {
        target: { value: '/getMovie/' },
      })
    })

    expect(filterInput.value).toBe('/getMovie/')
    expect(queryAllByRole('row')).toHaveLength(2)
    queryAllByRole('row').forEach((row, i) => {
      // First row is header
      if (i !== 0) {
        expect(row).toHaveTextContent('getMovie')
      }
    })
  })

  it('extracts variables from extensions', async () => {
    const { getByText, getByTestId } = render(<Main />)

    await waitFor(() => {
      expect(getByText(/hasUnseenAnnouncements/i)).toBeInTheDocument()
    })

    fireEvent.click(getByText(/hasUnseenAnnouncements/i))

    expect(getByTestId('network-tabs')).toBeInTheDocument()

    await waitFor(() => {
      expect(getByText('Variables')).toBeInTheDocument()
    })
  })
})
