export type KeyValuePair = {
  [key: string]: any;
};

export type ModelParams = {
  timestamp: string;
  duration: number;
  [key: string]: any;
};

export enum Interpolation {
  SPLINE = 'spline',
  LINEAR = 'linear',
}

/**
 * Consumption information for a single instance.
 */
type IConsumption = {
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
export type IComputeInstance = {
  consumption: IConsumption;
  embodiedEmission: number;
  name: string;
  vCPUs: number;
  maxvCPUs: number;
};
