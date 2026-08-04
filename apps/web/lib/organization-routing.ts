export function requiresOrganizationSelection(status: number, path: string): boolean {
  return path === "/organizations/current" && (status === 400 || status === 404);
}
