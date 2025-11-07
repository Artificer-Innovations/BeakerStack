/**
 * Test fixtures for E2E tests
 * Provides pre-configured test data and scenarios
 */

import { TestUser, createTestUser, TestUsers } from './test-data';

/**
 * Fixture for a new user signup flow
 */
export interface SignupFixture {
  user: TestUser;
  expectedRedirect: string;
}

/**
 * Create a signup fixture
 */
export function createSignupFixture(): SignupFixture {
  return {
    user: createTestUser(),
    expectedRedirect: '/dashboard',
  };
}

/**
 * Fixture for a login flow
 */
export interface LoginFixture {
  user: TestUser;
  expectedRedirect: string;
}

/**
 * Create a login fixture
 * Note: User must exist in the database before using this fixture
 */
export function createLoginFixture(): LoginFixture {
  return {
    user: TestUsers.valid,
    expectedRedirect: '/dashboard',
  };
}

/**
 * Fixture for profile update flow
 */
export interface ProfileUpdateFixture {
  bio: string;
  displayName: string;
  website: string;
  location: string;
}

/**
 * Create a profile update fixture
 */
export function createProfileUpdateFixture(): ProfileUpdateFixture {
  return {
    bio: `Test bio updated at ${new Date().toISOString()}`,
    displayName: `Test User ${Date.now()}`,
    website: 'https://example.com',
    location: 'Test Location',
  };
}

/**
 * Common selectors for web E2E tests
 */
export const WebSelectors = {
  emailInput: 'input[name="email"]',
  passwordInput: 'input[name="password"]',
  confirmPasswordInput: 'input[name="confirm-password"]',
  loginButton: 'button:has-text("Sign in")',
  signupButton: 'button:has-text("Create account")',
  googleLoginButton: 'button:has-text("Sign in with Google")',
  googleSignupButton: 'button:has-text("Sign up with Google")',
  errorMessage: '.text-red-800',
  profileLink: 'a[href="/profile"]',
  dashboardLink: 'a[href="/dashboard"]',
};

/**
 * Common selectors for mobile E2E tests
 */
export const MobileSelectors = {
  emailInput: 'Email address',
  passwordInput: 'Password',
  confirmPasswordInput: 'Confirm Password',
  loginButton: 'Sign in',
  signupButton: 'Create account',
  googleLoginButton: 'Sign in with Google',
  googleSignupButton: 'Sign up with Google',
  profileTab: 'Profile',
  dashboardTab: 'Dashboard',
};

