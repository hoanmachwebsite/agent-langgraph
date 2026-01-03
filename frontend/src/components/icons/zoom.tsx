import React from 'react';

export const zoomInIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width='19'
    height='18'
    viewBox='0 0 19 18'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M8.9165 14.25C12.2302 14.25 14.9165 11.5637 14.9165 8.25C14.9165 4.93629 12.2302 2.25 8.9165 2.25C5.6028 2.25 2.9165 4.93629 2.9165 8.25C2.9165 11.5637 5.6028 14.25 8.9165 14.25Z'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M16.4163 15.75L13.1538 12.4875'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M8.9165 6V10.5'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <path
      d='M6.6665 8.25H11.1665'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
);

export const zoomOutIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width='18'
    height='18'
    viewBox='0 0 18 18'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <g clipPath='url(#clip0_17717_51233)'>
      <path
        d='M8.25 14.25C11.5637 14.25 14.25 11.5637 14.25 8.25C14.25 4.93629 11.5637 2.25 8.25 2.25C4.93629 2.25 2.25 4.93629 2.25 8.25C2.25 11.5637 4.93629 14.25 8.25 14.25Z'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M17.9999 18L13.6499 13.65'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M6 8.25H10.5'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </g>
    <defs>
      <clipPath id='clip0_17717_51233'>
        <rect width='18' height='18' fill='white' />
      </clipPath>
    </defs>
  </svg>
);
