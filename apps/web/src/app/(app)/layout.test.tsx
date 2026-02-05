import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import type { User } from '@tripful/shared';
import ProtectedLayout from './layout';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock auth provider
const mockUseAuth = vi.fn();
vi.mock('@/app/providers/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ProtectedLayout', () => {
  const mockPush = vi.fn();
  const mockUser: User = {
    id: '123',
    phoneNumber: '+15551234567',
    displayName: 'Test User',
    timezone: 'America/New_York',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
    } as any);
    mockPush.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(
      <ProtectedLayout>
        <div>Protected Content</div>
      </ProtectedLayout>
    );

    expect(screen.getByText('Protected Content')).toBeDefined();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows loading state while checking auth', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    render(
      <ProtectedLayout>
        <div>Protected Content</div>
      </ProtectedLayout>
    );

    expect(screen.getByText('Loading...')).toBeDefined();
    expect(screen.queryByText('Protected Content')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('redirects to /login when not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(
      <ProtectedLayout>
        <div>Protected Content</div>
      </ProtectedLayout>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    expect(screen.queryByText('Protected Content')).toBeNull();
  });

  it('does not render children before redirect', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    const { container } = render(
      <ProtectedLayout>
        <div>Protected Content</div>
      </ProtectedLayout>
    );

    // Should return null, not render children
    expect(screen.queryByText('Protected Content')).toBeNull();
    // Container should be empty (null renders nothing)
    expect(container.innerHTML).toBe('');
  });

  it('does not redirect while loading is true', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    render(
      <ProtectedLayout>
        <div>Protected Content</div>
      </ProtectedLayout>
    );

    // Should not redirect immediately while loading
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByText('Loading...')).toBeDefined();
  });
});
