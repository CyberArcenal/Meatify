// src/renderer/components/UI/DatePicker.tsx
import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface DatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholderText?: string;
  className?: string;
  showTimeSelect?: boolean;
  dateFormat?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  selected,
  onChange,
  placeholderText = 'Select date',
  className = '',
  showTimeSelect = false,
  dateFormat = showTimeSelect ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd',
}) => {
  return (
    <ReactDatePicker
      selected={selected}
      onChange={onChange}
      placeholderText={placeholderText}
      className={`w-full px-3 py-2 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] ${className}`}
      dateFormat={dateFormat}
      showTimeSelect={showTimeSelect}
      timeFormat="HH:mm"
      timeIntervals={15}
    />
  );
};

export default DatePicker;