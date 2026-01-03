import React from "react";
import { cn } from "@/lib/utils";

export const processingSpinnerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (
  props
) => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 26 26"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
    className={cn("animate-spin", props?.className)}
  >
    <path
      d="M21.3572 3.71429V9.28572H15.7858"
      stroke="#25CAD3"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4.64288 13C4.64435 11.3874 5.11237 9.80961 5.99048 8.45701C6.86859 7.10442 8.11928 6.03477 9.59171 5.37708C11.0641 4.7194 12.6954 4.50177 14.2888 4.75045C15.8821 4.99913 17.3695 5.7035 18.5715 6.77859L21.3572 9.28573"
      stroke="#25CAD3"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4.64288 22.2857V16.7143H10.2143"
      stroke="#25CAD3"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M21.3572 13C21.3557 14.6126 20.8877 16.1904 20.0096 17.543C19.1315 18.8956 17.8808 19.9652 16.4083 20.6229C14.9359 21.2806 13.3046 21.4982 11.7113 21.2496C10.118 21.0009 8.63058 20.2965 7.4286 19.2214L4.64288 16.7143"
      stroke="#25CAD3"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
