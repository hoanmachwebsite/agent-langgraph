import React from 'react';

export const checkedGreenIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props
) => (
  <svg
    width='48'
    height='48'
    viewBox='0 0 48 48'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M24 44C35.046 44 44 35.046 44 24C44 12.954 35.046 4 24 4C12.954 4 4 12.954 4 24C4 35.046 12.954 44 24 44Z'
      fill='#84CC16'
      stroke='#84CC16'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M18 24L22 28L30 20'
      stroke='white'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

export const checkedSolidGreenIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props
) => (
  <svg
    width='26'
    height='26'
    viewBox='0 0 26 26'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M21.6673 6.5L9.75065 18.4167L4.33398 13'
      stroke='#84CC16'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);
