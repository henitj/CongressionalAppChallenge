/**
 * The name we show in the UI.
 *
 * Setup collects first/last name on the profile. Sign-in may have a different
 * Google or guest name. Home used to greet with the sign-in name and then
 * clip it to "Good morning, H…" — both of those are wrong.
 */

export function firstNameOf(profileFirst?: string | null, userName?: string | null): string {
  const fromProfile = (profileFirst ?? '').trim();
  if (fromProfile) return fromProfile.split(/\s+/)[0];

  const fromUser = (userName ?? '').trim();
  if (!fromUser) return 'there';

  const first = fromUser.split(/\s+/)[0];
  if (!first || first.toLowerCase() === 'guest') return 'there';
  return first;
}

export function fullNameOf(
  profile?: { firstName?: string; lastName?: string } | null,
  userName?: string | null
): string {
  const assembled = `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim();
  if (assembled) return assembled;
  const fromUser = (userName ?? '').trim();
  if (fromUser && fromUser.toLowerCase() !== 'guest trekker') return fromUser;
  return 'Trekker';
}
