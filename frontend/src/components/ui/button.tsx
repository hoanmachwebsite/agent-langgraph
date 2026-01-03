import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { SpinnerIcon } from "./spinner-icon";
import { Icon, IconName } from "@/components/icon";

const buttonVariants = cva(
  "flex font-raleway items-center justify-center text-control-content-primary whitespace-nowrap text-sm leading-4 font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 gap-1.5",
  {
    variants: {
      variant: {
        default:
          "bg-control-primary hover:bg-control-hover active:bg-control-active text-control-content-primary",
        primary:
          "bg-[hsl(var(--control-bg-token))] text-control-content-default hover:bg-control-hover border border-control-stroke",
        destructive: "bg-destructive hover:bg-destructive/90",
        outline:
          "border border-input text-control-content hover:bg-control-hover hover:text-accent-foreground",
        secondary: "bg-secondary hover:bg-secondary/80",
        ghost:
          "text-foreground hover:bg-control-hover hover:text-accent-foreground",
        link: "min-w-0 text-primary underline-offset-4 hover:underline",
        neutral: "bg-muted text-muted-foreground hover:bg-muted/90",
        onlyOneIcon:
          "bg-transparent text-control-content-default hover:text-control-hover",
      },
      size: {
        default: "h-[38px] py-4",
        sm: "h-9 rounded-md",
        md: "h-10 rounded-md",
        lg: "h-11 rounded-md",
        icon: "h-11 w-11",
      },
      shape: {
        rounded: "rounded-md",
        circle: "rounded-full",
      },
      iconOnly: {
        true: "p-0 w-8 h-8 min-w-0",
        false: "py-2",
      },
      width: {
        full: "w-full",
        auto: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "rounded",
      iconOnly: false,
      width: "auto",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  icon?: IconName;
  iconPosition?: "left" | "right";
  classNameIcon?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      classNameIcon,
      variant,
      size,
      shape,
      iconOnly,
      children,
      width,
      asChild = false,
      loading = false,
      disabled,
      icon,
      iconPosition = "left",
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const getSpinnerSize = () => {
      switch (size) {
        case "sm":
          return { width: 16, height: 16, deep: 3 };
        case "lg":
          return { width: 24, height: 24, deep: 4 };
        case "icon":
          return { width: 20, height: 20, deep: 3 };
        default:
          return { width: 21, height: 21, deep: 20 };
      }
    };

    const iconSize = size === "lg" ? 24 : 16;

    return (
      <Comp
        className={cn(
          buttonVariants({
            variant,
            size,
            shape,
            width,
            iconOnly: icon && !children ? true : iconOnly,
            className,
          })
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <SpinnerIcon {...getSpinnerSize()} />}
        {!loading && icon && iconPosition === "left" && (
          <Icon
            name={icon}
            width={iconSize}
            height={iconSize}
            className={classNameIcon}
          />
        )}
        {children}
        {!loading && icon && iconPosition === "right" && (
          <Icon
            name={icon}
            width={iconSize}
            height={iconSize}
            className={classNameIcon}
          />
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
