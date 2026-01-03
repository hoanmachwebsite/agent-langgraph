import React from 'react';

export const miniScreenIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props
) => (
  <svg
    width='18'
    height='18'
    viewBox='0 0 18 18'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M11.25 11.25L15.75 15.75M11.25 11.25V14.85M11.25 11.25H14.85'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M6.75 14.85V11.25M6.75 11.25H3.15M6.75 11.25L2.25 15.75'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M11.25 3.15V6.75M11.25 6.75H14.85M11.25 6.75L15.75 2.25'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M6.75 3.15V6.75M6.75 6.75H3.15M6.75 6.75L2.25 2.25'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);
