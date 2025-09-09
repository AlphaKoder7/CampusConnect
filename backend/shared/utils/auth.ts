export interface UserPrincipal {
  userId: string;
  userDetails: string;
  identityProvider: string;
  userRoles: string[];
}

export function parseUserPrincipal(header: string | null | undefined): UserPrincipal | null {
  if (!header) {
    return null;
  }

  try {
    const decoded = Buffer.from(header, 'base64').toString('utf-8');
    return JSON.parse(decoded) as UserPrincipal;
  } catch (error) {
    console.error('Error parsing user principal:', error);
    return null;
  }
}
