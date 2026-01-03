import React from 'react';

export const controlIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width='16'
    height='16'
    viewBox='0 0 16 16'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <g clipPath='url(#clip0_16496_61950)'>
      <rect
        x='1'
        y='1'
        width='14'
        height='14'
        rx='3'
        fill='#111827'
        stroke='currentColor'
        strokeWidth='2'
      />
      <path
        fillRule='evenodd'
        clipRule='evenodd'
        d='M10.3104 6.66628C9.84933 5.86933 8.9876 5.33317 8.00065 5.33317C6.52789 5.33317 5.33398 6.52708 5.33398 7.99984C5.33398 9.4726 6.52789 10.6665 8.00065 10.6665C8.9876 10.6665 9.84933 10.1303 10.3104 9.33339L12.0428 10.3336C11.2358 11.7282 9.72782 12.6665 8.00065 12.6665C5.42332 12.6665 3.33398 10.5772 3.33398 7.99984C3.33398 5.42251 5.42332 3.33317 8.00065 3.33317C9.72782 3.33317 11.2358 4.27146 12.0428 5.66611L10.3104 6.66628Z'
        fill='white'
      />
    </g>
    <defs>
      <clipPath id='clip0_16496_61950'>
        <rect width='16' height='16' fill='white' />
      </clipPath>
    </defs>
  </svg>
);
