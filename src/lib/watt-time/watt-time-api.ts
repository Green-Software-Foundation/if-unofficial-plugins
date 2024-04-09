import * as dotenv from 'dotenv';
import axios from 'axios';
import {Settings, DateTime} from 'luxon';

import {ERRORS} from '../../util/errors';
import {buildErrorMessage} from '../../util/helpers';

import {
  WattTimeParams,
  WattTimeRegionParams,
  RegionFromLocationResponse,
} from './types';

const {AuthorizationError, APIRequestError} = ERRORS;

Settings.defaultZone = 'utc';

export const WattTimeAPI = () => {
  const BASE_URL = 'https://api.watttime.org/v3';
  const errorBuilder = buildErrorMessage(WattTimeAPI.name);
  let token = '';

  /**
   * Authenticates the user with the WattTime API using the provided authentication parameters.
   * If a token is not provided, attempts to authenticate with the provided username and password.
   * Updates the token and base URL for API requests upon successful authentication.
   */
  const authenticate = async (): Promise<void> => {
    dotenv.config();
    validateCredentials();

    token = process.env.WATT_TIME_TOKEN ?? '';

    if (token === '') {
      const tokenResponse = await axios
        .get('https://api.watttime.org/login', {
          auth: {
            username: process.env.WATT_TIME_USERNAME!,
            password: process.env.WATT_TIME_PASSWORD!,
          },
        })
        .catch(error => {
          throw new APIRequestError(
            errorBuilder({
              message: `Authorization error from WattTime API. ${JSON.stringify(
                error?.message || error
              )}`,
            })
          );
        });

      if (
        tokenResponse === undefined ||
        tokenResponse.data === undefined ||
        !('token' in tokenResponse.data)
      ) {
        throw new AuthorizationError(
          errorBuilder({
            message: 'Missing token in response. Invalid credentials provided',
            scope: 'authorization',
          })
        );
      }

      token = tokenResponse.data.token;
    }
  };

  /**
   * Validates if the credentials are provided.
   */
  const validateCredentials = () => {
    if (
      !process.env.WATT_TIME_TOKEN &&
      !process.env.WATT_TIME_USERNAME &&
      !process.env.WATT_TIME_PASSWORD
    ) {
      throw new AuthorizationError(
        errorBuilder({
          message:
            'Invalid credentials provided. Either `token` or `username` and `password` should be provided',
        })
      );
    }
  };

  /**
   * Fetches region for provided geolocation and then get forcast for provided time period.
   * Sorts data from the WattTime API.
   * Throws an APIRequestError if an error occurs during the request or if the response is invalid.
   */
  const fetchAndSortData = async (params: WattTimeParams) => {
    const signalType = params.signal_type || (await getSignalType(token));
    Object.assign(params, {signal_type: signalType});

    const response = await axios
      .get<RegionFromLocationResponse>(`${BASE_URL}/region-from-loc`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .catch(error => {
        throw new APIRequestError(
          errorBuilder({
            message: `Error fetching data from WattTime API. ${JSON.stringify(
              error?.response?.data?.error || error
            )}`,
          })
        );
      });

    if (response.status !== 200) {
      throw new APIRequestError(
        errorBuilder({
          message: `Error fetching data from WattTime API: ${JSON.stringify(
            response.status
          )}`,
        })
      );
    }

    const result = response.data;
    const regionParams: WattTimeRegionParams = {
      signal_type: result.signal_type || undefined,
      region: result.region,
      start: params.starttime,
      end: params.endtime,
    };

    return await fetchDataWithRegion(regionParams);
  };

  /**
   * Get `signal_type` for specified access token.
   */
  const getSignalType = async (token: string) => {
    const result = await axios
      .get(`${BASE_URL}/my-access`, {
        params: {},
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .catch(error => {
        throw new APIRequestError(
          errorBuilder({
            message: `Error fetching \`signal_type\` from WattTime API. ${JSON.stringify(
              error?.response?.data?.message || error
            )}`,
          })
        );
      });

    if (
      !('data' in result) ||
      !Array.isArray(result.data.signal_types) ||
      result.data.signal_types.length === 0
    ) {
      throw new APIRequestError(
        errorBuilder({
          message: 'Invalid response from WattTime API',
        })
      );
    }

    return result.data.signal_types[0].signal_type;
  };

  /**
   * Fetches and sorts data from the WattTime API based on the provided region and time period.
   * Throws an APIRequestError if an error occurs during the request or if the response is invalid.
   */
  const fetchDataWithRegion = async (params: WattTimeRegionParams) => {
    const signalType = params.signal_type || (await getSignalType(token));

    Object.assign(params, {signal_type: signalType});

    const result = await axios
      .get(`${BASE_URL}/forecast/historical`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .catch(error => {
        throw new APIRequestError(
          errorBuilder({
            message: `Error fetching data from WattTime API. ${JSON.stringify(
              error?.response?.data?.message || error
            )}`,
          })
        );
      });

    if (result.status !== 200) {
      throw new APIRequestError(
        errorBuilder({
          message: `Error fetching data from WattTime API: ${JSON.stringify(
            result.status
          )}`,
        })
      );
    }

    if (!('data' in result) || !Array.isArray(result.data.data)) {
      throw new APIRequestError(
        errorBuilder({
          message: 'Invalid response from WattTime API',
        })
      );
    }

    return simplifyAndSortData(result.data.data);
  };

  const simplifyAndSortData = (data: any) => {
    const forecasts = data.map(
      (item: {forecast: []; generated_at: string}) => item.forecast
    );

    return sortData(forecasts.flat());
  };

  /**
   * Sorts the data based on the 'point_time' property in ascending order.
   */
  const sortData = <T extends {point_time: string}>(data: T[]) => {
    return data.sort((a: T, b: T) => {
      return DateTime.fromISO(a.point_time).toSeconds() >
        DateTime.fromISO(b.point_time).toSeconds()
        ? 1
        : -1;
    });
  };

  return {
    authenticate,
    fetchAndSortData,
    fetchDataWithRegion,
  };
};
