export interface IBoaviztaUsageSCI {
  e: number;
  m: number;
}

export interface ICountryCodes {
  [key: string]: string;
}

export type BoaviztaInstanceTypes = {
  [key: string]: string[];
};

export type BoaviztaUsageType = {
  duration: number;
  metricType: 'cpu-util' | 'gpu-util' | 'ram-util';
};

export type BoaviztaCpuOutputType = {
  'energy-cpu': number;
  'embodied-carbon': number;
};

export type BoaviztaCloudInstanceType = {
  energy: number;
  'embodied-carbon': number;
};
