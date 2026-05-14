import type { ReactNode } from 'react';

type TagVariant = 'usage' | 'gate' | 'feature';

interface AnnotatedPrimitiveProps {
  tag: string;
  variant: TagVariant;
  tooltip?: string;
  children: ReactNode;
}

const dotColor: Record<TagVariant, string> = {
  usage: 'bg-amber-400',
  gate: 'bg-blue-400',
  feature: 'bg-green-400',
};

export function AnnotatedPrimitive({
  tag,
  variant,
  tooltip,
  children,
}: AnnotatedPrimitiveProps) {
  return (
    <div className='relative rounded-xl border-2 border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-400 dark:hover:border-purple-600 transition-colors p-5 pt-8'>
      <div
        className='absolute -top-3 left-4 flex items-center gap-1.5 rounded bg-slate-900 px-2.5 py-1 shadow-sm'
        title={tooltip}
        aria-label={tooltip ? `${tag} — ${tooltip}` : tag}
      >
        <span
          className={`h-2 w-2 rounded-full shrink-0 ${dotColor[variant]}`}
          aria-hidden
        />
        <code className='font-mono text-xs text-purple-300 whitespace-nowrap'>
          {tag}
        </code>
      </div>
      {children}
    </div>
  );
}
