/**
 * Test fixtures for user data
 */

export const mockUsers = {
  admin: {
    id: 'user-admin-001',
    clerk_id: 'clerk_admin_123',
    email: 'admin@judgefinder.io',
    is_admin: true,
    is_verified_lawyer: false,
    bar_number: null,
    jurisdiction: 'CA',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },

  verifiedLawyer: {
    id: 'user-lawyer-001',
    clerk_id: 'clerk_lawyer_456',
    email: 'lawyer@lawfirm.com',
    is_admin: false,
    is_verified_lawyer: true,
    bar_number: 'CA123456',
    jurisdiction: 'CA',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },

  regularUser: {
    id: 'user-regular-001',
    clerk_id: 'clerk_user_789',
    email: 'user@example.com',
    is_admin: false,
    is_verified_lawyer: false,
    bar_number: null,
    jurisdiction: 'CA',
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-10T00:00:00Z',
  },

  unverifiedLawyer: {
    id: 'user-lawyer-002',
    clerk_id: 'clerk_lawyer_999',
    email: 'pending@lawfirm.com',
    is_admin: false,
    is_verified_lawyer: false,
    bar_number: 'CA654321',
    jurisdiction: 'CA',
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
  },
}

export function createMockUser(overrides: Partial<typeof mockUsers.regularUser> = {}) {
  return {
    ...mockUsers.regularUser,
    ...overrides,
  }
}

export const mockClerkUser = {
  id: 'clerk_user_789',
  emailAddresses: [{ emailAddress: 'user@example.com' }],
  firstName: 'Test',
  lastName: 'User',
  createdAt: new Date('2024-01-10').getTime(),
  updatedAt: new Date('2024-01-10').getTime(),
}

export const mockClerkSession = {
  userId: 'clerk_user_789',
  sessionId: 'sess_123abc',
  status: 'active' as const,
}
