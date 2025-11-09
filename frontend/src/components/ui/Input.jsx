import React from "react";

const Input = React.forwardRef(({ type = "text", className = "", ...props }, ref) => {
  return (
        <input
      ref={ref}
      type={type}
      className={`w-full px-3 py-1.5 sm:px-4 sm:py-2 text-sm border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
          {...props}
    />
  );
});

Input.displayName = "Input";

export default Input;

