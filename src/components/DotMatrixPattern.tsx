import React from 'react';

interface DotMatrixPatternProps {
  className?: string;
  opacity?: number;
}

export const DotMatrixPattern: React.FC<DotMatrixPatternProps> = ({
  className = '',
  opacity = 0.05,
}) => {
  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        opacity,
      }}
    />
  );
};
