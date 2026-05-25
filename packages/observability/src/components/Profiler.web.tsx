import React from 'react';

interface ProfilerProps {
  name: string;
  children: React.ReactNode;
  onRender?: React.ProfilerOnRenderCallback;
}

const noop: React.ProfilerOnRenderCallback = () => {};

export function Profiler({ name, children, onRender }: ProfilerProps) {
  return (
    <React.Profiler id={name} onRender={onRender ?? noop}>
      {children}
    </React.Profiler>
  );
}
