import { BIZSIM_ENGINE_CONTEXT_METHODS } from './BizSimEngine.context.js';
import { BIZSIM_ENGINE_SIMULATION_METHODS } from './BizSimEngine.simulation.js';
import { BIZSIM_ENGINE_AUDIT_METHODS } from './BizSimEngine.audit.js';

export const BIZSIM_ENGINE_METHODS = {
  ...BIZSIM_ENGINE_CONTEXT_METHODS,
  ...BIZSIM_ENGINE_SIMULATION_METHODS,
  ...BIZSIM_ENGINE_AUDIT_METHODS,
  getLastPromptSnapshot() {
    return this.lastPromptSnapshot || '';
  },
  getLastPromptBuiltAt() {
    return this.lastPromptBuiltAt || null;
  },
};
