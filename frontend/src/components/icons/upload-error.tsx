import React from 'react';

export const uploadErrorIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props
) => (
  <svg
    width='20'
    height='20'
    viewBox='0 0 20 20'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M11.666 3.33331H5.99935C5.64573 3.33331 5.30659 3.47379 5.05654 3.72384C4.80649 3.97389 4.66602 4.31302 4.66602 4.66665V15.3333C4.66602 15.6869 4.80649 16.0261 5.05654 16.2761C5.30659 16.5262 5.64573 16.6666 5.99935 16.6666H13.9993C14.353 16.6666 14.6921 16.5262 14.9422 16.2761C15.1922 16.0261 15.3327 15.6869 15.3327 15.3333V6.99998L11.666 3.33331Z'
      stroke='#EF4444'
      strokeWidth='1.33333'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M10 8V10.6667'
      stroke='#111827'
      strokeWidth='1.33333'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M10 13.3333H10.0067'
      stroke='#111827'
      strokeWidth='1.33333'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);
