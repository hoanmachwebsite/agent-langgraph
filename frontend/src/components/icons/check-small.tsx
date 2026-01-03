import React from 'react';

export const checkedGrayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props
) => (
  <svg
    width='8'
    height='8'
    viewBox='0 0 8 8'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
  >
    <path
      fillRule='evenodd'
      clipRule='evenodd'
      d='M6.90237 1.7656C7.03254 1.89577 7.03254 2.10683 6.90237 2.237L3.2357 5.90367C3.10553 6.03385 2.89447 6.03385 2.7643 5.90367L1.09763 4.237C0.967456 4.10683 0.967456 3.89577 1.09763 3.7656C1.22781 3.63543 1.43886 3.63543 1.56904 3.7656L3 5.19656L6.43096 1.7656C6.56114 1.63543 6.77219 1.63543 6.90237 1.7656Z'
      fill='currentColor'
    />
  </svg>
);
