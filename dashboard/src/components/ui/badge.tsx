import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-border-strong bg-surface text-muted",
        primary:
          "border-primary/25 bg-primary/12 text-primary-bright",
        allow: "border-allow/25 bg-allow/12 text-allow",
        sanitize: "border-sanitize/25 bg-sanitize/12 text-sanitize",
        quarantine: "border-quarantine/25 bg-quarantine/12 text-quarantine",
        block: "border-block/30 bg-block/12 text-block",
        outline: "border-border-strong bg-transparent text-muted",
        success: "border-allow/25 bg-allow/12 text-allow",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
