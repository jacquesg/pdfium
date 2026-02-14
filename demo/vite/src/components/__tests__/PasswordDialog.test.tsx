import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PasswordDialog } from '../PasswordDialog';

describe('PasswordDialog', () => {
  it('renders nothing when not open', () => {
    const { container } = render(
      <PasswordDialog
        isOpen={false}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders dialog when open', () => {
    render(
      <PasswordDialog
        isOpen={true}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Password Required')).toBeDefined();
    expect(screen.getByLabelText('Document password')).toBeDefined();
  });

  it('calls onSubmit with password when form is submitted', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <PasswordDialog
        isOpen={true}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    const passwordInput = screen.getByLabelText('Document password');
    await user.type(passwordInput, 'test-password');

    const openButton = screen.getByRole('button', { name: 'Open' });
    await user.click(openButton);

    expect(onSubmit).toHaveBeenCalledWith('test-password');
  });

  it('disables submit button when password is empty', () => {
    render(
      <PasswordDialog
        isOpen={true}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const openButton = screen.getByRole('button', { name: 'Open' }) as HTMLButtonElement;
    expect(openButton.disabled).toBe(true);
  });

  it('enables submit button when password is entered', async () => {
    const user = userEvent.setup();

    render(
      <PasswordDialog
        isOpen={true}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const passwordInput = screen.getByLabelText('Document password');
    await user.type(passwordInput, 'password123');

    const openButton = screen.getByRole('button', { name: 'Open' }) as HTMLButtonElement;
    expect(openButton.disabled).toBe(false);
  });

  it('shows error message when provided', () => {
    render(
      <PasswordDialog
        isOpen={true}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        error="Incorrect password"
      />,
    );

    const errorMessage = screen.getByRole('alert');
    expect(errorMessage).toBeDefined();
    expect(screen.getByText('Incorrect password')).toBeDefined();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <PasswordDialog
        isOpen={true}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel on Escape key', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <PasswordDialog
        isOpen={true}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('clears password when dialog reopens', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    // Use a controlled wrapper so open/close transitions go through React's
    // normal state lifecycle — avoids Radix Presence act() warnings from rerender.
    function Harness() {
      const [open, setOpen] = useState(true);
      return (
        <>
          <button data-testid="reopen" onClick={() => setOpen(true)}>Reopen</button>
          <PasswordDialog isOpen={open} onSubmit={onSubmit} onCancel={() => setOpen(false)} />
        </>
      );
    }

    render(<Harness />);

    // Type a password
    const passwordInput = screen.getByLabelText('Document password') as HTMLInputElement;
    await user.type(passwordInput, 'secret123');
    expect(passwordInput.value).toBe('secret123');

    // Close the dialog via its own Cancel button
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    // Reopen the dialog via the harness button (now visible, dialog is closed)
    await user.click(screen.getByTestId('reopen'));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeDefined();
    });

    // Password should be cleared by the useEffect([isOpen]) hook
    const reopenedInput = screen.getByLabelText('Document password') as HTMLInputElement;
    expect(reopenedInput.value).toBe('');
  });

  it('has autoComplete attribute on password input', () => {
    render(
      <PasswordDialog
        isOpen={true}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const passwordInput = screen.getByLabelText('Document password') as HTMLInputElement;
    expect(passwordInput.getAttribute('autocomplete')).toBe('current-password');
  });
});
