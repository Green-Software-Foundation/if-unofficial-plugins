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

      it('returns a result `geolocation` is overriden by `cloud/region-geolocation`.', async () => {
        process.env.WATT_TIME_USERNAME = 'test1';
        process.env.WATT_TIME_PASSWORD = 'test2';

        const output = WattTimeGridEmissions();
        const result = await output.execute([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 1200,
            geolocation: '37.7749,-122.4194',
            'cloud/region-geolocation': '48.8567,2.3522',
          },
        ]);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 1200,
            geolocation: '48.8567,2.3522',
            'cloud/region-geolocation': '48.8567,2.3522',
            'grid/carbon-intensity': 2185.332173907599,
          },
        ]);
      });

      it('returns a result `cloud/region-wt-id` is provided.', async () => {
        process.env.WATT_TIME_USERNAME = 'region-wt';
        process.env.WATT_TIME_PASSWORD = 'region-wt';

        const output = WattTimeGridEmissions();
        const result = await output.execute([
          {
            timestamp: '2024-03-05T00:00:00.000Z',
            duration: 5,
            geolocation: '37.7749,-122.4194',
            'cloud/region-geolocation': '48.8567,2.3522',
            'cloud/region-wt-id': 'FR',
            'signal-type': 'co2_moer',
          },
        ]);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            timestamp: '2024-03-05T00:00:00.000Z',
            duration: 5,
            geolocation: '48.8567,2.3522',
            'cloud/region-geolocation': '48.8567,2.3522',
            'cloud/region-wt-id': 'FR',
            'grid/carbon-intensity': 1719.1647205176753,
            'signal-type': 'co2_moer',
          },
        ]);
      });

      it('returns a result when `grid/carbon-intensity` set to 0 when there is no data from API.', async () => {
        process.env.WATT_TIME_USERNAME = 'region-wt';
        process.env.WATT_TIME_PASSWORD = 'region-wt';

        const output = WattTimeGridEmissions();
        const result = await output.execute([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 5,
            geolocation: '37.7749,-122.4194',
            'cloud/region-geolocation': '48.8567,2.3522',
            'cloud/region-wt-id': 'FR',
            'signal-type': 'co2_moer',
          },
        ]);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 5,
            geolocation: '48.8567,2.3522',
            'cloud/region-geolocation': '48.8567,2.3522',
            'cloud/region-wt-id': 'FR',
            'grid/carbon-intensity': 0,
            'signal-type': 'co2_moer',
          },
        ]);
      });

      it('returns a result when `signal-type` is not provided.', async () => {
        process.env.WATT_TIME_USERNAME = 'signalType';
        process.env.WATT_TIME_PASSWORD = 'signalType';

        expect.assertions(2);

        const output = WattTimeGridEmissions();
        const result = await output.execute([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 5,
            geolocation: '37.7749,-122.4194',
            'cloud/region-geolocation': '48.8567,2.3522',
            'cloud/region-wt-id': 'FR',
          },
        ]);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 5,
            geolocation: '48.8567,2.3522',
            'cloud/region-geolocation': '48.8567,2.3522',
            'cloud/region-wt-id': 'FR',
            'grid/carbon-intensity': 0,
          },
        ]);
      });

      it('throws an error when API gives an error.', async () => {
        const errorMessage =
          'WattTimeAPI: Error fetching data from WattTime API. {"status":400,"error":{"message":"error"}}.';
        process.env.WATT_TIME_USERNAME = 'API_error';
        process.env.WATT_TIME_PASSWORD = 'API_error';

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
          expect(error).toBeInstanceOf(APIRequestError);
          expect(error).toEqual(new APIRequestError(errorMessage));
        }
      });

      it('throws an error when API gives an error for getting `cloud/region-wt-id`.', async () => {
        const errorMessage =
          'WattTimeAPI: Error fetching data from WattTime API. {"status":400,"error":{"message":"error"}}.';
        process.env.WATT_TIME_USERNAME = 'invalidRegionWT';
        process.env.WATT_TIME_PASSWORD = 'invalidRegionWT';

        expect.assertions(2);

        try {
          const output = WattTimeGridEmissions();
          await output.execute([
            {
              timestamp: '2024-03-05T00:00:00.000Z',
              duration: 5,
              geolocation: '37.7749,-122.4194',
              'cloud/region-geolocation': '48.8567,2.3522',
              'cloud/region-wt-id': 'FR',
              'signal-type': 'co2_moer',
            },
          ]);
        } catch (error) {
          expect(error).toBeInstanceOf(APIRequestError);
          expect(error).toEqual(new APIRequestError(errorMessage));
        }
      });

      it("throws an error when API's status is not 200 while attempting to retrieve `cloud/region-wt-id` data.", async () => {
        const errorMessage =
          'WattTimeAPI: Error fetching data from WattTime API: 400.';
        process.env.WATT_TIME_USERNAME = 'invalidRegionWT1';
        process.env.WATT_TIME_PASSWORD = 'invalidRegionWT1';

        expect.assertions(2);

        try {
          const output = WattTimeGridEmissions();
          await output.execute([
            {
              timestamp: '2024-03-05T00:00:00.000Z',
              duration: 5,
              geolocation: '37.7749,-122.4194',
              'cloud/region-geolocation': '48.8567,2.3522',
              'cloud/region-wt-id': 'FR',
              'signal-type': 'co2_moer',
            },
          ]);
        } catch (error) {
          expect(error).toBeInstanceOf(APIRequestError);
          expect(error).toEqual(new APIRequestError(errorMessage));
        }
      });

      it('throws an error when API gives an not valid data for `cloud/region-wt-id`.', async () => {
        const errorMessage = 'WattTimeAPI: Invalid response from WattTime API.';
        process.env.WATT_TIME_USERNAME = 'invalidRegionWT2';
        process.env.WATT_TIME_PASSWORD = 'invalidRegionWT2';

        expect.assertions(2);

        try {
          const output = WattTimeGridEmissions();
          await output.execute([
            {
              timestamp: '2024-03-05T00:00:00.000Z',
              duration: 5,
              geolocation: '37.7749,-122.4194',
              'cloud/region-geolocation': '48.8567,2.3522',
              'cloud/region-wt-id': 'FR',
              'signal-type': 'co2_moer',
            },
          ]);
        } catch (error) {
          expect(error).toBeInstanceOf(APIRequestError);
          expect(error).toEqual(new APIRequestError(errorMessage));
        }
      });

      it('throws an error when the response of the API is not valid data.', async () => {
        const errorMessage = 'WattTimeAPI: Invalid response from WattTime API.';
        process.env.WATT_TIME_USERNAME = 'invalidData';
        process.env.WATT_TIME_PASSWORD = 'invalidData';

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
          expect(error).toBeInstanceOf(APIRequestError);
          expect(error).toEqual(new APIRequestError(errorMessage));
        }
      });

      it('throws an error when the response of the API is not valid data.', async () => {
        const errorMessage = 'WattTimeAPI: Invalid response from WattTime API.';
        process.env.WATT_TIME_USERNAME = 'invalidData';
        process.env.WATT_TIME_PASSWORD = 'invalidData';

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
          expect(error).toBeInstanceOf(APIRequestError);
          expect(error).toEqual(new APIRequestError(errorMessage));
        }
      });

      it('throws an error when for getting `signal-type` the API gives an error.', async () => {
        const errorMessage =
          'WattTimeAPI: Error fetching `signal_type` from WattTime API. {"status":400,"error":{"message":"error"}}.';
        process.env.WATT_TIME_USERNAME = 'invalidSignalType';
        process.env.WATT_TIME_PASSWORD = 'invalidSignalType';

        expect.assertions(2);

        try {
          const output = WattTimeGridEmissions();
          await output.execute([
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 5,
              geolocation: '37.7749,-122.4194',
              'cloud/region-geolocation': '48.8567,2.3522',
              'cloud/region-wt-id': 'FR',
            },
          ]);
        } catch (error) {
          expect(error).toBeInstanceOf(APIRequestError);
          expect(error).toEqual(new APIRequestError(errorMessage));
        }
      });

      it('throws an error when the API gives an invalid `signal-type` data.', async () => {
        const errorMessage = 'WattTimeAPI: Invalid response from WattTime API.';
        process.env.WATT_TIME_USERNAME = 'invalidSignalType1';
        process.env.WATT_TIME_PASSWORD = 'invalidSignalType1';

        expect.assertions(2);

        try {
          const output = WattTimeGridEmissions();
          await output.execute([
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 5,
              geolocation: '37.7749,-122.4194',
              'cloud/region-geolocation': '48.8567,2.3522',
              'cloud/region-wt-id': 'FR',
            },
          ]);
        } catch (error) {
          expect(error).toBeInstanceOf(APIRequestError);
          expect(error).toEqual(new APIRequestError(errorMessage));
        }
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
        const errorMessage =
          'WattTimeAPI: Error fetching data from WattTime API: 400.';
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
        const errorMessage =
          'WattTimeAPI: Error fetching data from WattTime API: 400.';
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

      it('throws an error when span is more than 32 days.', async () => {
        const errorMessage =
          'WattTimeGridEmissions: WattTime API supports up to 32 days. Duration of 31537200 seconds is too long.';
        process.env.WATT_TIME_USERNAME = 'test1';
        process.env.WATT_TIME_PASSWORD = 'test2';

        const output = WattTimeGridEmissions();
        expect.assertions(2);

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
