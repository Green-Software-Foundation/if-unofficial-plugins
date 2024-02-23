import axios from 'axios';

import {
  BoaviztaCloudOutput,
  BoaviztaCpuOutput,
} from '../../../../lib/boavizta/index';

import {ERRORS} from '../../../../util/errors';

import {mockGet, mockPost} from '../../../../__mocks__/boavizta/axios';

const {InputValidationError} = ERRORS;

jest.mock('axios');

const mockAxios = axios as jest.Mocked<typeof axios>;

// Mock out all top level functions, such as get, put, delete and post:
mockAxios.get.mockImplementation(mockGet);
mockAxios.post.mockImplementation(mockPost);

describe('lib/boavizta: ', () => {
  describe('CpuOutputModel: ', () => {
    const outputModel = BoaviztaCpuOutput({});

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('init BoaviztaCpuOutput: ', () => {
      it('initalizes object with properties.', async () => {
        expect(outputModel).toHaveProperty('metadata');
        expect(outputModel).toHaveProperty('execute');
      });
    });

    describe('execute(): ', () => {
      it('returns a result when provided a valid data.', async () => {
        expect.assertions(1);

        const outputModel = BoaviztaCpuOutput({});
        const result = await outputModel.execute([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'cpu/utilization': 50,
            'cpu/name': 'Intel Xeon Gold 6138f',
            'cpu/number-cores': 24,
            country: 'USA',
          },
        ]);

        expect(result).toStrictEqual([
          {
            'carbon-embodied': 0.8,
            'energy-cpu': 0.575,
          },
        ]);
      });

      it('returns a result when `verbose` is provided in the global config.', async () => {
        expect.assertions(1);

        const outputModel = BoaviztaCpuOutput({verbose: true});

        const result = await outputModel.execute([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 7200,
            'cpu/utilization': 100,
            'cpu/name': 'Intel Xeon Gold 6138f',
            'cpu/number-cores': 24,
            country: 'USA',
          },
        ]);

        expect(result).toStrictEqual([
          {
            'carbon-embodied': 1.6,
            'energy-cpu': 1.6408333333333334,
          },
        ]);
      });

      it('returns an empty array when the input is an empty array.', async () => {
        expect.assertions(1);

        expect(await outputModel.execute([])).toEqual([]);
      });

      it('throws an error when the metric type is missing from the input.', async () => {
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'cpu/name': 'Intel Xeon Gold 6138f',
            'cpu/number-cores': 24,
            country: 'USA',
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
    const outputModel = BoaviztaCloudOutput({});

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('init BoaviztaCloudOutput: ', () => {
      it('initalizes object with properties.', async () => {
        expect(outputModel).toHaveProperty('metadata');
        expect(outputModel).toHaveProperty('execute');
      });
    });

    describe('execute(): ', () => {
      it('returns a result when provided valid input data.', async () => {
        expect.assertions(1);

        expect(
          await outputModel.execute([
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 15,
              'cpu/utilization': 34,
              'instance-type': 't2.micro',
              country: 'USA',
              provider: 'aws',
            },
          ])
        ).toStrictEqual([
          {
            'carbon-embodied': 1.6,
            energy: 1.6408333333333334,
          },
        ]);
      });

      it('returns an empty array when the input is an empty array.', async () => {
        expect.assertions(1);

        expect(await outputModel.execute([])).toEqual([]);
      });

      it('throws an error when the metric type is missing from the input.', async () => {
        expect.assertions(1);

        try {
          await outputModel.execute([
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 15,
              'instance-type': 't2.micro',
              country: 'USA',
              provider: 'aws',
            },
          ]);
        } catch (error) {
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });
    });
  });
});
