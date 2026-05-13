import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Props {
  error: Error;
  reset: () => void;
  level?: 'screen' | 'root';
}

const containerBase: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  backgroundColor: '#f9fafb',
};

const titleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  color: '#111827',
  margin: '0 0 8px',
};

const messageStyle: React.CSSProperties = {
  fontSize: 14,
  color: '#dc2626',
  textAlign: 'center',
  margin: '0 0 24px',
};

const primaryBtn: React.CSSProperties = {
  backgroundColor: '#111827',
  color: '#fff',
  border: 'none',
  padding: '12px 32px',
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
  minWidth: 160,
  marginBottom: 12,
};

const secondaryBtn: React.CSSProperties = {
  backgroundColor: '#fff',
  color: '#111827',
  border: '1px solid #111827',
  padding: '12px 32px',
  borderRadius: 8,
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
  minWidth: 160,
};

function ScreenFallbackWeb({ error, reset }: { error: Error; reset: () => void }) {
  const navigate = useNavigate();
  return (
    <div style={containerBase}>
      <h2 style={titleStyle}>Something went wrong</h2>
      <p style={messageStyle}>{error.message}</p>
      <button onClick={reset} style={primaryBtn}>Try again</button>
      <button onClick={() => navigate(-1)} style={secondaryBtn}>Go back</button>
    </div>
  );
}

export function FallbackUI({ error, reset, level = 'screen' }: Props) {
  if (level === 'root') {
    return (
      <div style={{ ...containerBase, minHeight: '100vh' }}>
        <h2 style={titleStyle}>Something went wrong</h2>
        <p style={messageStyle}>{error.message}</p>
        <button onClick={reset} style={primaryBtn}>Try again</button>
      </div>
    );
  }
  return <ScreenFallbackWeb error={error} reset={reset} />;
}
