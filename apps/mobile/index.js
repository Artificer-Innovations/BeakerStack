import { registerRootComponent } from 'expo';
import { initObservability } from '@beakerstack/observability/native';
import { beakerstackObservabilityConfig } from './src/config/observability';
import { setupLogging } from '@beakerstack/logger';
import App from './App';

registerRootComponent(App);

void initObservability(beakerstackObservabilityConfig);
// TODO: pass observability handle after init — setupLogging(telemetry)
setupLogging();
