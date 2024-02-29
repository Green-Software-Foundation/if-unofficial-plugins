import axios from 'axios';

import {WattTimeGridEmissions} from '../../../../lib';

import {ERRORS} from '../../../../util/errors';

import {getMockResponse} from '../../../../__mocks__/watt-time/index';

jest.mock('axios');

const mockAxios = axios as jest.Mocked<typeof axios>;
const {AuthorizationError, InputValidationError, APIRequestError} = ERRORS;

mockAxios.get.mockImplementation(getMockResponse);

describe('lib/watt-time: ', () => {
  describe('WattTimeGridEmissions: ', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('init WattTimeGridEmissions: ', () => {
      it('initalizes object with properties.', async () => {
        const output = WattTimeGridEmissions({});

        expect(output).toHaveProperty('metadata');
        expect(output).toHaveProperty('execute');
      });
    });

    describe('execute(): ', () => {
      it('returns a result with valid data.', async () => {
        const output = WattTimeGridEmissions({
          username: 'test1',
          password: 'test2',
        });

        const result = await output.execute([
          {
            geolocation: '37.7749,-122.4194',
            timestamp: '2021-01-01T00:00:00Z',
            duration: 1200,
          },
        ]);

        expect(result).toStrictEqual([
          {
            geolocation: '37.7749,-122.4194',
            timestamp: '2021-01-01T00:00:00Z',
            duration: 1200,
            'grid/carbon-intensity': 2096.256940667132,
          },
        ]);
      });

      it('throws an error when `token` is missing.', async () => {
        const errorMessage =
          'WattTimeAPI(authorization): Missing token in response. Invalid credentials provided.';

        expect.assertions(2);

        try {
          const output = WattTimeGridEmissions({
            username: 'ENV_WATT_USERNAME',
            password: 'ENV_WATT_PASSWORD',
          });
          await output.execute([
            {
              geolocation: '37.7749,-122.4194',
              timestamp: '2021-01-01T00:00:00Z',
              duration: 360,
            },
          ]);
        } catch (error) {
          expect(error).toBeInstanceOf(AuthorizationError);
          expect(error).toEqual(new AuthorizationError(errorMessage));
        }
      });

      it('throws an error when credentials are missing.', async () => {
        const errorMessage =
          '"username" parameter is required. Error code: invalid_type.,"password" parameter is required. Error code: invalid_type.';

        expect.assertions(2);

        try {
          const output = WattTimeGridEmissions({
            token: 'ENV_WATT_TOKEN',
          });
          await output.execute([
            {
              geolocation: '37.7749,-122.4194',
              timestamp: '2021-01-01T00:00:00Z',
              duration: 360,
            },
          ]);
        } catch (error) {
          expect(error).toBeInstanceOf(InputValidationError);
          expect(error).toEqual(new InputValidationError(errorMessage));
        }
      });

      it('throws an error when initialize with wrong username / password.', async () => {
        const output = WattTimeGridEmissions({
          baseUrl: 'https://apifail.watttime.org/v2',
          username: 'test1',
          password: 'test2',
        });

        expect.assertions(1);

        try {
          await output.execute([
            {
              geolocation: '37.7749,-122.4194',
              timestamp: '2021-01-01T00:00:00Z',
              duration: 360,
            },
          ]);
        } catch (error) {
          expect(error).toBeInstanceOf(APIRequestError);
        }
      });

      it('throws an error when wrong `geolocation` is provided.', async () => {
        const errorMessage =
          '"geolocation" parameter is should be a comma-separated string consisting of `latitude` and `longitude`. Error code: invalid_string.';
        const output = WattTimeGridEmissions({
          username: 'test1',
          password: 'test2',
        });

        expect.assertions(6);

        try {
          await output.execute([
            {
              geolocation: '0,-122.4194',
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
            },
          ]);
        } catch (error) {
          expect(error).toBeInstanceOf(InputValidationError);
          expect(error).toEqual(new InputValidationError(errorMessage));
        }

        try {
          await output.execute([
            {
              geolocation: '0',
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
            },
          ]);
        } catch (error) {
          expect(error).toBeInstanceOf(InputValidationError);
          expect(error).toEqual(new InputValidationError(errorMessage));
        }

        try {
          await output.execute([
            {
              geolocation: '',
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
            },
          ]);
        } catch (error) {
          expect(error).toBeInstanceOf(InputValidationError);
          expect(error).toEqual(new InputValidationError(errorMessage));
        }
      });

      it('throws an error when no data is returned by API.', async () => {
        const errorMessage = 'WattTimeAPI: Invalid response from WattTime API.';
        const output = WattTimeGridEmissions({
          username: 'test1',
          password: 'test2',
          baseUrl: 'https://apifail2.watttime.org/v2',
        });

        expect.assertions(2);
        try {
          await output.execute([
            {
              geolocation: '37.7749,-122.4194',
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
            },
            {
              geolocation: '37.7749,-122.4194',
              timestamp: '2021-01-02T01:00:00Z',
              duration: 3600,
            },
          ]);
        } catch (error) {
          expect(error).toBeInstanceOf(APIRequestError);
          expect(error).toEqual(new APIRequestError(errorMessage));
        }
      });

      it('throws an error when an unauthorized error occurs during data fetch.', async () => {
        const errorMessage =
          'WattTimeAPI: Error fetching data from WattTime API. {"status":401,"data":{"none":{}}}.';
        const output = WattTimeGridEmissions({
          username: 'test1',
          password: 'test2',
          baseUrl: 'https://apifail3.watttime.org/v2',
        });

        try {
          await output.execute([
            {
              geolocation: '37.7749,-122.4194',
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
            },
            {
              geolocation: '37.7749,-122.4194',
              timestamp: '2021-01-02T01:00:00Z',
              duration: 3600,
            },
          ]);
        } catch (error) {
          expect(error).toBeInstanceOf(APIRequestError);
          expect(error).toEqual(new APIRequestError(errorMessage));
        }
      });

      it('throws an error when span is more than 32 days.', async () => {
        const errorMessage =
          'WattTimeGridEmissions: WattTime API supports up to 32 days. Duration of 31537200 seconds is too long.';

        const output = WattTimeGridEmissions({
          username: 'test1',
          password: 'test2',
        });

        try {
          await output.execute([
            {
              geolocation: '37.7749,-122.4194',
              timestamp: '2021-01-01T00:00:00Z',
              duration: 1200,
            },
            {
              geolocation: '37.7749,-122.4194',
              timestamp: '2022-01-01T00:00:00Z',
              duration: 1200,
            },
          ]);
        } catch (error) {
          expect(error).toBeInstanceOf(InputValidationError);
          expect(error).toEqual(new InputValidationError(errorMessage));
        }
      });
    });
  });
});
