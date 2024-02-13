import {PluginName} from '../config';

export type ErrorFormatParams = {
  scope?: string;
  message: string;
};

/**
 * Maps an instance name to its corresponding plugin name from the PluginName object.
 */
export const mapPluginName = (instanceName: string) => PluginName[instanceName];
