/**
 * Utility functions for email masking to enhance privacy in admin interfaces
 */

/**
 * Masks an email address for privacy
 * Example: "john.doe@example.com" -> "jo***@***.com"
 * 
 * @param email - The email address to mask
 * @param showFull - If true, returns the full email without masking
 * @returns The masked or full email
 */
export function maskEmail(email: string, showFull: boolean = false): string {
  if (!email) return '';
  if (showFull) return email;

  const parts = email.split('@');
  if (parts.length !== 2) return email;

  const [localPart, domain] = parts;
  const domainParts = domain.split('.');
  
  // Mask local part: show first 2 characters, then ***
  const maskedLocal = localPart.length > 2 
    ? `${localPart.slice(0, 2)}***`
    : `${localPart[0] || ''}***`;

  // Mask domain: show only TLD
  const tld = domainParts[domainParts.length - 1];
  const maskedDomain = `***.${tld}`;

  return `${maskedLocal}@${maskedDomain}`;
}

/**
 * Checks if the current user has permission to view unmasked emails
 * For now, this always returns false - admins must explicitly click to reveal
 */
export function canViewUnmaskedEmails(): boolean {
  return false;
}

/**
 * Action labels for audit log display
 */
export const ADMIN_ACTION_LABELS: Record<string, string> = {
  'ADMIN_LIST_USERS': 'Liste des utilisateurs consultée',
  'ADMIN_LIST_USERS_WITH_EMAILS': 'Liste des utilisateurs avec emails consultée',
  'ADMIN_ROLE_CHANGED': 'Rôle utilisateur modifié',
  'ADMIN_ROLE_CHANGE_FAILED': 'Échec de modification de rôle',
  'ADMIN_VIEW_AUDIT_LOGS': 'Logs d\'audit consultés',
};

/**
 * Get a human-readable label for an admin action
 */
export function getActionLabel(action: string): string {
  return ADMIN_ACTION_LABELS[action] || action;
}

/**
 * Format audit log details for display
 */
export function formatAuditDetails(
  oldValues: unknown | null,
  newValues: unknown | null
): string {
  const parts: string[] = [];

  const oldObj = oldValues as Record<string, unknown> | null;
  const newObj = newValues as Record<string, unknown> | null;

  if (oldObj?.role && newObj?.role && oldObj.role !== newObj.role) {
    parts.push(`Rôle: ${oldObj.role} → ${newObj.role}`);
  }

  if (newObj?.users_count) {
    parts.push(`${newObj.users_count} utilisateurs`);
  }

  if (newObj?.accessed_pii) {
    parts.push('Accès PII');
  }

  if (newObj?.accessed_auth_emails) {
    parts.push('Accès emails auth');
  }

  if (newObj?.error) {
    parts.push(`Erreur: ${newObj.error}`);
  }

  return parts.join(' • ') || '—';
}
