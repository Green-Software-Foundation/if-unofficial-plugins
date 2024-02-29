import * as dayjs from 'dayjs';

export interface WattTimeParams {
  latitude: number;
  longitude: number;
  starttime: string;
  endtime: dayjs.Dayjs;
}

export interface LatitudeLongitude {
  latitude: number;
  longitude: number;
}

export type WattAuthType = {
  baseUrl?: string;
};
