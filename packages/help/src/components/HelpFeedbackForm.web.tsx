import { useState, type FormEvent } from 'react';

interface HelpFeedbackFormProps {
  contactEmail: string;
  productName: string;
}

export function HelpFeedbackForm({
  contactEmail,
  productName,
}: HelpFeedbackFormProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    const subject = `${productName} feedback`;
    const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(trimmed)}`;
    window.open(mailto, '_blank');
    setMessage('');
  };

  return (
    <section className='rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5'>
      <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
        Send us feedback
      </h2>
      <p className='mt-1 text-sm text-gray-600 dark:text-gray-400'>
        Found a bug, have a suggestion, or just want to say hi?
      </p>
      <form onSubmit={handleSubmit} className='mt-4 space-y-3'>
        <label className='block'>
          <span className='sr-only'>Feedback message</span>
          <textarea
            value={message}
            onChange={event => setMessage(event.target.value)}
            rows={4}
            placeholder="Tell us what's on your mind…"
            className='w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30'
          />
        </label>
        <button
          type='submit'
          disabled={!message.trim()}
          className='inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900'
        >
          Send Feedback
        </button>
      </form>
    </section>
  );
}
