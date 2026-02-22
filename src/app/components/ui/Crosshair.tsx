import { SVGProps } from 'react';

export function Crosshair({ size = 24, className, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className} 
      {...props}
    >
      <line x1="12" y1="0" x2="12" y2="24" stroke="currentColor" strokeWidth="1" />
      <line x1="0" y1="12" x2="24" y2="12" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
