import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FormInput } from '@beakerstack/shared/components/forms/FormInput.web';

describe('FormInput.web — coverage gaps', () => {
  it('applies disabled styles to single-line input', () => {
    render(
      <FormInput
        label='Username'
        value='locked'
        onChange={() => undefined}
        disabled
      />
    );

    const input = screen.getByLabelText('Username');
    expect(input).toBeDisabled();
    expect(input.className).toContain('cursor-not-allowed');
    expect(input.className).toContain('opacity-50');
  });

  it('renders with custom className and required marker', () => {
    render(
      <FormInput
        label='Email'
        value=''
        onChange={() => undefined}
        required
        className='extra-input'
      />
    );

    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByLabelText('Email').className).toContain('extra-input');
  });
});
