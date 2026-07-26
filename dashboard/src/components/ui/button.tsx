"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-[0_1px_0_0_rgba(255,255,255,0.15)_inset,0_8px_24px_-8px_var(--primary)] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.2)_inset,0_10px_30px_-6px_var(--primary)] hover:brightness-110",
        secondary:
          "glass text-foreground hover:bg-card-elevated hover:border-border-strong",
        outline:
          "border border-border-strong bg-transparent text-foreground hover:bg-surface hover:border-primary/40",
        ghost: "text-muted hover:bg-surface hover:text-foreground",
        subtle: "bg-surface text-foreground hover:bg-card-elevated",
        destructive:
          "bg-block text-block-foreground hover:brightness-110 shadow-[0_8px_24px_-8px_var(--block)]",
        link: "text-primary-bright underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-md",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-[0.95rem] rounded-xl",
        xl: "h-14 px-8 text-base rounded-xl",
        icon: "size-10",
        "icon-sm": "size-8 rounded-md",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
