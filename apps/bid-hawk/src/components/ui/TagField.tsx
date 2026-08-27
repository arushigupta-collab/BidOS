import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import * as RadixPopover from '@radix-ui/react-popover'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ICON, OVERLAY } from '@/lib/tokens'
import { ChipInput } from './Chip'

export interface TagGroup {
  /** Heading above the group. One group is still headed, so the list reads the same. */
  label: string
  items: readonly string[]
}

export interface TagFieldProps {
  id: string
  values: string[]
  onChange: (values: string[]) => void
  /** Offered under their group headings, filtered by what is typed. */
  groups: TagGroup[]
  label?: string
  helper?: string
  placeholder?: string
  duplicateMessage?: string
  /** Shown in place of the helper, in the error tone. */
  error?: string
  disabled?: boolean
}

/**
 * One control for both ways of adding a value: type your own, or take one that is
 * offered. A separate select beside a chip input made two controls out of one
 * decision, and a chip added by either route is identical, so there was never a
 * reason for two.
 *
 * A combobox over the chip input: the popover is anchored to the field, focus stays
 * in the text input while the list is open, and the active option is reported
 * through aria-activedescendant. Arrow keys move across group boundaries as one
 * flat sequence, Enter takes the active suggestion or commits typed text, Escape
 * closes the list without closing the screen. Nothing commits on blur.
 *
 * Used for source keywords, domain expertise and regional expertise.
 */
export function TagField({
  id,
  values,
  onChange,
  groups,
  label,
  helper,
  placeholder = 'Type to add, or pick from the list',
  duplicateMessage = 'That value is already in this list',
  error,
  disabled = false,
}: TagFieldProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  /** Groups with their matches, plus the flat sequence the arrow keys walk. */
  const { visible, flat } = useMemo(() => {
    const query = draft.trim().toLowerCase()
    const taken = new Set(values.map((value) => value.toLowerCase()))

    const visibleGroups = groups
      .map((group) => ({
        label: group.label,
        items: group.items.filter(
          (item) =>
            !taken.has(item.toLowerCase()) &&
            (query === '' || item.toLowerCase().includes(query)),
        ),
      }))
      .filter((group) => group.items.length > 0)

    return { visible: visibleGroups, flat: visibleGroups.flatMap((group) => group.items) }
  }, [groups, values, draft])

  const add = (value: string) => {
    onChange([...values, value])
    setDraft('')
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const show = () => {
    setOpen(true)
    setActiveIndex(-1)
  }

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) {
        show()
        return
      }
      setActiveIndex((index) => (flat.length === 0 ? -1 : (index + 1) % flat.length))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open || flat.length === 0) return
      setActiveIndex((index) => (index <= 0 ? flat.length - 1 : index - 1))
      return
    }

    if (event.key === 'Enter' && open && activeIndex >= 0 && flat[activeIndex]) {
      // A highlighted suggestion wins; otherwise the chip input commits the text.
      event.preventDefault()
      add(flat[activeIndex])
      return
    }

    if (event.key === 'Escape' && open) {
      // Stopped here so it closes the list rather than the dialog around it.
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <RadixPopover.Root open={open} onOpenChange={setOpen}>
      <RadixPopover.Anchor asChild>
        <div className="w-full">
          <ChipInput
            id={id}
            label={label}
            helper={error ?? helper}
            helperTone={error ? 'error' : 'muted'}
            values={values}
            onChange={onChange}
            tone="selected"
            placeholder={placeholder}
            duplicateMessage={duplicateMessage}
            disabled={disabled}
            invalid={Boolean(error)}
            inputRef={inputRef}
            draft={draft}
            onDraftChange={(next) => {
              setDraft(next)
              setActiveIndex(-1)
              if (next.trim() !== '') setOpen(true)
            }}
            onInputKeyDown={onInputKeyDown}
            inputAria={{
              role: 'combobox',
              'aria-expanded': open,
              'aria-controls': listId,
              'aria-autocomplete': 'list',
              'aria-activedescendant':
                open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined,
            }}
            adornment={
              <button
                type="button"
                disabled={disabled}
                aria-label={`${open ? 'Hide' : 'Show'} suggested ${label?.toLowerCase() ?? 'values'}`}
                aria-expanded={open}
                aria-controls={listId}
                onClick={() => {
                  if (open) {
                    setOpen(false)
                    return
                  }
                  show()
                  inputRef.current?.focus()
                }}
                className={cn(
                  'grid h-20 w-20 shrink-0 place-items-center rounded-field text-fg-muted',
                  'transition-colors duration-micro ease-out hover:bg-surface-hover hover:text-fg',
                  'disabled:cursor-not-allowed disabled:opacity-disabled',
                )}
              >
                <ChevronDown
                  size={ICON.sm}
                  aria-hidden="true"
                  className={cn(
                    'transition-transform duration-standard ease-out',
                    open && 'rotate-180',
                  )}
                />
              </button>
            }
          />
        </div>
      </RadixPopover.Anchor>

      <RadixPopover.Portal>
        <RadixPopover.Content
          align="start"
          sideOffset={OVERLAY.sideOffset}
          collisionPadding={OVERLAY.collisionPadding}
          // Focus stays in the text input: typing has to keep filtering the list.
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          className={cn(
            'z-popover w-[var(--radix-popover-trigger-width)] min-w-panel',
            'rounded-card bg-surface-overlay p-4 shadow-dropdown',
          )}
        >
          {flat.length === 0 ? (
            <p className="px-12 py-8 text-secondary-body text-fg-muted">
              {draft.trim() === ''
                ? 'Every suggestion is already in use.'
                : `No suggestion matches "${draft.trim()}". Press Enter to add it anyway.`}
            </p>
          ) : (
            <div
              id={listId}
              role="listbox"
              aria-label={label ? `Suggested ${label.toLowerCase()}` : 'Suggestions'}
              className="scrollable max-h-preview"
            >
              {visible.map((group) => (
                <div key={group.label} role="group" aria-label={group.label}>
                  <p className="px-12 py-8 text-micro-label uppercase text-fg-muted">
                    {group.label}
                  </p>
                  <ul>
                    {group.items.map((item) => {
                      const index = flat.indexOf(item)
                      return (
                        <li key={item}>
                          <button
                            type="button"
                            id={`${listId}-${index}`}
                            role="option"
                            aria-selected={index === activeIndex}
                            onClick={() => add(item)}
                            onMouseEnter={() => setActiveIndex(index)}
                            className={cn(
                              'flex h-control-md w-full items-center rounded-field px-12 text-left text-body',
                              'transition-colors duration-micro ease-out',
                              index === activeIndex
                                ? 'bg-surface-selected text-fg'
                                : 'text-fg-secondary hover:bg-surface-hover',
                            )}
                          >
                            {item}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  )
}
