import React from 'react';

export const chevronUpDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props
) => (
  <svg
    width='16'
    height='16'
    viewBox='0 0 16 16'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M4.66666 10L7.99999 13.3333L11.3333 10'
      stroke='currentColor'
      strokeWidth='1.33'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M4.66666 6.00008L7.99999 2.66675L11.3333 6.00008'
      stroke='currentColor'
      strokeWidth='1.33'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);
