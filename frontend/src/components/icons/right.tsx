import React from 'react';

export const rightIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width='16'
    height='16'
    viewBox='0 0 16 16'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <g clipPath='url(#clip0_4954_87682)'>
      <path
        d='M1 8H15'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M8 1L15 8L8 15'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </g>
    <defs>
      <clipPath id='clip0_4954_87682'>
        <rect width='16' height='16' fill='currentColor' />
      </clipPath>
    </defs>
  </svg>
);
