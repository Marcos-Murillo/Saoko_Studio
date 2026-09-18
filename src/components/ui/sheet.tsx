"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/30 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm",
        className
      )}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  style,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "top" | "right" | "bottom" | "left"
  showCloseButton?: boolean
}) {
  const docked: React.CSSProperties =
    side === "right" || side === "left"
      ? {
          position: "fixed",
          top: 0,
          bottom: 0,
          height: "100dvh",
          minWidth: 0,
          width: "min(420px, 100vw)",
          maxWidth: 420,
          ...(side === "right" ? { right: 0, left: "auto" } : { left: 0, right: "auto" }),
        }
      : { position: "fixed" }

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "saoko-drawer fixed z-50 flex flex-col gap-4 overflow-hidden bg-transparent bg-clip-padding text-sm text-popover-foreground transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0",
          side === "right" && "inset-y-0 right-0 top-0 h-dvh w-[min(420px,100vw)] data-ending-style:translate-x-[2.5rem] data-starting-style:translate-x-[2.5rem] max-md:data-ending-style:translate-x-0 max-md:data-starting-style:translate-x-0 max-md:data-ending-style:translate-y-[2.5rem] max-md:data-starting-style:translate-y-[2.5rem]",
          side === "left" && "inset-y-0 left-0 top-0 h-dvh w-[min(420px,100vw)] data-ending-style:translate-x-[-2.5rem] data-starting-style:translate-x-[-2.5rem] max-md:data-ending-style:translate-x-0 max-md:data-starting-style:translate-x-0 max-md:data-ending-style:translate-y-[2.5rem] max-md:data-starting-style:translate-y-[2.5rem]",
          side === "bottom" && "inset-x-0 bottom-0 h-auto data-ending-style:translate-y-[2.5rem] data-starting-style:translate-y-[2.5rem]",
          side === "top" && "inset-x-0 top-0 h-auto data-ending-style:translate-y-[-2.5rem] data-starting-style:translate-y-[-2.5rem]",
          className
        )}
        {...props}
        style={{ ...style, ...docked }}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3"
                size="icon-sm"
              />
            }
          >
            <XIcon
            />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-0.5 p-4", className)}
      {...props}
    />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(
        "font-heading text-base font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
