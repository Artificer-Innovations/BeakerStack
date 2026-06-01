/** Matches Postgres enum `public.connection_discoverability`. */
export const CONNECTION_DISCOVERABILITY_VALUES = [
  'searchable',
  'username_only',
  'hidden',
] as const;

export type ConnectionDiscoverability =
  (typeof CONNECTION_DISCOVERABILITY_VALUES)[number];

export function isConnectionDiscoverability(
  value: string
): value is ConnectionDiscoverability {
  return (CONNECTION_DISCOVERABILITY_VALUES as readonly string[]).includes(
    value
  );
}

export const CONNECTION_DISCOVERABILITY_LABELS: Record<
  ConnectionDiscoverability,
  { title: string; description: string }
> = {
  searchable: {
    title: 'Searchable',
    description:
      'Appear in People search by username or display name. Anyone can send a connection request.',
  },
  username_only: {
    title: 'Username only',
    description:
      'Hidden from browse-style search. Others can find you on People only by entering your full username, then Connect.',
  },
  hidden: {
    title: 'Hidden',
    description:
      'Do not appear in People search and do not accept new connection requests.',
  },
};
