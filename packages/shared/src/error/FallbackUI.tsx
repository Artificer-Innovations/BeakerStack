interface Props {
  error: Error;
  reset: () => void;
  level?: 'screen' | 'root';
}

export function FallbackUI({ error, reset, level = 'screen' }: Props) {
  const isRoot = level === 'root';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', ...(isRoot ? { minHeight: '100vh' } : { padding: 24 }), padding: 24, backgroundColor: '#f9fafb' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8, margin: '0 0 8px' }}>Something went wrong</h2>
      <p style={{ fontSize: 14, color: '#dc2626', textAlign: 'center', marginBottom: 24, margin: '0 0 24px' }}>{error.message}</p>
      <button
        onClick={reset}
        style={{ backgroundColor: '#111827', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer', minWidth: 160, marginBottom: 12 }}
      >
        Try again
      </button>
      {!isRoot && (
        <button
          onClick={() => window.history.back()}
          style={{ backgroundColor: '#fff', color: '#111827', border: '1px solid #111827', padding: '12px 32px', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer', minWidth: 160 }}
        >
          Go back
        </button>
      )}
    </div>
  );
}
