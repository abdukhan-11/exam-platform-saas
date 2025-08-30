'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';

export function VirtualizedList({
  items,
  itemHeight,
  height,
  renderItem,
  overscan = 8,
}: {
  items: any[];
  itemHeight: number;
  height: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  overscan?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleCount = Math.ceil(height / itemHeight) + overscan * 2;
  const endIndex = Math.min(items.length - 1, startIndex + visibleCount);
  const offsetY = startIndex * itemHeight;

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const slice = useMemo(() => items.slice(startIndex, endIndex + 1), [items, startIndex, endIndex]);

  return (
    <div ref={containerRef} onScroll={onScroll} style={{ height, overflowY: 'auto', position: 'relative' }}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}>
          {slice.map((item, i) => renderItem(item, startIndex + i))}
        </div>
      </div>
    </div>
  );
}

export default VirtualizedList;


