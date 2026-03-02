import React from "react";
import { cn } from "../../lib/cn";

export function TabsList({ className, ...props }) {
  return <nav className={cn("ui-tabs-list", className)} {...props} />;
}

export function TabsTrigger({ className, active, ...props }) {
  return (
    <button
      type="button"
      className={cn("ui-tabs-trigger", active && "active", className)}
      {...props}
    />
  );
}
