"use client";

import { Input } from "@/components/ui/input";

/**
 * A masked value input for entering (never viewing) a secret. Pasting IN is
 * allowed — the user explicitly wants to paste a value from elsewhere — but
 * copying OUT, cutting, or the right-click context menu are all blocked, so
 * once a value is typed/pasted here it can't be lifted back out of this
 * field by anyone looking over the user's shoulder or sharing the screen.
 * There is deliberately no show/hide toggle — that would defeat the point.
 */
export function SecretValueInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <Input
      type="password"
      autoComplete="new-password"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      className="select-none"
    />
  );
}
