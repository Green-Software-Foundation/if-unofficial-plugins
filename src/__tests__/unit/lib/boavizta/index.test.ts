import axios from 'axios';

import {
  BoaviztaCloudOutputModel,
  BoaviztaCpuOutputModel,
} from '../../../../lib/boavizta/index';

import {ERRORS} from '../../../../util/errors';

import {mockGet, mockPost} from '../../../../__mocks__/boavizta/axios';

const {InputValidationError, UnsupportedValueError} = ERRORS;

jest.mock('axios');

const mockAxios = axios as jest.Mocked<typeof axios>;

// Mock out all top level functions, such as get, put, delete and post:
mockAxios.get.mockImplementation(mockGet);
mockAxios.post.mockImplementation(mockPost);

describe('lib/boavizta: ', () => {
  describe('CpuOutputModel: ', () => {
    let outputModel: BoaviztaCpuOutputModel;

    beforeEach(() => {
      jest.clearAllMocks();
      outputModel = new BoaviztaCpuOutputModel();
    });

    describe('init BoaviztaCpuOutputModel: ', () => {
      it('initalizes object with properties.', async () => {
        expect(outputModel).toHaveProperty('configure');
        expect(outputModel).toHaveProperty('execute');
      });
    });

    describe('configure(): ', () => {
      it('configures with valid data.', async () => {
        const configuredModel = await outputModel.configure({
          'physical-processor': 'Intel Xeon Gold 6138f',
          'core-units': 24,
          'expected-lifespan': 4 * 365 * 24 * 60 * 60,
        });

        expect.assertions(1);

        expect(configuredModel).toBeInstanceOf(BoaviztaCpuOutputModel);
      });

      it('throws an error when no data is provided.', async () => {
        expect.assertions(1);

        try {
          await outputModel.configure({});
        } catch (error) {
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });

      it('throws an error when not provided all required data.', async () => {
        expect.assertions(1);

        try {
          await outputModel.configure({
            'physical-processor': 'Intel Xeon Gold 6138f',
          });
        } catch (error) {
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });
    });

    describe('execute(): ', () => {
      it('returns a result when provided a valid data.', async () => {
        expect.assertions(1);

        await outputModel.configure({
          'physical-processor': 'Intel Xeon Gold 6138f',
          'core-units': 24,
          location: 'USA',
        });

        const result = await outputModel.execute([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'cpu-util': 50,
          },
        ]);

        expect(result).toStrictEqual([
          {
            'embodied-carbon': 0.8,
            'energy-cpu': 0.575,
          },
        ]);
      });

      it('returns a result when call multiple usages in IMPL format:verbose.', async () => {
        expect.assertions(1);

        await outputModel.configure({
          'physical-processor': 'Intel Xeon Gold 6138f',
          'core-units': 24,
          location: 'USA',
          verbose: false,
        });

        await outputModel.configure({
          'physical-processor': 'Intel Xeon Gold 6138f',
          'core-units': 24,
          location: 'USA',
          verbose: true,
        });

        const result = await outputModel.execute([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 7200,
            'cpu-util': 100,
          },
        ]);

        expect(result).toStrictEqual([
          {
            'embodied-carbon': 1.6,
            'energy-cpu': 1.6408333333333334,
          },
        ]);
      });

      it('returns an empty array when the input is an empty array.', async () => {
        await outputModel.configure({
          'physical-processor': 'Intel Xeon Gold 6138f',
          'core-units': 24,
          location: 'USA',
        });

        expect.assertions(1);

        expect(await outputModel.execute([])).toEqual([]);
      });

      it('throws an error when the metric type is missing from the input.', async () => {
        await outputModel.configure({
          'physical-processor': 'Intel Xeon Gold 6138f',
          'core-units': 24,
          location: 'USA',
        });
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
          },
        ];

        expect.assertions(1);

        try {
          await outputModel.execute(inputs);
        } catch (error) {
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });
    });
  });

  describe('CloudOutputModel', () => {
    let outputModel: BoaviztaCloudOutputModel;

    beforeEach(() => {
      jest.clearAllMocks();
      outputModel = new BoaviztaCloudOutputModel();
    });

    describe('init BoaviztaCloudOutputModel: ', () => {
      it('initalizes object with properties.', async () => {
        expect(outputModel).toHaveProperty('configure');
        expect(outputModel).toHaveProperty('execute');
      });
    });

    describe('configure(): ', () => {
      it('configures with valid data.', async () => {
        expect.assertions(1);

        expect(
          await outputModel.configure({
            'instance-type': 't2.micro',
            location: 'USA',
            'expected-lifespan': 4 * 365 * 24 * 60 * 60,
            provider: 'aws',
            verbose: false,
          })
        ).toBeInstanceOf(BoaviztaCloudOutputModel);
      });

      it('throws an error when the `verbose` is not boolean.', async () => {
        expect.assertions(2);

        try {
          await outputModel.configure({
            'instance-type': 't2.micro',
            location: 'USA',
            'expected-lifespan': 4 * 365 * 24 * 60 * 60,
            provider: 'aws',
            verbose: 'false',
          });
        } catch (error) {
          expect(error).toBeInstanceOf(InputValidationError);
        }

        try {
          await outputModel.configure({
            'instance-type': 't2.micro',
            location: 'USA',
            'expected-lifespan': 4 * 365 * 24 * 60 * 60,
            provider: 'aws',
            verbose: 0,
          });
        } catch (error) {
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });

      it('throws an error when no data is provided.', async () => {
        const errorMessage =
          '"provider" parameter is required. Error code: invalid_type.,"instance-type" parameter is required. Error code: invalid_type.';
        expect.assertions(2);

        try {
          await outputModel.configure({});
        } catch (error) {
          expect(error).toEqual(new InputValidationError(errorMessage));
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });

      it('throws an error when the `provider` is missing.', async () => {
        const errorMessage =
          '"provider" parameter is required. Error code: invalid_type.';

        expect.assertions(2);

        try {
          await outputModel.configure({
            'instance-type': 't2.micro',
            location: 'USA',
          });
        } catch (error) {
          expect(error).toEqual(new InputValidationError(errorMessage));
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });

      it('throws an error when the `provider` is wrong.', async () => {
        const errorMessage =
          "BoaviztaCloudOutputModel: Invalid 'provider' parameter 'wrongProvider'. Valid values are aws.";

        expect.assertions(2);

        try {
          await outputModel.configure({
            'instance-type': 't2.micro',
            location: 'USA',
            provider: 'wrongProvider',
          });
        } catch (error) {
          expect(error).toEqual(new InputValidationError(errorMessage));
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });

      it('throws an error when the `instance-type` is missing.', async () => {
        const errorMessage =
          '"instance-type" parameter is required. Error code: invalid_type.';
        expect.assertions(2);

        try {
          await outputModel.configure({
            provider: 'aws',
            location: 'USA',
          });
        } catch (error) {
          expect(error).toEqual(new InputValidationError(errorMessage));
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });

      it('throws an error when the `instance-type` is wrong.', async () => {
        expect.assertions(1);

        try {
          await outputModel.configure({
            'instance-type': 't5.micro',
            location: 'USA',
            provider: 'aws',
          });
        } catch (error) {
          expect(error).toBeInstanceOf(UnsupportedValueError);
        }
      });

      it('throws an error when the `location` has wrong.', async () => {
        expect.assertions(1);

        try {
          await outputModel.configure({
            'instance-type': 't2.micro',
            location: 'wrongLocation',
            provider: 'aws',
          });
        } catch (error) {
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });
    });

    describe('execute(): ', () => {
      it('returns a result when provided valid input data.', async () => {
        expect.assertions(2);

        expect(
          await outputModel.configure({
            'instance-type': 't2.micro',
            location: 'USA',
            provider: 'aws',
          })
        ).toBeInstanceOf(BoaviztaCloudOutputModel);

        expect(
          await outputModel.execute([
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 15,
              'cpu-util': 34,
            },
          ])
        ).toStrictEqual([
          {
            'embodied-carbon': 1.6,
            energy: 1.6408333333333334,
          },
        ]);
      });

      it('returns an empty array when the input is an empty array.', async () => {
        await outputModel.configure({
          'instance-type': 't2.micro',
          location: 'USA',
          'expected-lifespan': 4 * 365 * 24 * 60 * 60,
          provider: 'aws',
        });

        expect.assertions(1);

        expect(await outputModel.execute([])).toEqual([]);
      });

      it('throws an error when the metric type is missing from the input.', async () => {
        expect.assertions(2);

        expect(
          await outputModel.configure({
            'instance-type': 't2.micro',
            location: 'USA',
            provider: 'aws',
          })
        ).toBeInstanceOf(BoaviztaCloudOutputModel);

        try {
          await outputModel.execute([
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 15,
            },
          ]);
        } catch (error) {
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });
    });
  });
});
