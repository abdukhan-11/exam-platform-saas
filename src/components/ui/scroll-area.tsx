'use client';

import * as React from 'react';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const ScrollArea: React.FC<ScrollAreaProps> = ({ className, children, ...props }) => {
  return (
    <div className={['overflow-auto', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  );
};

export default ScrollArea;


