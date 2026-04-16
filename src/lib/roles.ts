import type { UserType, CompanyType } from '@/types/database';

export const ADMIN_TYPES: UserType[] = ['SUPERADMIN', 'Sa', 'Au'];

export const USER_TYPE_LABELS: Record<UserType, string> = {
  SUPERADMIN: 'Super Admin',
  Sa: 'System Admin',
  Au: 'Admin User',
  Reu: 'Real Estate User',
  Su: 'Supplier User',
  Eu: 'Electrician User',
  Gu: 'Guest User',
};

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  REU: 'Real Estate',
  SU: 'Supplier',
  EU: 'Electrician',
};

export const REGISTERABLE_TYPES: UserType[] = ['Reu', 'Su', 'Eu', 'Gu'];

export const COMPANY_SUBTYPES: Record<CompanyType, string[]> = {
  REU: ['Property Management', 'Commercial Real Estate', 'Industrial Real Estate', 'Retail Real Estate', 'Hospitality', 'Healthcare'],
  SU: ['LED Manufacturer', 'Lighting Distributor', 'Controls Manufacturer', 'General Supplier'],
  EU: ['Licensed Electrician', 'Electrical Contractor', 'Energy Auditor'],
};

export function isAdmin(userType: UserType | null | undefined): boolean {
  if (!userType) return false;
  return ADMIN_TYPES.includes(userType);
}

export function canManageUsers(userType: UserType | null | undefined): boolean {
  return isAdmin(userType);
}

export function canCreateProjects(userType: UserType | null | undefined): boolean {
  if (!userType) return false;
  return isAdmin(userType) || userType === 'Reu' || userType === 'Su';
}

export function canAccessAnalytics(userType: UserType | null | undefined): boolean {
  return isAdmin(userType);
}

export function getUserTypeColor(userType: UserType | null | undefined): string {
  switch (userType) {
    case 'SUPERADMIN': return 'pink';
    case 'Sa': return 'blue';
    case 'Au': return 'blue';
    case 'Reu': return 'purple';
    case 'Su': return 'yellow';
    case 'Eu': return 'teal';
    case 'Gu': return 'brown';
    default: return 'brown';
  }
}

export function getCompanyTypeFromUserType(userType: UserType): CompanyType | null {
  switch (userType) {
    case 'Reu': return 'REU';
    case 'Su': return 'SU';
    case 'Eu': return 'EU';
    default: return null;
  }
}
