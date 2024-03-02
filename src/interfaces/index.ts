import {PluginParams} from '../types/common';

/**
 * Base interface for plugins.
 */
export interface PluginInterface {
  execute: (
    inputs: PluginParams[],
    config?: Record<string, any>
  ) => Promise<PluginParams[]>;
  metadata: {
    kind: string;
  };
  [key: string]: any;
}
