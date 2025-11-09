import React from "react";

const Card = ({
  children,
  title = null,
  footer = null,
  className = "",
  onClick = null,
  hover = false,
  ...props
}) => {
  const baseStyles =
    "bg-white rounded-lg shadow-md overflow-hidden w-full";
  
  const hoverStyles = hover || onClick
    ? "transition-shadow duration-200 hover:shadow-lg cursor-pointer"
    : "";

  const classes = `${baseStyles} ${hoverStyles} ${className}`;

  const CardContent = (
    <>
      {title && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {footer}
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <div onClick={onClick} className={classes} {...props}>
        {CardContent}
      </div>
    );
  }

  return (
    <div className={classes} {...props}>
      {CardContent}
    </div>
  );
};

export default Card;

