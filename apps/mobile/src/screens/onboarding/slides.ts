import { ImageSourcePropType } from 'react-native';

export interface OnboardingSlide {
  key: string;
  title: string;
  description: string;
  imageSource?: ImageSourcePropType;
  backgroundColor: string;
}

export const slides: OnboardingSlide[] = [
  {
    key: 'welcome',
    title: 'Welcome to BeakerStack',
    description: 'Your all-in-one platform for managing your account, billing, and more.',
    backgroundColor: '#f0f9ff',
  },
  {
    key: 'dashboard',
    title: 'Your Dashboard',
    description: 'Get a clear overview of your activity and manage everything from one place.',
    backgroundColor: '#f0fdf4',
  },
  {
    key: 'billing',
    title: 'Simple Billing',
    description: 'Upgrade, downgrade, and track your invoices — all without leaving the app.',
    backgroundColor: '#fdf4ff',
  },
];
