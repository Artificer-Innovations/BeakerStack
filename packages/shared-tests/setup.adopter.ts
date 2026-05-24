import {
  configureAdopter,
  resetAdopterConfigForTests,
} from '@beakerstack/shared/config/adopterRuntime';
import { adopterConfig } from '@adopter/config';

beforeEach(() => {
  resetAdopterConfigForTests();
  configureAdopter(adopterConfig);
});

afterEach(() => {
  resetAdopterConfigForTests();
});
