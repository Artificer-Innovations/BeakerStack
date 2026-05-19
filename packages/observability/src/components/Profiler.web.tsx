import React from 'react';

interface ProfilerProps {
  name: string;
  children: React.ReactNode;
  onRender?: React.ProfilerOnRenderCallback;
}

export function Profiler({ name, children, onRender }: ProfilerProps) {
  const noop: React.ProfilerOnRenderCallback = () => {};
  return (
    <React.Profiler id={name} onRender={onRender ?? noop}>
      {children}
    </React.Profiler>
  );
}
