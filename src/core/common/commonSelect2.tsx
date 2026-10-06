import Select from "react-select";
import React, { useState, useEffect } from "react";

// type Option = {
//   value: number; // 🔧 Use 'number' here to match academicYear
//   label: string;
// };

// type SelectProps = {
//   options: Option[];
//   defaultValue?: Option;
//   className?: string;
// };

type Option<T = string | number> = {
  value: T;
  label: string;
};

type SelectProps<T = string | number> = {
  options: Option<T>[];
  defaultValue?: Option<T>;
  value?: Option<T> | null;
  className?: string;
  onChange?: (option: Option<T> | null) => void;
  loading?: boolean;
  name?: string;
  isDisabled?: boolean;
  placeholder?: string;
};

const CommonSelect2: React.FC<SelectProps> = ({ options, defaultValue, value, className, onChange, loading, name, isDisabled, placeholder }) => {
  const [selectedOption, setSelectedOption] = useState<Option | undefined>(defaultValue);

  const handleChange = (option: Option | null) => {
    setSelectedOption(option || undefined);
    if (onChange) onChange(option); 
  };

  useEffect(() => {
    if (value !== undefined) {
      setSelectedOption(value || undefined);
    } else if (defaultValue !== undefined) {
      setSelectedOption(defaultValue || undefined);
    }
  }, [defaultValue, value]);

  return (
    <Select
      classNamePrefix="react-select"
      className={className}
      options={options}
      value={value !== undefined ? value : selectedOption}
      onChange={handleChange}
      placeholder={placeholder || "Select"}
      isLoading={loading}
      isDisabled={isDisabled || loading}
      isSearchable={true}
    />
  );
};

export default CommonSelect2;
