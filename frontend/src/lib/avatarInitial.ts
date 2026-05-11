export function getAvatarInitial(user: { firstName: string; email: string }): string {
  const first = user.firstName?.trim();
  if (first) return first.charAt(0).toUpperCase();
  return user.email.charAt(0).toUpperCase();
}
