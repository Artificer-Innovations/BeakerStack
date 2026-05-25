import { test, expect, gotoRoute } from '../../fixtures/auth.fixture';

test.describe('Marketing landing navigation', () => {
  test('header links reach landing sections and auth CTAs', async ({
    page,
  }) => {
    await gotoRoute(page, '/');

    const mainNav = page.getByRole('navigation', { name: 'Main' });
    await expect(
      mainNav.getByRole('link', { name: 'Features' })
    ).toHaveAttribute('href', '#features');
    await expect(
      mainNav.getByRole('link', { name: 'Pricing' })
    ).toHaveAttribute('href', '#pricing');
    await expect(mainNav.getByRole('link', { name: 'FAQ' })).toHaveAttribute(
      'href',
      '#faq'
    );

    await mainNav.getByRole('link', { name: 'Features' }).click();
    await expect(page).toHaveURL(/#features$/);

    await page.getByRole('link', { name: 'Sign in' }).first().click();
    await expect(page).toHaveURL(/\/login/);

    await gotoRoute(page, '/');
    await page
      .getByRole('link', { name: 'Get started', exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/signup/);
  });
});
