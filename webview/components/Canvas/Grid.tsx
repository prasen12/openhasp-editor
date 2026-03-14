import React from 'react';
import './Grid.css';

interface GridProps {
  size?: number;
}

export const Grid: React.FC<GridProps> = ({ size = 10 }) => {
  return (
    <svg className="canvas-grid" style={{ pointerEvents: 'none' }}>
      <defs>
        <pattern
          id="grid-pattern"
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
        >
          <path
            d={`M ${size} 0 L 0 0 0 ${size}`}
            fill="none"
            stroke="var(--vscode-editorRuler-foreground)"
            strokeWidth="0.5"
            opacity="0.3"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid-pattern)" />
    </svg>
  );
};
