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
        const output = WattTimeGridEmissions();

        expect(output).toHaveProperty('metadata');
        expect(output).toHaveProperty('execute');
      });
    });

    describe('execute(): ', () => {
      it.skip('returns a result with valid data.', async () => {
        process.env.WATT_TIME_USERNAME = 'test1';
        process.env.WATT_TIME_PASSWORD = 'test2';

        const output = WattTimeGridEmissions();
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
            'grid/carbon-intensity': 2185.332173907599,
          },
        ]);
      });

      it('throws an error when `token` is missing.', async () => {
        const errorMessage =
          'WattTimeAPI(authorization): Missing token in response. Invalid credentials provided.';
        process.env.WATT_TIME_USERNAME = 'ENV_WATT_USERNAME';
        process.env.WATT_TIME_PASSWORD = 'ENV_WATT_PASSWORD';

        expect.assertions(2);

        try {
          const output = WattTimeGridEmissions();
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
          'WattTimeAPI(authorization): Missing token in response. Invalid credentials provided.';
        expect.assertions(2);

        try {
          const output = WattTimeGridEmissions();
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

      it('throws an error when initialize with wrong username / password.', async () => {
        process.env.WATT_TIME_USERNAME = 'wrong1';
        process.env.WATT_TIME_PASSWORD = 'wrong2';
        const output = WattTimeGridEmissions();

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
          expect(error).toBeInstanceOf(AuthorizationError);
        }
      });

      it('throws an error when wrong `geolocation` is provided.', async () => {
        const errorMessage =
          '"geolocation" parameter is not a comma-separated string consisting of `latitude` and `longitude`. Error code: invalid_string.,at least one of `geolocation`, `cloud/region-wt-id`, or `cloud/region-geolocation` parameters should be provided.';
        process.env.WATT_TIME_USERNAME = 'test1';
        process.env.WATT_TIME_PASSWORD = 'test2';

        const output = WattTimeGridEmissions();

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
          expect(error).toEqual(
            new InputValidationError(
              '"geolocation" parameter is not a comma-separated string consisting of `latitude` and `longitude`. Error code: invalid_string.'
            )
          );
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
          expect(error).toEqual(
            new InputValidationError(
              '"geolocation" parameter is not a comma-separated string consisting of `latitude` and `longitude`. Error code: invalid_string.'
            )
          );
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
        process.env.WATT_TIME_USERNAME = 'invalidData1';
        process.env.WATT_TIME_PASSWORD = 'invalidData2';

        const output = WattTimeGridEmissions();

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
        const errorMessage = 'WattTimeAPI: Invalid response from WattTime API.';
        process.env.WATT_TIME_USERNAME = 'fetchError1';
        process.env.WATT_TIME_PASSWORD = 'fetchError2';

        const output = WattTimeGridEmissions();
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
    });
  });
});
