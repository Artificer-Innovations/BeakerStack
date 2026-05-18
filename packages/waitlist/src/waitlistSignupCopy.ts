export const WAITLIST_SIGNUP_COPY_KEYS = [
  'headline',
  'subhead',
  'submit_button_label',
  'footer_note',
  'success_message',
] as const;

export type WaitlistSignupCopyKey = (typeof WAITLIST_SIGNUP_COPY_KEYS)[number];

export type WaitlistSignupCopy = Record<WaitlistSignupCopyKey, string>;

export const DEFAULT_WAITLIST_SIGNUP_COPY: WaitlistSignupCopy = {
  headline: 'Join the waitlist',
  subhead:
    "We're rolling out access in batches. Drop your email and we'll let you know when your spot opens up.",
  submit_button_label: 'Join waitlist',
  footer_note: "No spam. We'll only email you about your spot.",
  success_message:
    "Thanks — you're on the list. We'll email you when your spot opens up.",
};

/** Admin field labels for structured waitlist signup copy. */
export const WAITLIST_SIGNUP_COPY_FIELD_LABELS: Record<
  WaitlistSignupCopyKey,
  string
> = {
  headline: 'Headline',
  subhead: 'Subhead (why waitlist + what happens next)',
  submit_button_label: 'Submit button label',
  footer_note: 'Footer note (under the button)',
  success_message: 'Success message (after submit)',
};

export function resolveWaitlistSignupCopy(
  settingsCopy?: Record<string, Record<string, string>> | undefined,
  configCopy?: Record<string, Record<string, string>> | undefined
): WaitlistSignupCopy {
  const waitlist = {
    ...configCopy?.['waitlist'],
    ...settingsCopy?.['waitlist'],
  };

  const resolved: WaitlistSignupCopy = { ...DEFAULT_WAITLIST_SIGNUP_COPY };

  for (const key of WAITLIST_SIGNUP_COPY_KEYS) {
    const value = waitlist[key]?.trim();
    if (value) resolved[key] = value;
  }

  // Legacy single-field copy from early waitlist builds
  if (
    !waitlist['success_message']?.trim() &&
    waitlist['confirmation']?.trim()
  ) {
    resolved.success_message = waitlist['confirmation'].trim();
  }

  return resolved;
}

export function patchWaitlistSignupCopy(
  existing: Record<string, Record<string, string>> | undefined,
  patch: Partial<WaitlistSignupCopy>
): Record<string, Record<string, string>> {
  return {
    ...existing,
    waitlist: {
      ...existing?.['waitlist'],
      ...patch,
    },
  };
}
