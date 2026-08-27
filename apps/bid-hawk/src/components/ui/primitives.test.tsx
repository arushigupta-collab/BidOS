import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { X } from 'lucide-react'
import { Button, Drawer, IconButton, Select, Tooltip, TooltipProvider } from './index'

function renderWithProvider(ui: React.ReactElement) {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  return { ...render(<TooltipProvider>{ui}</TooltipProvider>), warn, error }
}

describe('Button', () => {
  it('reports pending state and blocks activation while loading', () => {
    const onClick = vi.fn()
    renderWithProvider(
      <Button variant="primary" loading onClick={onClick}>
        Save
      </Button>,
    )

    const button = screen.getByRole('button', { name: /save/i })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    fireEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('applies the variant and size from the variant map', () => {
    renderWithProvider(
      <Button variant="primary" size="lg">
        Begin
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Begin' })
    expect(button.className).toContain('bg-primary')
    expect(button.className).toContain('h-control-lg')
  })
})

describe('IconButton', () => {
  it('cannot exist without an accessible name, and exposes it on hover', async () => {
    renderWithProvider(
      <IconButton label="Dismiss notice" icon={<X size={16} aria-hidden="true" />} />,
    )

    const button = screen.getByRole('button', { name: 'Dismiss notice' })
    fireEvent.focus(button)
    expect(await screen.findByText('Dismiss notice')).toBeInTheDocument()
  })
})

describe('Tooltip', () => {
  it('reaches a disabled control through its focusable wrapper', async () => {
    renderWithProvider(
      <Tooltip content="Connect a source first" wrapDisabled>
        <Button disabled>Simulate routing</Button>
      </Tooltip>,
    )

    const wrapper = screen.getByRole('button', { name: /simulate routing/i }).parentElement
    fireEvent.focus(wrapper as HTMLElement)
    expect(await screen.findByText('Connect a source first')).toBeInTheDocument()
  })
})

describe('Drawer', () => {
  it('opens as a labelled dialog and closes through its own control', async () => {
    const onClose = vi.fn()
    const { warn, error } = renderWithProvider(
      <Drawer open onClose={onClose} title="Tender summary">
        <p>Panel body</p>
      </Drawer>,
    )

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAccessibleName('Tender summary')
    expect(screen.getByText('Panel body')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close panel' }))
    expect(onClose).toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
  })
})

describe('Select', () => {
  it('renders a labelled trigger showing the placeholder until a value is set', () => {
    renderWithProvider(
      <Select
        id="portal"
        label="Portal"
        placeholder="Choose a portal"
        options={[
          { value: 'gem', label: 'GeM' },
          { value: 'cppp', label: 'CPPP eProcure' },
        ]}
      />,
    )

    // Radix drives the listbox itself; opening it needs pointer-capture APIs that
    // jsdom does not implement, so this covers the closed state contract only.
    const trigger = screen.getByRole('combobox', { name: 'Portal' })
    expect(trigger).toHaveTextContent('Choose a portal')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
