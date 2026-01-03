import React from 'react';

export const checkedSolidIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
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
      d='M40 12L18 34L8 24'
      stroke='#84CC16'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

export const checkedSolidWhiteIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props
) => (
  <svg
    width='21'
    height='21'
    viewBox='0 0 21 21'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M17.1673 5.5L8.00065 14.6667L3.83398 10.5'
      stroke='white'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

export const checkedSolidGrayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props
) => (
  <svg
    width='19'
    height='19'
    viewBox='0 0 19 19'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='M16.0303 4.46967C16.3232 4.76256 16.3232 5.23744 16.0303 5.53033L7.78033 13.7803C7.48744 14.0732 7.01256 14.0732 6.71967 13.7803L2.96967 10.0303C2.67678 9.73744 2.67678 9.26256 2.96967 8.96967C3.26256 8.67678 3.73744 8.67678 4.03033 8.96967L7.25 12.1893L14.9697 4.46967C15.2626 4.17678 15.7374 4.17678 16.0303 4.46967Z'
      fill='currentColor'
    />
  </svg>
);

export const checkedSolidGraySmallIcon: React.FC<
  React.SVGProps<SVGSVGElement>
> = (props) => (
  <svg
    width='8'
    height='9'
    viewBox='0 0 8 9'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='M6.90237 2.26413C7.03254 2.39431 7.03254 2.60536 6.90237 2.73554L3.2357 6.40221C3.10553 6.53238 2.89447 6.53238 2.7643 6.40221L1.09763 4.73554C0.967456 4.60536 0.967456 4.39431 1.09763 4.26414C1.22781 4.13396 1.43886 4.13396 1.56904 4.26414L3 5.6951L6.43096 2.26413C6.56114 2.13396 6.77219 2.13396 6.90237 2.26413Z'
      fill='currentColor'
    />
  </svg>
);
