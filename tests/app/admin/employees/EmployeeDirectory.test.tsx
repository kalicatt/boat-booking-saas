import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ImgHTMLAttributes } from 'react'
import { EmployeeDirectory } from '@/app/admin/employees/ClientPage'

const mockReplace = vi.fn()
let searchParamsInstance: URLSearchParams = new URLSearchParams()

const setSearchParams = (value: string) => {
    searchParamsInstance = new URLSearchParams(value)
}

vi.mock('next/navigation', () => ({
    useRouter: () => ({ replace: mockReplace }),
    usePathname: () => '/admin/employees',
    useSearchParams: () => searchParamsInstance
}))

vi.mock('next/image', () => ({
    __esModule: true,
    default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
        // Simplify Next.js Image for tests
        const { alt = '', ...rest } = props
        // eslint-disable-next-line @next/next/no-img-element
        return <img alt={alt} {...rest} />
    }
}))

const employeesFixture = [
    {
        id: 'emp_active',
        firstName: 'Alice',
        lastName: 'Durand',
        email: 'alice@example.com',
        isActive: true
    },
    {
        id: 'emp_inactive',
        firstName: 'Bob',
        lastName: 'Martin',
        email: 'bob@example.com',
        isActive: false
    }
]

describe('EmployeeDirectory filters', () => {
    beforeEach(() => {
        setSearchParams('')
        mockReplace.mockClear()
    })

    it('shows only active employees by default', () => {
        render(<EmployeeDirectory employees={employeesFixture} loading={false} />)

        expect(screen.getByText('Alice Durand')).toBeInTheDocument()
        expect(screen.queryByText('Bob Martin')).not.toBeInTheDocument()
    })

    it('reads the inactive filter from the query string', () => {
        setSearchParams('teamFilter=inactive')
        render(<EmployeeDirectory employees={employeesFixture} loading={false} />)

        expect(screen.getByText('Bob Martin')).toBeInTheDocument()
        expect(screen.queryByText('Alice Durand')).not.toBeInTheDocument()
    })

    it('updates the URL and view when toggling filters', () => {
        const view = render(<EmployeeDirectory employees={employeesFixture} loading={false} />)

        fireEvent.click(screen.getByText(/Archivés/))

        expect(mockReplace).toHaveBeenCalledWith('/admin/employees?teamFilter=inactive', { scroll: false })

        // Simuler la navigation: mise à jour des query params + rerender
        setSearchParams('teamFilter=inactive')
        view.rerender(<EmployeeDirectory employees={employeesFixture} loading={false} />)
        expect(screen.getByText('Bob Martin')).toBeInTheDocument()
    })
})
