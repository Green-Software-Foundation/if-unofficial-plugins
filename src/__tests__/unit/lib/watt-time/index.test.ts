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
    let outputModel: WattTimeGridEmissions;

    beforeEach(() => {
      jest.clearAllMocks();
      outputModel = new WattTimeGridEmissions();
    });

    describe('init WattTimeGridEmissions: ', () => {
      it('initalizes object with properties.', async () => {
        expect(outputModel).toHaveProperty('configure');
        expect(outputModel).toHaveProperty('execute');
      });
    });

    describe('configure(): ', () => {
      it('configures WattTimeGridEmissions.', async () => {
        const model = await outputModel.configure({
          username: 'test1',
          password: 'test2',
        });

        expect.assertions(1);
        expect(model).toBeInstanceOf(WattTimeGridEmissions);
      });

      it('throws an error when initialize with undefined environment variables.', async () => {
        const errorMessage =
          'WattTimeAPI(authorization): Missing token in response. Invalid credentials provided.';

        expect.assertions(2);

        try {
          await outputModel.configure({
            username: 'ENV_WATT_USERNAME',
            password: 'ENV_WATT_PASSWORD',
          });

          await outputModel.configure({
            token: 'ENV_WATT_TOKEN',
          });
        } catch (error) {
          expect(error).toBeInstanceOf(AuthorizationError);
          expect(error).toEqual(new AuthorizationError(errorMessage));
        }
      });

      it('throws an error when initialize with wrong credentials.', async () => {
        const errorMessage =
          'WattTimeAPI(authorization): Missing token in response. Invalid credentials provided.';

        expect.assertions(2);

        try {
          await outputModel.configure({
            username: 'test1',
            password: 'test1',
          });
        } catch (error) {
          expect(error).toBeInstanceOf(AuthorizationError);
          expect(error).toEqual(new AuthorizationError(errorMessage));
        }
      });

      it('throws an error when initialize without username.', async () => {
        const errorMessage =
          '"username" parameter is required. Error code: invalid_type.';

        expect.assertions(2);

        try {
          await outputModel.configure({
            password: 'test1',
          });
        } catch (error) {
          expect(error).toBeInstanceOf(InputValidationError);
          expect(error).toEqual(new InputValidationError(errorMessage));
        }
      });
    });

    describe('execute(): ', () => {
      it('returns a result with valid data.', async () => {
        await outputModel.configure({
          username: 'test1',
          password: 'test2',
        });

        const result = await outputModel.execute([
          {
            location: '37.7749,-122.4194',
            timestamp: '2021-01-01T00:00:00Z',
            duration: 1200,
          },
        ]);

        expect(result).toStrictEqual([
          {
            location: '37.7749,-122.4194',
            timestamp: '2021-01-01T00:00:00Z',
            duration: 1200,
            'grid-carbon-intensity': 2185.332173907599,
          },
        ]);
      });

      it('throws an error when initialize with wrong username / password.', async () => {
        await outputModel.configure({
          baseUrl: 'https://apifail.watttime.org/v2',
          username: 'test1',
          password: 'test2',
        });

        expect.assertions(1);

        try {
          await outputModel.execute([
            {
              location: '37.7749,-122.4194',
              timestamp: '2021-01-01T00:00:00Z',
              duration: 360,
            },
          ]);
        } catch (error) {
          expect(error).toBeInstanceOf(APIRequestError);
        }
      });

      it('throws an error if watttime api returns wrong data.', async () => {
        const errorMessage =
          'WattTimeGridEmissions: Did not receive data from WattTime API for the input[1] block.';
        await outputModel.configure({
          username: 'test1',
          password: 'test2',
        });

        const inputs = [
          {
            location: '37.7749,-122.4194',
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
          },
          {
            location: '37.7749,-122.4194',
            timestamp: '2021-01-02T01:00:00Z',
            duration: 3600,
          },
        ];

        expect.assertions(2);

        try {
          await outputModel.execute(inputs);
        } catch (error) {
          expect(error).toBeInstanceOf(InputValidationError);
          expect(error).toEqual(new InputValidationError(errorMessage));
        }
      });

      it('throws an error when wrong `location` is provided.', async () => {
        const errorMessage =
          "\"location\" parameter is 'location' should be a comma separated string of 'latitude' and 'longitude'. Error code: invalid_string.";
        await outputModel.configure({
          username: 'test1',
          password: 'test2',
        });

        expect.assertions(6);

        try {
          await outputModel.execute([
            {
              location: '0,-122.4194',
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
            },
          ]);
        } catch (error) {
          expect(error).toBeInstanceOf(InputValidationError);
          expect(error).toEqual(new InputValidationError(errorMessage));
        }

        try {
          await outputModel.execute([
            {
              location: '0',
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
            },
          ]);
        } catch (error) {
          expect(error).toBeInstanceOf(InputValidationError);
          expect(error).toEqual(new InputValidationError(errorMessage));
        }

        try {
          await outputModel.execute([
            {
              location: '',
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
        outputModel.configure({
          username: 'test1',
          password: 'test2',
          baseUrl: 'https://apifail2.watttime.org/v2',
        });

        expect.assertions(2);
        try {
          await outputModel.execute([
            {
              location: '37.7749,-122.4194',
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
            },
            {
              location: '37.7749,-122.4194',
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
        await outputModel.configure({
          username: 'test1',
          password: 'test2',
          baseUrl: 'https://apifail3.watttime.org/v2',
        });

        try {
          await outputModel.execute([
            {
              location: '37.7749,-122.4194',
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
            },
            {
              location: '37.7749,-122.4194',
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

        await outputModel.configure({
          username: 'test1',
          password: 'test2',
        });

        try {
          await outputModel.execute([
            {
              location: '37.7749,-122.4194',
              timestamp: '2021-01-01T00:00:00Z',
              duration: 1200,
            },
            {
              location: '37.7749,-122.4194',
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
