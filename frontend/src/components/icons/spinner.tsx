import * as React from 'react';

interface SpinnerProps {
  width: number;
  height: number;
  style?: React.CSSProperties;
}

export const spinnerIcon: React.FC<SpinnerProps> = ({
  width,
  height,
  style,
}) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox='0 0 100 100'
      xmlns='http://www.w3.org/2000/svg'
      style={style}
    >
      <defs>
        <linearGradient id='gradient' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stopColor='#25CAD3' />
          <stop offset='100%' stopColor='rgba(37, 202, 211, 0)' />
        </linearGradient>
        <clipPath id='clip'>
          <circle cx='50' cy='50' r='45' />
        </clipPath>
      </defs>
      <circle
        cx='50'
        cy='50'
        r='45'
        fill='none'
        stroke='url(#gradient)'
        strokeWidth='var(--spinner-deep, 4)'
        strokeDasharray='283'
        strokeDashoffset='70'
        clipPath='url(#clip)'
      >
        <animateTransform
          attributeName='transform'
          type='rotate'
          from='0 50 50'
          to='360 50 50'
          dur='1s'
          repeatCount='indefinite'
        />
      </circle>
    </svg>
  );
};
