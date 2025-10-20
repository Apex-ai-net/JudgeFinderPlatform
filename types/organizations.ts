/**
 * TypeScript types for Multi-Tenant Organization System
 * Generated from: supabase/migrations/20251018_010_multi_tenant_organizations.sql
 */

// =====================================================
// ENUMS
// =====================================================

export type OrganizationType = 'law_firm' | 'legal_services' | 'individual' | 'other';

export type SubscriptionTier = 'free' | 'professional' | 'enterprise';

export type OrganizationStatus = 'active' | 'suspended' | 'inactive' | 'pending';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type FirmType = 'solo' | 'small' | 'medium' | 'large' | 'enterprise';

export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer' | 'billing';

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked';

export type ActivityEventCategory =
  | 'auth'
  | 'members'
  | 'billing'
  | 'settings'
  | 'advertising'
  | 'security';

// =====================================================
// SETTINGS & PERMISSIONS
// =====================================================

export interface OrganizationSettings {
  features: {
    advertising: boolean;
    analytics: boolean;
    api_access: boolean;
  };
  notifications: {
    email: boolean;
    slack: boolean;
  };
  branding: {
    primary_color: string;
    custom_domain: string | null;
  };
}

export interface MemberPermissions {
  advertising: {
    create_campaigns: boolean;
    edit_campaigns: boolean;
    delete_campaigns: boolean;
    view_analytics: boolean;
    manage_billing: boolean;
  };
  organization: {
    invite_members: boolean;
    remove_members: boolean;
    edit_settings: boolean;
    view_billing: boolean;
  };
  admin: {
    manage_roles: boolean;
    full_access: boolean;
  };
}

// =====================================================
// DATABASE TABLES
// =====================================================

export interface Organization {
  id: string;

  // Identity
  name: string;
  slug: string;
  owner_id: string; // Clerk user ID

  // Type & Settings
  organization_type: OrganizationType;
  subscription_tier: SubscriptionTier;

  // Seat Management
  max_members: number;

  // Billing
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_email: string | null;

  // Organization Details
  firm_type: FirmType | null;
  bar_number: string | null;
  bar_state: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  billing_address: string | null;
  website: string | null;
  logo_url: string | null;
  description: string | null;
  specializations: string[] | null;

  // Status
  status: OrganizationStatus;
  verification_status: VerificationStatus;

  // Flexible Fields
  settings: OrganizationSettings;
  metadata: Record<string, any>;

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OrganizationMember {
  id: string;

  // References
  organization_id: string;
  user_id: string; // Clerk user ID

  // Role & Permissions
  role: OrganizationRole;
  permissions: MemberPermissions;

  // Invitation Tracking
  invited_by: string | null;
  invitation_accepted_at: string | null;

  // Timestamps
  joined_at: string;
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationInvitation {
  id: string;

  // References
  organization_id: string;
  invited_by: string; // Clerk user ID

  // Invitee Info
  email: string;
  role: Exclude<OrganizationRole, 'owner'>; // Cannot invite as owner

  // Token & Security
  token: string;
  token_hash: string;

  // Lifecycle
  status: InvitationStatus;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;

  // Optional Message
  invitation_message: string | null;

  // Metadata
  metadata: Record<string, any>;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface OrganizationActivityLog {
  id: string;
  organization_id: string;

  // Actor
  user_id: string | null; // Null for system events

  // Event Details
  event_type: string;
  event_category: ActivityEventCategory;

  // Event Data
  event_data: Record<string, any>;

  // Context
  ip_address: string | null;
  user_agent: string | null;

  // Timestamp
  created_at: string;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  organization_type?: OrganizationType;
  firm_type?: FirmType;
  contact_email: string;
  contact_phone?: string;
  website?: string;
  description?: string;
  specializations?: string[];
}

export interface UpdateOrganizationRequest {
  name?: string;
  slug?: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  logo_url?: string;
  description?: string;
  specializations?: string[];
  settings?: Partial<OrganizationSettings>;
}

export interface InviteMemberRequest {
  email: string;
  role: Exclude<OrganizationRole, 'owner'>;
  invitation_message?: string;
}

export interface UpdateMemberRequest {
  role?: OrganizationRole;
  permissions?: Partial<MemberPermissions>;
}

export interface AcceptInvitationRequest {
  token: string;
}

// =====================================================
// JOINED TYPES (with relations)
// =====================================================

export interface OrganizationWithMembers extends Organization {
  members: OrganizationMember[];
  member_count: number;
}

export interface OrganizationMemberWithUser extends OrganizationMember {
  user: {
    clerk_user_id: string;
    email: string;
    full_name: string | null;
  };
}

export interface OrganizationInvitationWithOrg extends OrganizationInvitation {
  organization: Pick<Organization, 'id' | 'name' | 'slug' | 'logo_url'>;
}

// =====================================================
// UTILITY TYPES
// =====================================================

export interface OrganizationMembershipContext {
  organization: Organization;
  member: OrganizationMember;
  permissions: MemberPermissions;
  role: OrganizationRole;
}

export interface OrganizationLimits {
  max_members: number;
  current_members: number;
  can_add_members: boolean;
}

export interface OrganizationAnalytics {
  total_spend: number;
  active_campaigns: number;
  total_impressions: number;
  total_clicks: number;
  member_count: number;
}

// =====================================================
// PERMISSION HELPERS (Type Guards)
// =====================================================

export function isOwner(role: OrganizationRole): boolean {
  return role === 'owner';
}

export function isAdmin(role: OrganizationRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canManageMembers(role: OrganizationRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canManageBilling(role: OrganizationRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'billing';
}

export function canCreateCampaigns(permissions: MemberPermissions): boolean {
  return permissions.advertising.create_campaigns;
}

export function canEditCampaigns(permissions: MemberPermissions): boolean {
  return permissions.advertising.edit_campaigns;
}

export function canViewAnalytics(permissions: MemberPermissions): boolean {
  return permissions.advertising.view_analytics;
}

export function canInviteMembers(permissions: MemberPermissions): boolean {
  return permissions.organization.invite_members;
}

// =====================================================
// VALIDATION HELPERS
// =====================================================

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isInvitationValid(invitation: OrganizationInvitation): boolean {
  if (invitation.status !== 'pending') return false;

  const expiresAt = new Date(invitation.expires_at);
  const now = new Date();

  return expiresAt > now;
}

// =====================================================
// DEFAULT VALUES
// =====================================================

export const DEFAULT_ORGANIZATION_SETTINGS: OrganizationSettings = {
  features: {
    advertising: true,
    analytics: true,
    api_access: false,
  },
  notifications: {
    email: true,
    slack: false,
  },
  branding: {
    primary_color: '#3B82F6',
    custom_domain: null,
  },
};

export const OWNER_PERMISSIONS: MemberPermissions = {
  advertising: {
    create_campaigns: true,
    edit_campaigns: true,
    delete_campaigns: true,
    view_analytics: true,
    manage_billing: true,
  },
  organization: {
    invite_members: true,
    remove_members: true,
    edit_settings: true,
    view_billing: true,
  },
  admin: {
    manage_roles: true,
    full_access: true,
  },
};

export const ADMIN_PERMISSIONS: MemberPermissions = {
  advertising: {
    create_campaigns: true,
    edit_campaigns: true,
    delete_campaigns: true,
    view_analytics: true,
    manage_billing: false,
  },
  organization: {
    invite_members: true,
    remove_members: true,
    edit_settings: true,
    view_billing: true,
  },
  admin: {
    manage_roles: true,
    full_access: false,
  },
};

export const MEMBER_PERMISSIONS: MemberPermissions = {
  advertising: {
    create_campaigns: true,
    edit_campaigns: true,
    delete_campaigns: false,
    view_analytics: true,
    manage_billing: false,
  },
  organization: {
    invite_members: false,
    remove_members: false,
    edit_settings: false,
    view_billing: false,
  },
  admin: {
    manage_roles: false,
    full_access: false,
  },
};

export const VIEWER_PERMISSIONS: MemberPermissions = {
  advertising: {
    create_campaigns: false,
    edit_campaigns: false,
    delete_campaigns: false,
    view_analytics: true,
    manage_billing: false,
  },
  organization: {
    invite_members: false,
    remove_members: false,
    edit_settings: false,
    view_billing: false,
  },
  admin: {
    manage_roles: false,
    full_access: false,
  },
};

export const BILLING_PERMISSIONS: MemberPermissions = {
  advertising: {
    create_campaigns: false,
    edit_campaigns: false,
    delete_campaigns: false,
    view_analytics: true,
    manage_billing: true,
  },
  organization: {
    invite_members: false,
    remove_members: false,
    edit_settings: false,
    view_billing: true,
  },
  admin: {
    manage_roles: false,
    full_access: false,
  },
};

// =====================================================
// SUBSCRIPTION TIER LIMITS
// =====================================================

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, {
  max_members: number;
  features: string[];
}> = {
  free: {
    max_members: 5,
    features: ['basic_advertising', 'analytics'],
  },
  professional: {
    max_members: 25,
    features: ['advanced_analytics', 'api_access', 'priority_support'],
  },
  enterprise: {
    max_members: 1000,
    features: ['custom_features', 'dedicated_support', 'sso'],
  },
};

// =====================================================
// ROLE DISPLAY NAMES
// =====================================================

export const ROLE_DISPLAY_NAMES: Record<OrganizationRole, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  member: 'Member',
  viewer: 'Viewer',
  billing: 'Billing Manager',
};

export const ROLE_DESCRIPTIONS: Record<OrganizationRole, string> = {
  owner: 'Full control over organization and all resources',
  admin: 'Can manage members, campaigns, and organization settings',
  member: 'Can create and edit campaigns, view analytics',
  viewer: 'Read-only access to campaigns and analytics',
  billing: 'Can manage billing and view invoices',
};
