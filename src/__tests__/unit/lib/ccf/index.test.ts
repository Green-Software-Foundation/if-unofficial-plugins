import {CloudCarbonFootprint} from '../../../../lib/ccf/index';
import {Interpolation} from '../../../../types';

import {ERRORS} from '../../../../util/errors';

const {InputValidationError, UnsupportedValueError} = ERRORS;

describe('lib/ccf: ', () => {
  describe('CloudCarbonFootprint: ', () => {
    let outputModel: CloudCarbonFootprint;

    beforeEach(() => {
      jest.clearAllMocks();
      outputModel = new CloudCarbonFootprint();
    });

    describe('init CloudCarbonFootprint: ', () => {
      it('initalizes object with properties.', async () => {
        expect(outputModel).toHaveProperty('configure');
        expect(outputModel).toHaveProperty('execute');
      });
    });

    describe('configure(): ', () => {
      it('configures CloudCarbonFootprint.', async () => {
        const configuredModel = await outputModel.configure({
          vendor: 'aws',
          interpolation: 'spline',
          'instance-type': 't2.micro',
        });

        const configuredModel2 = await outputModel.configure({
          vendor: 'aws',
          interpolation: Interpolation.SPLINE,
          'instance-type': 't2.micro',
        });

        expect.assertions(2);

        expect(configuredModel).toBeInstanceOf(CloudCarbonFootprint);
        expect(configuredModel2).toBeInstanceOf(CloudCarbonFootprint);
      });

      it('configures when `interpolation` is not provided.', async () => {
        const configuredModel = await outputModel.configure({
          vendor: 'aws',
          'instance-type': 't2.micro',
        });

        expect.assertions(1);

        expect(configuredModel).toBeInstanceOf(CloudCarbonFootprint);
      });

      it('throws an error when `instance-type` value is wrong.', async () => {
        const errorMessage =
          'CloudCarbonFootprint: Instance type t5.micro is not supported.';

        expect.assertions(2);

        try {
          await outputModel.configure({
            vendor: 'aws',
            'instance-type': 't5.micro',
          });
        } catch (error) {
          expect(error).toEqual(new UnsupportedValueError(errorMessage));
          expect(error).toBeInstanceOf(UnsupportedValueError);
        }
      });

      it('throws an error when `vendor` value is wrong.', async () => {
        const errorMessage =
          "\"vendor\" parameter is invalid enum value. expected 'aws' | 'gcp' | 'azure', received 'aws2'. Error code: invalid_enum_value.";

        expect.assertions(2);

        try {
          await outputModel.configure({
            vendor: 'aws2',
            'instance-type': 't2.micro',
          });
        } catch (error) {
          expect(error).toEqual(new InputValidationError(errorMessage));
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });

      it('throws an error when `interpolation` value is wrong.', async () => {
        const errorMessage =
          "\"interpolation\" parameter is invalid enum value. expected 'spline' | 'linear', received 'linear2'. Error code: invalid_enum_value.";

        expect.assertions(2);

        try {
          await outputModel.configure({
            vendor: 'aws',
            'instance-type': 'm5n.large',
            interpolation: 'linear2',
          });
        } catch (error) {
          expect(error).toEqual(new InputValidationError(errorMessage));
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });

      it('throws an error when config is empty.', async () => {
        expect.assertions(1);

        try {
          await outputModel.configure({});
        } catch (error) {
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });
    });

    describe('execute(): ', () => {
      describe('init with `aws` vendor.', () => {
        it('executes with valid data, without `interpolation` config.', async () => {
          await outputModel.configure({
            vendor: 'aws',
            'instance-type': 't2.micro',
          });

          const inputs = [
            {duration: 3600, 'cpu-util': 50, timestamp: '2021-01-01T00:00:00Z'},
          ];

          const result = await outputModel.execute(inputs);

          expect.assertions(1);
          expect(result).toStrictEqual([
            {
              duration: 3600,
              'cpu-util': 50,
              timestamp: '2021-01-01T00:00:00Z',
              'embodied-carbon': 0.8784841133942161,
              energy: 0.0023031270462730543,
            },
          ]);
        });

        it('executes with valid data, with `interpolation` config.', async () => {
          await outputModel.configure({
            vendor: 'aws',
            interpolation: 'spline',
            'instance-type': 't2.micro',
          });

          const inputs = [
            {duration: 3600, 'cpu-util': 50, timestamp: '2021-01-01T00:00:00Z'},
          ];

          const result = await outputModel.execute(inputs);

          expect.assertions(1);
          expect(result).toStrictEqual([
            {
              duration: 3600,
              'cpu-util': 50,
              timestamp: '2021-01-01T00:00:00Z',
              'embodied-carbon': 0.8784841133942161,
              energy: 0.004900000000000001,
            },
          ]);
        });

        it('executes with multiple valid data in the input.', async () => {
          await outputModel.configure({
            vendor: 'aws',
            'instance-type': 'm5n.large',
          });
          const inputs = [
            {
              duration: 3600,
              'cpu-util': 10,
              timestamp: '2021-01-01T00:00:00Z',
            },
            {
              duration: 3600,
              'cpu-util': 50,
              timestamp: '2021-01-01T00:00:00Z',
            },
            {
              duration: 3600,
              'cpu-util': 100,
              timestamp: '2021-01-01T00:00:00Z',
            },
          ];
          const result = await outputModel.execute(inputs);

          expect.assertions(1);

          expect(result).toStrictEqual([
            {
              duration: 3600,
              'cpu-util': 10,
              timestamp: '2021-01-01T00:00:00Z',
              energy: 0.0019435697915529846,
              'embodied-carbon': 0.9577090468036529,
            },
            {
              duration: 3600,
              'cpu-util': 50,
              timestamp: '2021-01-01T00:00:00Z',
              energy: 0.0046062540925461085,
              'embodied-carbon': 0.9577090468036529,
            },
            {
              duration: 3600,
              'cpu-util': 100,
              timestamp: '2021-01-01T00:00:00Z',
              energy: 0.007934609468787513,
              'embodied-carbon': 0.9577090468036529,
            },
          ]);
        });
      });

      describe('init with `azure` vedor.', () => {
        it('executes with multiple valid data in the input.', async () => {
          const inputs = [
            {
              duration: 3600,
              'cpu-util': 10,
              timestamp: '2021-01-01T00:00:00Z',
            },
            {
              duration: 3600,
              'cpu-util': 50,
              timestamp: '2021-01-01T00:00:00Z',
            },
            {
              duration: 3600,
              'cpu-util': 100,
              timestamp: '2021-01-01T00:00:00Z',
            },
          ];
          expect.assertions(1);

          await outputModel.configure({
            vendor: 'azure',
            'instance-type': 'D2 v4',
          });

          const result = await outputModel.execute(inputs);

          expect(result).toStrictEqual([
            {
              duration: 3600,
              'cpu-util': 10,
              timestamp: '2021-01-01T00:00:00Z',
              energy: 0.0019435697915529846,
              'embodied-carbon': 0.3195276826484018,
            },
            {
              duration: 3600,
              'cpu-util': 50,
              timestamp: '2021-01-01T00:00:00Z',
              energy: 0.0046062540925461085,
              'embodied-carbon': 0.3195276826484018,
            },
            {
              duration: 3600,
              'cpu-util': 100,
              timestamp: '2021-01-01T00:00:00Z',
              energy: 0.007934609468787513,
              'embodied-carbon': 0.3195276826484018,
            },
          ]);
        });
      });

      describe('init with `gcp` vedor.', () => {
        it('executes with multiple valid data in the input.', async () => {
          const inputs = [
            {
              duration: 3600,
              'cpu-util': 10,
              timestamp: '2021-01-01T00:00:00Z',
            },
            {
              duration: 3600,
              'cpu-util': 50,
              timestamp: '2021-01-01T00:00:00Z',
            },
            {
              duration: 3600,
              'cpu-util': 100,
              timestamp: '2021-01-01T00:00:00Z',
            },
          ];

          await outputModel.configure({
            vendor: 'gcp',
            'instance-type': 'n2-standard-2',
          });

          const result = await outputModel.execute(inputs);

          expect.assertions(1);

          expect(result).toStrictEqual([
            {
              duration: 3600,
              'cpu-util': 10,
              timestamp: '2021-01-01T00:00:00Z',
              energy: 0.0018785992503765141,
              'embodied-carbon': 0.8421000998858448,
            },
            {
              duration: 3600,
              'cpu-util': 50,
              timestamp: '2021-01-01T00:00:00Z',
              energy: 0.004281401386663755,
              'embodied-carbon': 0.8421000998858448,
            },
            {
              duration: 3600,
              'cpu-util': 100,
              timestamp: '2021-01-01T00:00:00Z',
              energy: 0.0072849040570228075,
              'embodied-carbon': 0.8421000998858448,
            },
          ]);
        });
      });
    });
  });
});
