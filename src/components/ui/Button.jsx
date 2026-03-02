import React from "react";
import { cn } from "../../lib/cn";

const variantClassMap = {
  default: "ui-button-default",
  outline: "ui-button-outline",
  ghost: "ui-button-ghost",
  destructive: "ui-button-destructive",
};

const sizeClassMap = {
  default: "ui-button-size-default",
  sm: "ui-button-size-sm",
};

function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        "ui-button",
        variantClassMap[variant] || variantClassMap.default,
        sizeClassMap[size] || sizeClassMap.default,
        className
      )}
      {...props}
    />
  );
}

export default Button;
