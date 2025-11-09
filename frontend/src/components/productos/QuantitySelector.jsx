import { useState, useRef, useEffect } from "react";

const QuantitySelector = ({ value, onChange, max = 5, min = 1, disabled = false }) => {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    // Si el valor es mayor que max, activar modo custom
    if (value > max) {
      setIsCustom(true);
      setCustomValue(value.toString());
    }
  }, [value, max]);

  const handleSelectChange = (e) => {
    const selectedValue = e.target.value;
    if (selectedValue === "custom") {
      setIsCustom(true);
      setCustomValue("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else {
      setIsCustom(false);
      const numValue = parseInt(selectedValue);
      if (numValue >= min && numValue <= max) {
        onChange(numValue);
      }
    }
  };

  const handleCustomInputChange = (e) => {
    const inputValue = e.target.value;
    setCustomValue(inputValue);
    
    // Validar y actualizar solo si es un número válido
    if (inputValue === "") {
      return; // Permitir campo vacío mientras se escribe
    }
    
    const numValue = parseInt(inputValue);
    if (!isNaN(numValue) && numValue >= min) {
      onChange(numValue);
    }
  };

  const handleCustomInputBlur = () => {
    const numValue = parseInt(customValue);
    if (isNaN(numValue) || numValue < min) {
      setCustomValue(value.toString());
    } else {
      setCustomValue(numValue.toString());
    }
  };

  if (isCustom) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="number"
          value={customValue}
          onChange={handleCustomInputChange}
          onBlur={handleCustomInputBlur}
          min={min}
          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          disabled={disabled}
          placeholder={value.toString()}
        />
        <button
          type="button"
          onClick={() => {
            setIsCustom(false);
            const numValue = parseInt(customValue);
            if (!isNaN(numValue) && numValue >= min) {
              onChange(numValue);
            } else {
              onChange(1);
            }
          }}
          className="text-xs text-gray-500 hover:text-gray-700"
          disabled={disabled}
        >
          ✓
        </button>
      </div>
    );
  }

  return (
    <select
      value={value > max ? "custom" : value.toString()}
      onChange={handleSelectChange}
      disabled={disabled}
      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
    >
      {Array.from({ length: max }, (_, i) => i + 1).map((num) => (
        <option key={num} value={num}>
          {num}
        </option>
      ))}
      <option value="custom">+</option>
    </select>
  );
};

export default QuantitySelector;

