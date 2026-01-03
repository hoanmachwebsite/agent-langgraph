import React from 'react';

export const missingIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width='48'
    height='48'
    viewBox='0 0 48 48'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M15.72 4H32.28L44 15.72V32.28L32.28 44H15.72L4 32.28V15.72L15.72 4Z'
      fill='#EF4444'
      stroke='#EF4444'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M24 16V24'
      stroke='white'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M24 32H24.02'
      stroke='white'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);
