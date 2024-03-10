export interface WattTimeParams {
  latitude: number;
  longitude: number;
  starttime: string;
  endtime: string;
}

export interface WattTimeRegionParams {
  start: string;
  end: string;
  region: string;
  signal_type?: string;
}

export interface LatitudeLongitude {
  latitude: number;
  longitude: number;
}
