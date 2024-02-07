import * as dayjs from 'dayjs';
import axios from 'axios';

import {ERRORS} from '../../util/errors';
import {buildErrorMessage} from '../../util/helpers';

import {WattTimeParams, WattAuthType} from './types';

const {AuthorizationError, APIRequestError} = ERRORS;

export class WattTimeAPI {
  private baseUrl: string = 'https://api2.watttime.org/v2';
  private token: string = '';

  errorBuilder = buildErrorMessage(WattTimeAPI);

  /**
   * Authenticates the user with the WattTime API using the provided authentication parameters.
   * If a token is not provided, attempts to authenticate with the provided username and password.
   * Updates the token and base URL for API requests upon successful authentication.
   */
  public async authenticate(authParams: WattAuthType): Promise<void> {
    this.token = authParams['token'] ?? '';
    this.baseUrl = authParams['baseUrl'] ?? this.baseUrl;

    if (this.token === '') {
      const {username, password} = authParams;
      const tokenResponse = await axios.get(`${this.baseUrl}/login`, {
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
          this.errorBuilder({
            message: 'Missing token in response. Invalid credentials provided',
            scope: 'authorization',
          })
        );
      }

      this.token = tokenResponse.data.token;
    }
  }

  /**
   * Fetches and sorts data from the WattTime API based on the provided parameters.
   * Throws an APIRequestError if an error occurs during the request or if the response is invalid.
   */
  public async fetchAndSortData(params: WattTimeParams) {
    const result = await axios
      .get(`${this.baseUrl}/data`, {
        params,
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      })
      .catch(error => {
        throw new APIRequestError(
          this.errorBuilder({
            message: `Error fetching data from WattTime API. ${JSON.stringify(
              error
            )}`,
          })
        );
      });

    if (result.status !== 200) {
      throw new APIRequestError(
        this.errorBuilder({
          message: `Error fetching data from WattTime API: ${JSON.stringify(
            result.status
          )}`,
        })
      );
    }

    if (!('data' in result) || !Array.isArray(result.data)) {
      throw new APIRequestError(
        this.errorBuilder({
          message: 'Invalid response from WattTime API',
        })
      );
    }

    return this.sortData(result.data);
  }

  /**
   * Sorts the data based on the 'point_time' property in ascending order.
   */
  private sortData(data: object[]) {
    return data.sort((a: any, b: any) => {
      return dayjs(a.point_time).unix() > dayjs(b.point_time).unix() ? 1 : -1;
    });
  }
}
