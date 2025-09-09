export interface SwaClientPrincipal {
    identityProvider: string;
    userId: string;
    userDetails: string;
    userRoles: string[];
}

export function parseSwaClientPrincipal(headerValue?: string | null): SwaClientPrincipal | null {
    if (!headerValue) return null;
    try {
        const decoded = Buffer.from(headerValue, 'base64').toString('utf8');
        const obj = JSON.parse(decoded);
        return {
            identityProvider: obj.identityProvider,
            userId: obj.userId,
            userDetails: obj.userDetails,
            userRoles: Array.isArray(obj.userRoles) ? obj.userRoles : []
        };
    } catch {
        return null;
    }
}


