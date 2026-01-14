import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ReactNode } from 'react';

// Mock useAuth before importing the hook
vi.mock('../useAuth', () => ({
    useAuth: () => ({
        session: { user: { id: 'test-user-id' } },
        loading: false,
        signIn: vi.fn(),
        signOut: vi.fn(),
    }),
    AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// Import after mocks are set up
import { useDossiers } from '../useDossiers';

// Create wrapper with QueryClient
const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
        },
    });
    return ({ children }: { children: ReactNode }) => (
        <BrowserRouter>
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </BrowserRouter>
    );
};

describe('useDossiers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return a query result object', () => {
        const { result } = renderHook(() => useDossiers(), {
            wrapper: createWrapper(),
        });

        // Hook should return a query result
        expect(result.current).toBeDefined();
        expect('isLoading' in result.current).toBe(true);
        expect('isError' in result.current).toBe(true);
        expect('refetch' in result.current).toBe(true);
    });

    it('should have loading state properties', () => {
        const { result } = renderHook(() => useDossiers(), {
            wrapper: createWrapper(),
        });

        // Check that the hook returns expected properties
        expect(typeof result.current.isLoading).toBe('boolean');
        expect(typeof result.current.isError).toBe('boolean');
        expect(typeof result.current.isFetching).toBe('boolean');
    });

    it('should support refetch function', () => {
        const { result } = renderHook(() => useDossiers(), {
            wrapper: createWrapper(),
        });

        expect(typeof result.current.refetch).toBe('function');
    });

    it('should handle data as undefined or array', async () => {
        const { result } = renderHook(() => useDossiers(), {
            wrapper: createWrapper(),
        });

        // Data should be undefined initially or an array after loading
        await waitFor(() => {
            const data = result.current.data;
            expect(data === undefined || Array.isArray(data)).toBe(true);
        });
    });
});
