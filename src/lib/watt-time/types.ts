export interface WattTimeParams {
  latitude: number;
  longitude: number;
  starttime: string;
  endtime: string;
  signal_type?: string;
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

export interface RegionFromLocationResponse {
  signal_type: string;
  region: string;
  region_full_name: string;
}
