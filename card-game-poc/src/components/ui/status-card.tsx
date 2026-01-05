import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const statusCardVariants = cva(
  "bg-card text-card-foreground flex flex-col rounded-xl border shadow-sm overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-border",
        success: "border-emerald-500/50 bg-emerald-500/5",
        warning: "border-amber-500/50 bg-amber-500/5",
        error: "border-red-500/50 bg-red-500/5",
        info: "border-blue-500/50 bg-blue-500/5",
      },
      size: {
        default: "p-6 gap-4",
        sm: "p-4 gap-3",
        lg: "p-8 gap-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface StatusCardRootProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof statusCardVariants> {}

function StatusCardRoot({
  className,
  variant,
  size,
  ...props
}: StatusCardRootProps) {
  return (
    <div
      data-slot="status-card"
      className={cn(statusCardVariants({ variant, size }), className)}
      {...props}
    />
  )
}

function StatusCardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="status-card-header"
      className={cn(
        "flex items-start justify-between gap-4",
        className
      )}
      {...props}
    />
  )
}

function StatusCardTitle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="status-card-title"
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function StatusCardDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="status-card-description"
      className={cn(
        "text-sm text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function StatusCardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="status-card-content"
      className={cn("flex-1", className)}
      {...props}
    />
  )
}

function StatusCardFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="status-card-footer"
      className={cn(
        "flex items-center gap-2 pt-4 border-t border-border",
        className
      )}
      {...props}
    />
  )
}

function StatusCardBadge({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="status-card-badge"
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        className
      )}
      {...props}
    />
  )
}

function StatusCardIcon({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="status-card-icon"
      className={cn(
        "flex-shrink-0 [&_svg]:size-5 [&_svg]:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

const StatusCard = Object.assign(StatusCardRoot, {
  Header: StatusCardHeader,
  Title: StatusCardTitle,
  Description: StatusCardDescription,
  Content: StatusCardContent,
  Footer: StatusCardFooter,
  Badge: StatusCardBadge,
  Icon: StatusCardIcon,
})

export { StatusCard, statusCardVariants }

