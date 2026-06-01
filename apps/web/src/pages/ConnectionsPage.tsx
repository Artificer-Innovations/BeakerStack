import { useMemo, useState, type ReactNode } from 'react';
import {
  ConnectionSearchPanel,
  ConnectionUserRow,
} from '@beakerstack/connections/web';
import {
  useConnections,
  connectionsAccept,
  connectionsDecline,
  connectionsDisconnect,
  connectionsUnblock,
  mapUnknownError,
} from '@beakerstack/connections';
import { useAuthContext } from '@beakerstack/shared/contexts/AuthContext';
import { getAdopterConfig } from '@beakerstack/shared/config/adopterRuntime';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';
import { AppHeaderWithAdmin } from '../components/AppHeaderWithAdmin';
import { supabase } from '../lib/supabase';

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className='bg-white dark:bg-gray-800 shadow rounded-lg p-6'>
      <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ConnectionsPage() {
  const { branding } = getAdopterConfig();
  const auth = useAuthContext();
  const userId = auth.loading ? null : (auth.user?.id ?? null);
  const [disconnectId, setDisconnectId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    rows: allRows,
    loading: listLoading,
    refresh: refreshAll,
  } = useConnections({ supabase, userId });

  const incoming = useMemo(
    () =>
      allRows.filter(
        r =>
          r.recipient_user_id === userId &&
          r.effective_status === 'pending' &&
          !r.is_initiator
      ),
    [allRows, userId]
  );

  const accepted = useMemo(
    () => allRows.filter(r => r.effective_status === 'accepted'),
    [allRows]
  );

  const outgoingPending = useMemo(
    () =>
      allRows.filter(
        r =>
          r.is_initiator &&
          (r.effective_status === 'pending' ||
            r.effective_status === 'expired_pending')
      ),
    [allRows]
  );

  const blocked = useMemo(
    () => allRows.filter(r => r.status === 'blocked' && r.is_initiator),
    [allRows]
  );

  const refresh = () => {
    void refreshAll();
  };

  const runAction = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    setActionError(null);
    try {
      await fn();
      refresh();
    } catch (e) {
      setActionError(mapUnknownError(e).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      <AppHeaderWithAdmin />
      <ContentContainer className='py-6 space-y-6'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
            Connections
          </h1>
          <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
            Find and manage mutual connections with other {branding.displayName}{' '}
            users.
          </p>
        </div>

        {actionError ? (
          <p className='text-sm text-red-600 dark:text-red-400' role='alert'>
            {actionError}
          </p>
        ) : null}

        <SectionCard title='Find people'>
          <ConnectionSearchPanel supabase={supabase} onRequested={refresh} />
        </SectionCard>

        <SectionCard title='Incoming requests'>
          {listLoading && (
            <p className='text-sm text-gray-500 dark:text-gray-400'>Loading…</p>
          )}
          {!listLoading && incoming.length === 0 && (
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              No pending requests.
            </p>
          )}
          {incoming.map(row => (
            <ConnectionUserRow
              key={row.id}
              username={row.username}
              displayName={row.display_name}
              avatarUrl={row.avatar_url}
              subtitle='Wants to connect'
              actions={
                <>
                  <button
                    type='button'
                    disabled={busyId === row.id}
                    onClick={() =>
                      void runAction(row.id, () =>
                        connectionsAccept(supabase, row.id)
                      )
                    }
                    className='px-3 py-1.5 text-sm font-medium rounded-md bg-primary-600 text-white disabled:opacity-50'
                  >
                    Accept
                  </button>
                  <button
                    type='button'
                    disabled={busyId === row.id}
                    onClick={() =>
                      void runAction(row.id, () =>
                        connectionsDecline(supabase, row.id)
                      )
                    }
                    className='px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50'
                  >
                    Decline
                  </button>
                </>
              }
            />
          ))}
        </SectionCard>

        <SectionCard title='Your connections'>
          {listLoading && (
            <p className='text-sm text-gray-500 dark:text-gray-400'>Loading…</p>
          )}
          {!listLoading && accepted.length === 0 && (
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              No connections yet.
            </p>
          )}
          {accepted.map(row => (
            <ConnectionUserRow
              key={row.id}
              username={row.username}
              displayName={row.display_name}
              avatarUrl={row.avatar_url}
              actions={
                <button
                  type='button'
                  onClick={() => setDisconnectId(row.id)}
                  className='px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                >
                  Disconnect
                </button>
              }
            />
          ))}
        </SectionCard>

        {outgoingPending.length > 0 && (
          <SectionCard title='Sent requests'>
            {outgoingPending.map(row => (
              <ConnectionUserRow
                key={row.id}
                username={row.username}
                displayName={row.display_name}
                avatarUrl={row.avatar_url}
                subtitle={
                  row.effective_status === 'expired_pending'
                    ? 'Expired — search again to resend'
                    : 'Pending'
                }
              />
            ))}
          </SectionCard>
        )}

        {blocked.length > 0 && (
          <SectionCard title='Blocked'>
            {blocked.map(row => (
              <ConnectionUserRow
                key={row.id}
                username={row.username}
                displayName={row.display_name}
                avatarUrl={row.avatar_url}
                actions={
                  <button
                    type='button'
                    disabled={busyId === row.id}
                    onClick={() =>
                      void runAction(row.id, async () => {
                        await connectionsUnblock(
                          supabase,
                          row.recipient_user_id
                        );
                      })
                    }
                    className='px-3 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50'
                  >
                    Unblock
                  </button>
                }
              />
            ))}
          </SectionCard>
        )}
      </ContentContainer>

      {disconnectId !== null && (
        <div
          className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
          role='dialog'
          aria-modal='true'
          aria-labelledby='disconnect-title'
        >
          <div className='w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl'>
            <h2
              id='disconnect-title'
              className='text-lg font-semibold text-gray-900 dark:text-white'
            >
              Disconnect?
            </h2>
            <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
              They will no longer be in your connections. Either of you can send
              a new request later.
            </p>
            <div className='mt-6 flex justify-end gap-3'>
              <button
                type='button'
                onClick={() => setDisconnectId(null)}
                className='px-4 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={() => {
                  const id = disconnectId;
                  setDisconnectId(null);
                  if (id) {
                    void runAction(id, () =>
                      connectionsDisconnect(supabase, id)
                    );
                  }
                }}
                className='px-4 py-2 text-sm font-medium rounded-md bg-primary-600 text-white'
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
