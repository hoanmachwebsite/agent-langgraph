import React from 'react';

export const fullScreenIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
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
      d='M15.75 15.75L11.25 11.25M15.75 15.75V12.15M15.75 15.75H12.15'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M2.25 12.15V15.75M2.25 15.75H5.85M2.25 15.75L6.75 11.25'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M15.75 5.85V2.25M15.75 2.25H12.15M15.75 2.25L11.25 6.75'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M2.25 5.85V2.25M2.25 2.25H5.85M2.25 2.25L6.75 6.75'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);
