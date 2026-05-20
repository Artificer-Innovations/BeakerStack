import { registerRootComponent } from 'expo';
import { initObservability } from '@beakerstack/observability/native';
import { beakerstackObservabilityConfig } from './src/config/observability';
import App from './App';

void initObservability(beakerstackObservabilityConfig);

registerRootComponent(App);
