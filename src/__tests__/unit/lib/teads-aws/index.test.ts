import {TeadsAWS} from '../../../../lib/teads-aws/index';

import {Interpolation} from '../../../../types/common';

import {ERRORS} from '../../../../util/errors';

const {InputValidationError, UnsupportedValueError} = ERRORS;

describe('lib/teads-aws: ', () => {
  describe('TeadsAWS: ', () => {
    let outputModel: TeadsAWS;

    beforeEach(() => {
      outputModel = new TeadsAWS();
    });

    describe('init TeadsAWS: ', () => {
      it('initalizes object with properties.', () => {
        expect.assertions(6);

        expect(outputModel).toHaveProperty('configure');
        expect(outputModel).toHaveProperty('execute');

        expect(outputModel).toHaveProperty('instanceType');
        expect(outputModel).toHaveProperty('expectedLifespan');
        expect(outputModel).toHaveProperty('interpolation');
        expect(outputModel).toHaveProperty('computeInstances');
      });
    });

    describe('configure(): ', () => {
      it('configures when `interpolation` value is `spline`.', async () => {
        const result = await outputModel.configure({
          'instance-type': 'm5n.large',
          interpolation: Interpolation.SPLINE,
        });

        expect.assertions(1);
        expect(result).toBeInstanceOf(TeadsAWS);
      });

      it('configures when `interpolation` value is `linear`.', async () => {
        const result = await outputModel.configure({
          'instance-type': 'm5n.large',
          interpolation: Interpolation.LINEAR,
        });

        expect.assertions(1);
        expect(result).toBeInstanceOf(TeadsAWS);
      });

      it('configures when the `expected-lifespan` is provided in cofig.', async () => {
        const result = await outputModel.configure({
          'instance-type': 'm5n.large',
          interpolation: Interpolation.LINEAR,
          'expected-lifespan': 8 * 365 * 24 * 3600,
        });

        expect.assertions(1);
        expect(result).toBeInstanceOf(TeadsAWS);
      });

      it('throws an error when `instance-type` is an empty string.', async () => {
        expect.assertions(2);

        try {
          await outputModel.configure({'instance-type': ''});
        } catch (error) {
          expect(error).toEqual(
            new UnsupportedValueError(
              'TeadsAWS(configure): Instance type  is not supported.'
            )
          );
          expect(error).toBeInstanceOf(UnsupportedValueError);
        }
      });

      it('throws an error when the `instance-type` has wrong value.', async () => {
        const errorMessage =
          'TeadsAWS(configure): Instance type t2213 is not supported.';

        expect.assertions(2);

        try {
          await outputModel.configure({'instance-type': 't2213'});
        } catch (error) {
          expect(error).toEqual(new UnsupportedValueError(errorMessage));
          expect(error).toBeInstanceOf(UnsupportedValueError);
        }
      });

      it('throws an error when the `interpolation` has wrong value.', async () => {
        const errorMessage =
          "\"interpolation\" parameter is invalid enum value. expected 'spline' | 'linear', received 'linear1'. Error code: invalid_enum_value.";
        expect.assertions(2);

        try {
          await outputModel.configure({
            'instance-type': 'm5n.large',
            interpolation: 'linear1',
          });
        } catch (error) {
          expect(error).toEqual(new InputValidationError(errorMessage));
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });
    });

    describe('execute(): ', () => {
      it('returns a result when in the config `interpolation` is `spline`.', async () => {
        await outputModel.configure({
          'instance-type': 'm5n.large',
          interpolation: Interpolation.SPLINE,
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
            energy: 0.0067,
            'embodied-carbon': 0.9577090468036529,
          },
          {
            duration: 3600,
            'cpu-util': 50,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.011800000000000001,
            'embodied-carbon': 0.9577090468036529,
          },
          {
            duration: 3600,
            'cpu-util': 100,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.016300000000000002,
            'embodied-carbon': 0.9577090468036529,
          },
        ]);
      });

      it('returns a result when in the config `interpolation` is `linear`.', async () => {
        await outputModel.configure({
          'instance-type': 'm5n.large',
          interpolation: Interpolation.LINEAR,
        });
        const inputs = [
          {
            duration: 3600,
            'cpu-util': 8,
            timestamp: '2021-01-01T00:00:00Z',
          },
          {
            duration: 3600,
            'cpu-util': 15,
            timestamp: '2021-01-01T00:00:00Z',
          },
          {
            duration: 3600,
            'cpu-util': 55,
            timestamp: '2021-01-01T00:00:00Z',
          },
          {
            duration: 3600,
            'cpu-util': 95,
            timestamp: '2021-01-01T00:00:00Z',
          },
        ];
        const result = await outputModel.execute(inputs);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            duration: 3600,
            'cpu-util': 8,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.00618,
            'embodied-carbon': 0.9577090468036529,
          },
          {
            duration: 3600,
            'cpu-util': 15,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.0073375,
            'embodied-carbon': 0.9577090468036529,
          },
          {
            duration: 3600,
            'cpu-util': 55,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.01225,
            'embodied-carbon': 0.9577090468036529,
          },
          {
            duration: 3600,
            'cpu-util': 95,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.015850000000000003,
            'embodied-carbon': 0.9577090468036529,
          },
        ]);
      });

      it('returns a result when in the config `interpolation` is `linear` and provided `expected-lifespan`.', async () => {
        await outputModel.configure({
          'instance-type': 'm5n.large',
          interpolation: Interpolation.LINEAR,
          'expected-lifespan': 8 * 365 * 24 * 3600,
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
            energy: 0.0067,
            'embodied-carbon': 0.47885452340182644,
          },
          {
            duration: 3600,
            'cpu-util': 50,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.011800000000000001,
            'embodied-carbon': 0.47885452340182644,
          },
          {
            duration: 3600,
            'cpu-util': 100,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.016300000000000002,
            'embodied-carbon': 0.47885452340182644,
          },
        ]);
      });

      it('returns a result when the `instance-type` is provided in the input.', async () => {
        await outputModel.configure({});

        expect.assertions(1);

        const result = await outputModel.execute([
          {
            duration: 3600,
            timestamp: '2021-01-01T00:00:00Z',
            'instance-type': 'm5n.large',
            'cpu-util': 10,
          },
        ]);

        expect(result).toStrictEqual([
          {
            duration: 3600,
            'cpu-util': 10,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.0067,
            'embodied-carbon': 0.9577090468036529,
            'instance-type': 'm5n.large',
          },
        ]);
      });

      it('throws an error when `cpu-util` not provided in the input.', async () => {
        await outputModel.configure({
          'instance-type': 'm5n.large',
          interpolation: Interpolation.LINEAR,
          'expected-lifespan': 8 * 365 * 24 * 3600,
        });

        expect.assertions(2);

        try {
          await outputModel.execute([
            {
              duration: 3600,
              timestamp: '2021-01-01T00:00:00Z',
            },
          ]);
        } catch (error) {
          expect(error).toEqual(
            new InputValidationError(
              "TeadsAWS: Required parameters 'cpu-util' is not provided."
            )
          );
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });
    });
  });
});
