import React from 'react';
import * as Icons from './icons';

export type IconName = keyof typeof Icons;

interface IconProps {
  name: IconName;
  className?: string;
  width?: number;
  height?: number;
}

export const Icon: React.FC<IconProps> = ({
  name,
  className,
  width = 16,
  height = 16,
  ...props
}) => {
  const IconComponent = Icons[name] as
    | React.ComponentType<React.SVGProps<SVGSVGElement>>
    | undefined;

  if (!IconComponent) {
    console.warn(`Icon with name "${name}" not found`);
    return null;
  }

  return (
    <IconComponent
      className={className}
      width={width}
      height={height}
      {...props}
    />
  );
};

export default Icon;
