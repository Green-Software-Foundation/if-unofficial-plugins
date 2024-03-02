export type KeyValuePair = {
  [key: string]: any;
};

export type PluginParams = {
  [key: string]: any;
};

export enum Interpolation {
  SPLINE = 'spline',
  LINEAR = 'linear',
}

/**
 * Consumption information for a single instance.
 */
type Consumption = {
  idle: number;
  tenPercent: number;
  fiftyPercent: number;
  hundredPercent: number;
  minWatts: number;
  maxWatts: number;
};

/**
 * Information about a single compute instance.
 */
export type ComputeInstance = {
  consumption: Consumption;
  embodiedEmission: number;
  name: string;
  vCPUs: number;
  maxvCPUs: number;
};

export type ConfigParams = Record<string, any>;
