export const SUPER_ADMIN_EMAIL =
  process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() ||
  "abhimandewangan29@gmail.com";

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  return (email || "").trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}
