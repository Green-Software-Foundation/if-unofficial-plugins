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
