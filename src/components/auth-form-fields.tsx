import React from "react";

type FormFieldProps = {
  label: string;
  type?: string;
  name: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  error?: string;
  icon?: React.ReactNode;
  className?: string;
};

export function FormField({
  label,
  type = "text",
  name,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  icon,
  className,
}: FormFieldProps) {
  return (
    <div className="flex flex-col gap-[8px] w-full">
      <label className="font-medium leading-[1.5] text-[#2f2f2d] text-[14px] tracking-[0.28px] text-left">{label}</label>
      <div className={`bg-white border flex gap-[8px] h-[52px] items-center px-[12px] py-[8px] rounded-[10px] w-full transition-colors ${error ? "border-red-500 focus-within:border-red-500" : "border-[#dfe1e7] focus-within:border-[#14c1d5]"} ${className || ""}`}>
        {icon && <div className="shrink-0 flex items-center justify-center text-[#818898]">{icon}</div>}
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className="flex-1 font-normal leading-[1.5] text-[#05080b] placeholder:text-[#818898] text-[16px] tracking-[0.32px] outline-none bg-transparent w-full"
        />
      </div>
      {error ? <span className="text-red-500 text-sm font-medium">{error}</span> : null}
    </div>
  );
}

export function AuthErrorAlert({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-[8px] border border-[#f6c8c8] bg-[#fff1f1] px-3 py-2 text-sm font-medium text-[#8c1f1f]">
      {message}
    </div>
  );
}

export function AuthSuccessMessage({ message }: { message: string }) {
  return (
    <div className="text-center flex flex-col items-center gap-4">
      <div className="rounded-full bg-[#e8fafb] p-3">
        <div className="text-[#14c1d5]" aria-hidden />
      </div>
      <div className="font-normal leading-[1.5] text-[#87888a] text-[14px]">{message}</div>
    </div>
  );
}

export function AuthFooterLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-8 pt-6 border-t border-[#eef0f3] text-center">
      <a href={href} className="text-[#14c1d5] text-[14px] font-medium hover:underline inline-flex items-center justify-center">
        {label}
      </a>
    </div>
  );
}
