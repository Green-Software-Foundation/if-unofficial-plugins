import * as dotenv from 'dotenv';
import * as dayjs from 'dayjs';
import axios from 'axios';

import {ERRORS} from '../../util/errors';
import {buildErrorMessage} from '../../util/helpers';

import {WattTimeParams, WattTimeRegionParams} from './types';

const {AuthorizationError, APIRequestError} = ERRORS;

export const WattTimeAPI = () => {
  const baseUrl = 'https://api.watttime.org/v3';
  let token = '';

  const errorBuilder = buildErrorMessage(WattTimeAPI.name);

  /**
   * Authenticates the user with the WattTime API using the provided authentication parameters.
   * If a token is not provided, attempts to authenticate with the provided username and password.
   * Updates the token and base URL for API requests upon successful authentication.
   */
  const authenticate = async (): Promise<void> => {
    dotenv.config();

    token = process.env.WATT_TIME_TOKEN ?? '';

    if (token === '') {
      const tokenResponse = await axios.get('https://api.watttime.org/login', {
        auth: {
          username: process.env.WATT_TIME_USERNAME || '',
          password: process.env.WATT_TIME_PASSWORD || '',
        },
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
   * Support v2 version of WattTime API.
   *
   * Fetches and sorts data from the WattTime API based on the provided parameters.
   * Throws an APIRequestError if an error occurs during the request or if the response is invalid.
   */
  const fetchAndSortData = async (params: WattTimeParams) => {
    const result = await axios
      .get('https://api2.watttime.org/v2/data', {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .catch(error => {
        throw new APIRequestError(
          errorBuilder({
            message: `Error fetching data from WattTime API. ${JSON.stringify(
              (error.response &&
                error.response.data &&
                error.response.data.message) ||
                error
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

    if (!('data' in result) || !Array.isArray(result.data)) {
      throw new APIRequestError(
        errorBuilder({
          message: 'Invalid response from WattTime API',
        })
      );
    }

    return sortData(result.data);
  };

  /**
   * Get `signal_type` for specified access token.
   */
  const getSignalType = async (token: string) => {
    const result = await axios
      .get(`${baseUrl}/my-access`, {
        params: {},
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .catch(error => {
        throw new APIRequestError(
          errorBuilder({
            message: `Error fetching \`signal_type\` from WattTime API. ${JSON.stringify(
              (error.response &&
                error.response.data &&
                error.response.data.message) ||
                error
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
      .get(`${baseUrl}/forecast/historical`, {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .catch(error => {
        throw new APIRequestError(
          errorBuilder({
            message: `Error fetching data from WattTime API. ${JSON.stringify(
              (error.response &&
                error.response.data &&
                error.response.data.message) ||
                error
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

    return simplifyAndSortData(result.data.data).flat();
  };

  const simplifyAndSortData = (data: any) => {
    const forecasts = data.map(
      (item: {forecast: []; generated_at: string}) => item.forecast
    );

    return sortData(forecasts);
  };

  /**
   * Sorts the data based on the 'point_time' property in ascending order.
   */
  const sortData = <T extends {point_time: string}>(data: T[]) => {
    return data.sort((a: T, b: T) => {
      return dayjs(a.point_time).unix() > dayjs(b.point_time).unix() ? 1 : -1;
    });
  };

  return {
    authenticate,
    fetchAndSortData,
    fetchDataWithRegion,
  };
};
