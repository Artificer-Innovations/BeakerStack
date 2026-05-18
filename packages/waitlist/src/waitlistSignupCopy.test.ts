import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WAITLIST_SIGNUP_COPY,
  WAITLIST_SIGNUP_COPY_FIELD_LABELS,
  WAITLIST_SIGNUP_COPY_KEYS,
  patchWaitlistSignupCopy,
  resolveWaitlistSignupCopy,
} from './waitlistSignupCopy.js';

describe('waitlistSignupCopy constants', () => {
  it('exposes all copy keys with admin field labels', () => {
    for (const key of WAITLIST_SIGNUP_COPY_KEYS) {
      expect(WAITLIST_SIGNUP_COPY_FIELD_LABELS[key]).toBeTruthy();
    }
    expect(WAITLIST_SIGNUP_COPY_KEYS).toHaveLength(5);
  });
});

describe('resolveWaitlistSignupCopy', () => {
  it('returns defaults when copy is missing', () => {
    expect(resolveWaitlistSignupCopy(undefined, undefined)).toEqual(
      DEFAULT_WAITLIST_SIGNUP_COPY
    );
  });

  it('merges settings over config for every copy key', () => {
    const config = {
      waitlist: {
        headline: 'Config headline',
        subhead: 'Config subhead',
        submit_button_label: 'Config button',
        footer_note: 'Config footer',
        success_message: 'Config success',
      },
    };
    const settings = {
      waitlist: {
        headline: 'Settings headline',
        subhead: 'Settings subhead',
        submit_button_label: 'Settings button',
        footer_note: 'Settings footer',
        success_message: 'Settings success',
      },
    };

    expect(resolveWaitlistSignupCopy(settings, config)).toEqual({
      headline: 'Settings headline',
      subhead: 'Settings subhead',
      submit_button_label: 'Settings button',
      footer_note: 'Settings footer',
      success_message: 'Settings success',
    });
  });

  it('ignores blank or whitespace-only overrides', () => {
    expect(
      resolveWaitlistSignupCopy({
        waitlist: {
          headline: '   ',
          subhead: '',
          submit_button_label: '\t',
        },
      })
    ).toEqual(DEFAULT_WAITLIST_SIGNUP_COPY);
  });

  it('trims non-empty overrides', () => {
    expect(
      resolveWaitlistSignupCopy({
        waitlist: { headline: '  Custom headline  ' },
      })
    ).toMatchObject({
      headline: 'Custom headline',
    });
  });

  it('maps legacy confirmation to success_message when success_message is absent', () => {
    expect(
      resolveWaitlistSignupCopy({
        waitlist: { confirmation: 'Legacy thanks' },
      })
    ).toMatchObject({
      success_message: 'Legacy thanks',
    });
  });

  it('trims legacy confirmation', () => {
    expect(
      resolveWaitlistSignupCopy({
        waitlist: { confirmation: '  Legacy thanks  ' },
      })
    ).toMatchObject({
      success_message: 'Legacy thanks',
    });
  });

  it('prefers success_message over legacy confirmation', () => {
    expect(
      resolveWaitlistSignupCopy({
        waitlist: {
          success_message: 'Modern thanks',
          confirmation: 'Legacy thanks',
        },
      })
    ).toMatchObject({
      success_message: 'Modern thanks',
    });
  });

  it('uses legacy confirmation when success_message is whitespace only', () => {
    expect(
      resolveWaitlistSignupCopy({
        waitlist: {
          success_message: '   ',
          confirmation: 'Legacy thanks',
        },
      })
    ).toMatchObject({
      success_message: 'Legacy thanks',
    });
  });

  it('does not map legacy confirmation when it is blank', () => {
    expect(
      resolveWaitlistSignupCopy({
        waitlist: { confirmation: '   ' },
      })
    ).toEqual(DEFAULT_WAITLIST_SIGNUP_COPY);
  });
});

describe('patchWaitlistSignupCopy', () => {
  it('creates waitlist copy when existing is undefined', () => {
    expect(
      patchWaitlistSignupCopy(undefined, { headline: 'New headline' })
    ).toEqual({
      waitlist: { headline: 'New headline' },
    });
  });

  it('merges patch into existing waitlist copy', () => {
    expect(
      patchWaitlistSignupCopy(
        {
          waitlist: { headline: 'Old headline', subhead: 'Keep me' },
          other: { foo: 'bar' },
        },
        { headline: 'New headline', footer_note: 'New footer' }
      )
    ).toEqual({
      waitlist: {
        headline: 'New headline',
        subhead: 'Keep me',
        footer_note: 'New footer',
      },
      other: { foo: 'bar' },
    });
  });
});
