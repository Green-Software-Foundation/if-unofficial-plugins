import {CloudCarbonFootprint} from '../../../../lib/ccf/index';

import {ERRORS} from '../../../../util/errors';

const {InputValidationError, UnsupportedValueError} = ERRORS;

describe('lib/ccf: ', () => {
  describe('CloudCarbonFootprint: ', () => {
    const output = CloudCarbonFootprint();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('init CloudCarbonFootprint: ', () => {
      it('initalizes object with properties.', async () => {
        expect(output).toHaveProperty('metadata');
        expect(output).toHaveProperty('execute');
      });
    });

    describe('execute(): ', () => {
      describe('init with `aws` value of `cloud/vendor`.', () => {
        it('executes with valid data, without `interpolation` config.', async () => {
          const inputs = [
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 50,
              'cloud/vendor': 'aws',
              'cloud/instance-type': 't2.micro',
            },
          ];

          const result = await output.execute(inputs);

          expect.assertions(1);
          expect(result).toStrictEqual([
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 50,
              'cloud/vendor': 'aws',
              'cloud/instance-type': 't2.micro',
              'carbon-embodied': 0.8784841133942161,
              energy: 0.0023031270462730543,
            },
          ]);
        });

        it('executes with valid data, with `interpolation` config.', async () => {
          const output = CloudCarbonFootprint({interpolation: 'spline'});

          const inputs = [
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 50,
              'cloud/vendor': 'aws',
              'cloud/instance-type': 't2.micro',
            },
          ];

          const result = await output.execute(inputs);

          expect.assertions(1);
          expect(result).toStrictEqual([
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 50,
              'cloud/vendor': 'aws',
              'cloud/instance-type': 't2.micro',
              'carbon-embodied': 0.8784841133942161,
              energy: 0.004900000000000001,
            },
          ]);
        });

        it('executes with multiple valid data in the input.', async () => {
          const inputs = [
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 10,
              'cloud/vendor': 'aws',
              'cloud/instance-type': 'm5n.large',
            },
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 50,
              'cloud/vendor': 'aws',
              'cloud/instance-type': 'm5n.large',
            },
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 100,
              'cloud/vendor': 'aws',
              'cloud/instance-type': 'm5n.large',
            },
          ];
          const result = await output.execute(inputs);

          expect.assertions(1);

          expect(result).toStrictEqual([
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 10,
              'cloud/vendor': 'aws',
              'cloud/instance-type': 'm5n.large',
              energy: 0.0019435697915529846,
              'carbon-embodied': 0.9577090468036529,
            },
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 50,
              'cloud/vendor': 'aws',
              'cloud/instance-type': 'm5n.large',
              energy: 0.0046062540925461085,
              'carbon-embodied': 0.9577090468036529,
            },
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 100,
              'cloud/vendor': 'aws',
              'cloud/instance-type': 'm5n.large',
              energy: 0.007934609468787513,
              'carbon-embodied': 0.9577090468036529,
            },
          ]);
        });

        it('throws an error when `interpolation` persists in the config but the vendor is not `aws`.', async () => {
          const output = CloudCarbonFootprint({interpolation: 'spline'});

          const inputs = [
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 10,
              'cloud/vendor': 'azure',
              'cloud/instance-type': 'D2 v4',
            },
          ];

          try {
            await output.execute(inputs);
          } catch (error) {
            expect(error).toBeInstanceOf(UnsupportedValueError);
            expect(error).toEqual(
              new UnsupportedValueError(
                'CloudCarbonFootprint: Interpolation spline method is not supported.'
              )
            );
          }
        });
      });

      describe('init with `azure` value of `cloud/vendor`.', () => {
        it('executes with multiple valid data in the input.', async () => {
          const inputs = [
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 10,
              'cloud/vendor': 'azure',
              'cloud/instance-type': 'D2 v4',
            },
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 50,
              'cloud/vendor': 'azure',
              'cloud/instance-type': 'D2 v4',
            },
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 100,
              'cloud/vendor': 'azure',
              'cloud/instance-type': 'D2 v4',
            },
          ];
          expect.assertions(1);

          const result = await output.execute(inputs);

          expect(result).toStrictEqual([
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 10,
              'cloud/vendor': 'azure',
              'cloud/instance-type': 'D2 v4',
              energy: 0.0019435697915529846,
              'carbon-embodied': 0.3195276826484018,
            },
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 50,
              'cloud/vendor': 'azure',
              'cloud/instance-type': 'D2 v4',
              energy: 0.0046062540925461085,
              'carbon-embodied': 0.3195276826484018,
            },
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 100,
              'cloud/vendor': 'azure',
              'cloud/instance-type': 'D2 v4',
              energy: 0.007934609468787513,
              'carbon-embodied': 0.3195276826484018,
            },
          ]);
        });
      });

      describe('init with `gcp` value of `cloud/vendor`.', () => {
        it('executes with multiple valid data in the input.', async () => {
          const inputs = [
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 10,
              'cloud/vendor': 'gcp',
              'cloud/instance-type': 'n2-standard-2',
            },
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 50,
              'cloud/vendor': 'gcp',
              'cloud/instance-type': 'n2-standard-2',
            },
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 100,
              'cloud/vendor': 'gcp',
              'cloud/instance-type': 'n2-standard-2',
            },
          ];

          const result = await output.execute(inputs);

          expect.assertions(1);

          expect(result).toStrictEqual([
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 10,
              'cloud/vendor': 'gcp',
              'cloud/instance-type': 'n2-standard-2',
              energy: 0.0018785992503765141,
              'carbon-embodied': 0.8421000998858448,
            },
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 50,
              'cloud/vendor': 'gcp',
              'cloud/instance-type': 'n2-standard-2',
              energy: 0.004281401386663755,
              'carbon-embodied': 0.8421000998858448,
            },
            {
              timestamp: '2021-01-01T00:00:00Z',
              duration: 3600,
              'cpu/utilization': 100,
              'cloud/vendor': 'gcp',
              'cloud/instance-type': 'n2-standard-2',
              energy: 0.0072849040570228075,
              'carbon-embodied': 0.8421000998858448,
            },
          ]);
        });
      });
    });

    it('throws an error when `cloud/instance-type` value is wrong.', async () => {
      const errorMessage =
        'CloudCarbonFootprint: Instance type t5.micro is not supported.';

      expect.assertions(2);

      const inputs = [
        {
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
          'cpu/utilization': 10,
          'cloud/vendor': 'aws',
          'cloud/instance-type': 't5.micro',
        },
      ];

      try {
        await output.execute(inputs);
      } catch (error) {
        expect(error).toEqual(new UnsupportedValueError(errorMessage));
        expect(error).toBeInstanceOf(UnsupportedValueError);
      }
    });

    it('throws an error when `cloud/vendor` value is wrong.', async () => {
      const errorMessage =
        "\"cloud/vendor\" parameter is invalid enum value. expected 'aws' | 'gcp' | 'azure', received 'aws2'. Error code: invalid_enum_value.";

      const inputs = [
        {
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
          'cpu/utilization': 10,
          'cloud/vendor': 'aws2',
          'cloud/instance-type': 't2.micro',
        },
      ];
      expect.assertions(2);

      try {
        await output.execute(inputs);
      } catch (error) {
        expect(error).toEqual(new InputValidationError(errorMessage));
        expect(error).toBeInstanceOf(InputValidationError);
      }
    });

    it('throws an error when `interpolation` value is wrong.', async () => {
      const errorMessage =
        "\"interpolation\" parameter is invalid enum value. expected 'spline' | 'linear', received 'linear2'. Error code: invalid_enum_value.";

      const output = CloudCarbonFootprint({interpolation: 'linear2'});

      expect.assertions(2);
      const inputs = [
        {
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
          'cpu/utilization': 10,
          'cloud/vendor': 'aws',
          'cloud/instance-type': 'm5n.large',
        },
      ];
      expect.assertions(2);

      try {
        await output.execute(inputs);
      } catch (error) {
        expect(error).toEqual(new InputValidationError(errorMessage));
        expect(error).toBeInstanceOf(InputValidationError);
      }
    });
  });
});
