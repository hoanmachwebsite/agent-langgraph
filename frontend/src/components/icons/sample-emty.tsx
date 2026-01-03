import React from 'react';

export const sampleEmptyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props
) => (
  <svg
    width='32'
    height='32'
    viewBox='0 0 32 32'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M19.334 2.66699H8.00065C7.29341 2.66699 6.61513 2.94794 6.11503 3.44804C5.61494 3.94814 5.33398 4.62642 5.33398 5.33366V26.667C5.33398 27.3742 5.61494 28.0525 6.11503 28.5526C6.61513 29.0527 7.29341 29.3337 8.00065 29.3337H24.0006C24.7079 29.3337 25.3862 29.0527 25.8863 28.5526C26.3864 28.0525 26.6673 27.3742 26.6673 26.667V10.0003L19.334 2.66699Z'
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M18.666 2.66699V10.667H26.666'
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);
