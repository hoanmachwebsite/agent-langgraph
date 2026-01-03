import React from 'react';

export const uploadingIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props
) => (
  <svg
    width='20'
    height='24'
    viewBox='0 0 20 24'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      d='M3.33345 12.4159C2.71432 11.7833 2.24726 11.0181 1.96765 10.1783C1.68804 9.33851 1.60321 8.44607 1.71959 7.56862C1.83597 6.69117 2.1505 5.8517 2.63937 5.11382C3.12823 4.37593 3.77861 3.75897 4.54123 3.30966C5.30385 2.86036 6.15873 2.5905 7.04109 2.52052C7.92346 2.45054 8.81018 2.58228 9.63409 2.90575C10.458 3.22923 11.1975 3.73596 11.7966 4.38757C12.3956 5.03917 12.8386 5.81856 13.0918 6.6667H14.5835C15.388 6.66661 16.1713 6.92531 16.8176 7.40457C17.4639 7.88384 17.9389 8.55826 18.1724 9.32821C18.406 10.0982 18.3857 10.9228 18.1146 11.6803C17.8434 12.4379 17.3359 13.0881 16.6668 13.535'
      stroke='#25CAD3'
      strokeWidth='1.33333'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <g className='animate-uploading opacity-100'>
      <path
        d='M10 15V22.5'
        stroke='#25CAD3'
        strokeWidth='1.33333'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M13.3337 18.3333L10.0003 15L6.66699 18.3333'
        stroke='#25CAD3'
        strokeWidth='1.33333'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </g>
  </svg>
);

export const uploadingLargeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
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
      d='M4.33378 16.1406C3.52891 15.3182 2.92173 14.3235 2.55824 13.2317C2.19474 12.14 2.08446 10.9798 2.23576 9.83914C2.38705 8.69845 2.79594 7.60715 3.43147 6.64789C4.06699 5.68864 4.91248 4.88659 5.90389 4.3025C6.8953 3.7184 8.00664 3.36758 9.15371 3.27661C10.3008 3.18563 11.4535 3.35689 12.5246 3.77741C13.5957 4.19793 14.557 4.85668 15.3358 5.70377C16.1146 6.55086 16.6904 7.56407 17.0196 8.66665H18.9588C20.0048 8.66653 21.023 9.00283 21.8632 9.62587C22.7033 10.2489 23.3208 11.1257 23.6244 12.1266C23.9281 13.1275 23.9017 14.1996 23.5492 15.1844C23.1968 16.1692 22.5369 17.0145 21.6671 17.5955'
      stroke='#25CAD3'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
    <g className='animate-uploading opacity-100'>
      <path
        d='M13 13V22.75'
        stroke='#25CAD3'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M17.3327 17.3333L12.9993 13L8.66602 17.3333'
        stroke='#25CAD3'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </g>
  </svg>
);
