import { registerRootComponent } from 'expo';
import { initObservability } from '@beakerstack/observability/native';
import { beakerstackObservabilityConfig } from './src/config/observability';
import { setupLogging } from './src/setupLogging';
import App from './App';

void initObservability(beakerstackObservabilityConfig);
setupLogging();

registerRootComponent(App);
