"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

type Side = "right" | "left" | "top" | "bottom";

function SheetBackdrop({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="sheet-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-black/50",
        "data-[ending-style]:opacity-0 data-[starting-style]:opacity-0",
        "transition-opacity duration-200",
        className,
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: DialogPrimitive.Popup.Props & { side?: Side }) {
  const sideClasses = {
    right:
      "inset-y-0 right-0 h-full w-full sm:max-w-2xl border-l data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
    left: "inset-y-0 left-0 h-full w-full sm:max-w-2xl border-r data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full",
    top: "inset-x-0 top-0 w-full border-b data-[starting-style]:-translate-y-full data-[ending-style]:-translate-y-full",
    bottom:
      "inset-x-0 bottom-0 w-full border-t data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
  } as const;

  return (
    <SheetPortal>
      <SheetBackdrop />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col gap-0 bg-card text-card-foreground shadow-xl outline-none",
          "transition-transform duration-300 ease-out",
          sideClasses[side],
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          data-slot="sheet-close"
          className="absolute top-3.5 right-3.5 rounded-md opacity-70 hover:opacity-100 hover:bg-secondary p-1 transition focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="닫기"
        >
          <XIcon className="size-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn(
        "flex flex-col gap-1 px-5 pt-5 pb-3 border-b border-border",
        className,
      )}
      {...props}
    />
  );
}

function SheetBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="sheet-body"
      className={cn("flex-1 overflow-y-auto px-5 py-4", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-lg font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-[13px] text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetTitle,
  SheetDescription,
};
