import React from "react";
import { cn } from "../../lib/cn";

export function TabsList({ className, ...props }) {
  return <nav role="tablist" className={cn("ui-tabs-list", className)} {...props} />;
}

export const TabsTrigger = React.forwardRef(function TabsTrigger(
  { className, active, tabIndex = 0, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={Boolean(active)}
      tabIndex={tabIndex}
      className={cn("ui-tabs-trigger", active && "active", className)}
      {...props}
    />
  );
});
