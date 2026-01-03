import React from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/icon";

export interface SpinnerProps {
  /**
   * size of spinner
   * @default 'default'
   */
  size?: "sm" | "default" | "lg";
  /**
   * Classname for custom styling
   */
  className?: string;
  /**
   * label display beside spinner
   */
  label?: string;
  /**
   * center spinner
   * @default false
   */
  center?: boolean;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = "default",
  className,
  label,
  center = false,
}) => {
  // size config
  const sizeConfig = {
    sm: { width: 16, height: 16, deep: 10 },
    default: { width: 32, height: 32, deep: 15 },
    lg: { width: 48, height: 48, deep: 20 },
  };

  // get config by size
  const config = sizeConfig[size];
  const iconProps = {
    name: "spinnerIcon" as const,
    width: config.width,
    height: config.height,
    style: { "--spinner-deep": `${config.deep}px` } as React.CSSProperties,
  };

  const spinnerContent = (
    <>
      <div className={cn("flex items-center", className)}>
        <Icon {...iconProps} />
        {label && (
          <span className="text-foreground ml-3 text-sm font-medium">
            {label}
          </span>
        )}
      </div>
    </>
  );

  if (center) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export interface LoadingOverlayProps {
  isLoading: boolean;
  className?: string;
  label?: string;
  children: React.ReactNode;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  className,
  label,
  children,
}) => {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            "bg-background/80 backdrop-blur-sm",
            className
          )}
        >
          <div className="flex flex-col items-center gap-3">
            <Spinner size="lg" label={label} />
          </div>
        </div>
      )}
    </div>
  );
};
