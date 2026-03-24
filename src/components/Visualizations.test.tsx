import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FloorTreasuryChart, ActivityTrendChart } from './Visualizations';

describe('Visualizations Components', () => {
    describe('FloorTreasuryChart', () => {
        it('renders with data segments', () => {
            const data = [
                { name: 'Floor 1', balance: 1000 },
                { name: 'Floor 2', balance: 2000 },
            ];
            const { container } = render(<FloorTreasuryChart data={data} />);
            const paths = container.querySelectorAll('path');
            const svg = container.querySelector('svg');
            expect(svg).toBeDefined();
            // Should have 2 paths for the 2 data items
            expect(paths.length).toBe(2);
            expect(container.textContent).toContain('Global Total');
        });
    });

    describe('ActivityTrendChart', () => {
        it('renders with data', () => {
            const data = [10, 20, 15, 30];
            const { container } = render(<ActivityTrendChart data={data} />);
            const polyline = container.querySelector('polyline');
            expect(polyline).toBeDefined();
        });
    });
});
