import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MetadataStripProps {
  cols: [ReactNode, ReactNode, ReactNode, ReactNode];
  className?: string;
}

export function MetadataStrip({ cols, className }: MetadataStripProps) {
  return (
    <div className={cn("grid grid-cols-4 border-b border-gray-200 text-[9px] font-mono uppercase tracking-widest", className)}>
      {cols.map((content, idx) => (
        <div 
          key={idx} 
          className={cn(
            "p-3 flex items-start",
            idx < 3 && "border-r border-gray-200"
          )}
        >
          {content}
        </div>
      ))}
    </div>
  );
}
