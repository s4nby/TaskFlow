import React, { useRef, useEffect } from 'react';

interface AutoExpandingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

const AutoExpandingTextarea: React.FC<AutoExpandingTextareaProps> = ({ value, onChange, className, ...props }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      className={`auto-expanding-textarea ${className || ''}`}
      rows={1}
      {...props}
    />
  );
};

export default AutoExpandingTextarea;
