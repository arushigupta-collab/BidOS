import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { ICON } from '@/lib/tokens'
import { IconButton } from './IconButton'
import { Input } from './Input'

export interface PasswordInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  label: string
  helper?: string
  error?: string
  autoComplete?: string
}

/**
 * A masked field with a reveal. The toggle is icon-only, so it carries an
 * accessible name and a tooltip through IconButton, and the name states what the
 * next press will do rather than what the field currently is.
 */
export function PasswordInput({
  id,
  value,
  onChange,
  label,
  helper,
  error,
  autoComplete = 'new-password',
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <Input
      id={id}
      type={visible ? 'text' : 'password'}
      label={label}
      helper={helper}
      error={error}
      value={value}
      autoComplete={autoComplete}
      onChange={(event) => onChange(event.target.value)}
      addonRight={
        <IconButton
          label={visible ? 'Hide password' : 'Show password'}
          size="sm"
          icon={
            visible ? (
              <EyeOff size={ICON.sm} aria-hidden="true" />
            ) : (
              <Eye size={ICON.sm} aria-hidden="true" />
            )
          }
          onClick={() => setVisible((current) => !current)}
        />
      }
    />
  )
}
