import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useFloors } from '../hooks/useFloors';

// Mock the hook
vi.mock('../hooks/useFloors', () => ({
    useFloors: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual as any,
        useNavigate: () => mockNavigate,
        useParams: () => ({ floorId: undefined }),
    };
});

describe('Sidebar Component', () => {
    const mockOnToggle = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useFloors as any).mockReturnValue([
            { id: 'f1', name: 'Tech Floor', floor_number: 1 },
            { id: 'f2', name: 'Design Floor', floor_number: 2 },
        ]);
    });

    it('renders navigation links when open', () => {
        render(<Sidebar isOpen={true} onToggle={mockOnToggle} />, { wrapper: BrowserRouter });
        expect(screen.getByText('Tower Overview')).toBeDefined();
        expect(screen.getByText('Administration')).toBeDefined();
    });

    it('filters floors based on search query', () => {
        render(<Sidebar isOpen={true} onToggle={mockOnToggle} />, { wrapper: BrowserRouter });
        
        const searchInput = screen.getByPlaceholderText('Search floors...');
        fireEvent.change(searchInput, { target: { value: 'Tech' } });

        expect(screen.getByText('Tech Floor')).toBeDefined();
        expect(screen.queryByText('Design Floor')).toBeNull();
    });

    it('calls onToggle when toggle button is clicked', () => {
        render(<Sidebar isOpen={true} onToggle={mockOnToggle} />, { wrapper: BrowserRouter });
        const toggleBtn = screen.getByRole('button', { name: /toggle menu/i });
        fireEvent.click(toggleBtn);
        expect(mockOnToggle).toHaveBeenCalled();
    });

    it('shows icons only when closed', () => {
        render(<Sidebar isOpen={false} onToggle={mockOnToggle} />, { wrapper: BrowserRouter });
        expect(screen.queryByText('Tower Overview')).toBeNull();
    });
});
