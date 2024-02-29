import * as dayjs from 'dayjs';
import axios from 'axios';

import {ERRORS} from '../../util/errors';
import {buildErrorMessage} from '../../util/helpers';

import {WattTimeParams, WattAuthType} from './types';

const {AuthorizationError, APIRequestError} = ERRORS;

export const WattTimeAPI = () => {
  let baseUrl = 'https://api2.watttime.org/v2';
  let token = '';

  const errorBuilder = buildErrorMessage(WattTimeAPI.name);

  /**
   * Authenticates the user with the WattTime API using the provided authentication parameters.
   * If a token is not provided, attempts to authenticate with the provided username and password.
   * Updates the token and base URL for API requests upon successful authentication.
   */
  const authenticate = async (authParams: WattAuthType): Promise<void> => {
    token = authParams['token'] ?? '';
    baseUrl = authParams['baseUrl'] ?? baseUrl;

    if (token === '') {
      const {username, password} = authParams;
      const tokenResponse = await axios.get(`${baseUrl}/login`, {
        auth: {
          username,
          password,
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
   * Fetches and sorts data from the WattTime API based on the provided parameters.
   * Throws an APIRequestError if an error occurs during the request or if the response is invalid.
   */
  const fetchAndSortData = async (params: WattTimeParams) => {
    const result = await axios
      .get(`${baseUrl}/data`, {
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
  };
};
