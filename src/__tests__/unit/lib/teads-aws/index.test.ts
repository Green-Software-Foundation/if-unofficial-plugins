import {TeadsAWS} from '../../../../lib/teads-aws/index';

import {Interpolation} from '../../../../types/common';

import {ERRORS} from '../../../../util/errors';

const {InputValidationError} = ERRORS;

describe('lib/teads-aws: ', () => {
  describe('TeadsAWS: ', () => {
    const output = TeadsAWS({});

    describe('init TeadsAWS: ', () => {
      it('initalizes object with properties.', () => {
        expect.assertions(2);

        expect(output).toHaveProperty('metadata');
        expect(output).toHaveProperty('execute');
      });
    });

    describe('execute(): ', () => {
      it('returns a result when in the config `interpolation` is `spline`.', async () => {
        const output = TeadsAWS({
          interpolation: Interpolation.SPLINE,
        });

        const inputs = [
          {
            duration: 3600,
            'cpu/utilization': 10,
            timestamp: '2021-01-01T00:00:00Z',
            'cloud/instance-type': 'm5n.large',
          },
          {
            duration: 3600,
            'cpu/utilization': 50,
            timestamp: '2021-01-01T00:00:00Z',
            'cloud/instance-type': 'm5n.large',
          },
          {
            duration: 3600,
            'cpu/utilization': 100,
            timestamp: '2021-01-01T00:00:00Z',
            'cloud/instance-type': 'm5n.large',
          },
        ];

        const result = await output.execute(inputs);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            duration: 3600,
            'cpu/utilization': 10,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.0067,
            'carbon-embodied': 0.9577090468036529,
            'cloud/instance-type': 'm5n.large',
          },
          {
            duration: 3600,
            'cpu/utilization': 50,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.011800000000000001,
            'carbon-embodied': 0.9577090468036529,
            'cloud/instance-type': 'm5n.large',
          },
          {
            duration: 3600,
            'cpu/utilization': 100,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.016300000000000002,
            'carbon-embodied': 0.9577090468036529,
            'cloud/instance-type': 'm5n.large',
          },
        ]);
      });

      it('returns a result when in the config `interpolation` is `linear`.', async () => {
        const output = TeadsAWS({
          interpolation: Interpolation.LINEAR,
        });
        const inputs = [
          {
            duration: 3600,
            'cpu/utilization': 8,
            timestamp: '2021-01-01T00:00:00Z',
            'cloud/instance-type': 'm5n.large',
          },
          {
            duration: 3600,
            'cpu/utilization': 15,
            timestamp: '2021-01-01T00:00:00Z',
            'cloud/instance-type': 'm5n.large',
          },
          {
            duration: 3600,
            'cpu/utilization': 55,
            timestamp: '2021-01-01T00:00:00Z',
            'cloud/instance-type': 'm5n.large',
          },
          {
            duration: 3600,
            'cpu/utilization': 95,
            timestamp: '2021-01-01T00:00:00Z',
            'cloud/instance-type': 'm5n.large',
          },
        ];
        const result = await output.execute(inputs);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            duration: 3600,
            'cpu/utilization': 8,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.00618,
            'carbon-embodied': 0.9577090468036529,
            'cloud/instance-type': 'm5n.large',
          },
          {
            duration: 3600,
            'cpu/utilization': 15,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.0073375,
            'carbon-embodied': 0.9577090468036529,
            'cloud/instance-type': 'm5n.large',
          },
          {
            duration: 3600,
            'cpu/utilization': 55,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.01225,
            'carbon-embodied': 0.9577090468036529,
            'cloud/instance-type': 'm5n.large',
          },
          {
            duration: 3600,
            'cpu/utilization': 95,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.015850000000000003,
            'carbon-embodied': 0.9577090468036529,
            'cloud/instance-type': 'm5n.large',
          },
        ]);
      });

      it('returns a result when in the config `interpolation` is `linear` and provided `cpu/expected-lifespan`.', async () => {
        const output = TeadsAWS({
          interpolation: Interpolation.LINEAR,
        });
        const inputs = [
          {
            duration: 3600,
            'cpu/utilization': 10,
            timestamp: '2021-01-01T00:00:00Z',
            'cloud/instance-type': 'm5n.large',
            'cpu/expected-lifespan': 8 * 365 * 24 * 3600,
          },
          {
            duration: 3600,
            'cpu/utilization': 50,
            timestamp: '2021-01-01T00:00:00Z',
            'cloud/instance-type': 'm5n.large',
            'cpu/expected-lifespan': 8 * 365 * 24 * 3600,
          },
          {
            duration: 3600,
            'cpu/utilization': 100,
            timestamp: '2021-01-01T00:00:00Z',
            'cloud/instance-type': 'm5n.large',
            'cpu/expected-lifespan': 8 * 365 * 24 * 3600,
          },
        ];
        const result = await output.execute(inputs);

        expect.assertions(1);
        expect(result).toStrictEqual([
          {
            duration: 3600,
            'cpu/utilization': 10,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.0067,
            'carbon-embodied': 0.47885452340182644,
            'cloud/instance-type': 'm5n.large',
            'cpu/expected-lifespan': 8 * 365 * 24 * 3600,
          },
          {
            duration: 3600,
            'cpu/utilization': 50,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.011800000000000001,
            'carbon-embodied': 0.47885452340182644,
            'cloud/instance-type': 'm5n.large',
            'cpu/expected-lifespan': 8 * 365 * 24 * 3600,
          },
          {
            duration: 3600,
            'cpu/utilization': 100,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.016300000000000002,
            'carbon-embodied': 0.47885452340182644,
            'cloud/instance-type': 'm5n.large',
            'cpu/expected-lifespan': 8 * 365 * 24 * 3600,
          },
        ]);
      });

      it('returns a result when the `cloud/instance-type` is provided in the input.', async () => {
        const output = TeadsAWS({});

        expect.assertions(1);

        const result = await output.execute([
          {
            duration: 3600,
            timestamp: '2021-01-01T00:00:00Z',
            'cloud/instance-type': 'm5n.large',
            'cpu/utilization': 10,
          },
        ]);

        expect(result).toStrictEqual([
          {
            duration: 3600,
            'cpu/utilization': 10,
            timestamp: '2021-01-01T00:00:00Z',
            energy: 0.0067,
            'carbon-embodied': 0.9577090468036529,
            'cloud/instance-type': 'm5n.large',
          },
        ]);
      });

      it('throws an error when `cpu/utilization` not provided in the input.', async () => {
        const output = TeadsAWS({
          interpolation: Interpolation.LINEAR,
        });

        expect.assertions(2);

        try {
          await output.execute([
            {
              duration: 3600,
              timestamp: '2021-01-01T00:00:00Z',
              'cloud/instance-type': 'm5n.large',
              'cpu/expected-lifespan': 8 * 365 * 24 * 3600,
            },
          ]);
        } catch (error) {
          expect(error).toEqual(
            new InputValidationError(
              "TeadsAWS: Required parameters 'cpu/utilization' is not provided."
            )
          );
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });
    });
  });
});
