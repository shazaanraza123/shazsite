import { cn } from '@/lib/utils';

interface SectionBarProps {
  cols: [string, string, string, string];
  className?: string;
}

export function SectionBar({ cols, className }: SectionBarProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 md:grid-cols-4 border-b border-neutral-200 text-[9px] font-mono uppercase tracking-widest',
        className
      )}
    >
      {cols.map((label, idx) => (
        <div
          key={idx}
          className={cn(
            'p-3',
            idx < 3 && 'border-r border-neutral-200',
            (idx === 1 || idx === 2) && 'hidden md:block'
          )}
        >
          {label}
        </div>
      ))}
    </div>
  );
}
