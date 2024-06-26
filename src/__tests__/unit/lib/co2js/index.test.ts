import {Co2js} from '../../../../lib/co2js';

import {ERRORS} from '../../../../util/errors';

const {InputValidationError} = ERRORS;

jest.mock('@tgwf/co2', () => {
  const original = jest.requireActual('@tgwf/co2');

  return {
    __esModule: true,
    co2: jest.fn(() => {
      if (process.env.WRONG_MODEL === 'true') {
        return {perByte: () => undefined};
      } else if (process.env.SWD_TYPE === 'true') {
        return new original.co2({model: 'swd'});
      }
      return new original.co2({model: '1byte'});
    }),
  };
});

describe('lib/co2js: ', () => {
  describe('Co2js: ', () => {
    const output = Co2js();

    beforeEach(() => {
      process.env.WRONG_MODEL = 'false';
      jest.clearAllMocks();
    });

    describe('init Co2js: ', () => {
      it('initalizes object with properties.', async () => {
        expect(output).toHaveProperty('metadata');
        expect(output).toHaveProperty('execute');
      });
    });

    describe('execute(): ', () => {
      it('returns a result when `network/data/bytes` is provided in the input.', async () => {
        const config = {type: '1byte'};
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': true,
          },
        ];
        const result = await output.execute(inputs, config);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': true,
            'carbon-operational': 0.023195833333333332,
          },
        ]);
      });

      it('returns the same input data when the co2 model returns undefined for the `type`.', async () => {
        process.env.WRONG_MODEL = 'true';
        const config = {type: '1byte'};
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': true,
          },
        ];
        const result = await output.execute(inputs, config);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': true,
          },
        ]);
      });

      it('returns a result when `network/data` is provided.', async () => {
        const config = {type: '1byte'};
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data': 10,
            'green-web-host': true,
          },
        ];
        const result = await output.execute(inputs, config);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data': 10,
            'green-web-host': true,
            'carbon-operational': 2319.583333333333,
          },
        ]);
      });

      it('returns a result when `green-web-host` is false.', async () => {
        const config = {type: '1byte'};
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': false,
          },
        ];
        const result = await output.execute(inputs, config);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': false,
            'carbon-operational': 0.029081299999999994,
          },
        ]);
      });

      it('returns a result when `type` has `swg` value in the config.', async () => {
        process.env.SWD_TYPE = 'true';
        const config = {type: 'swd'};
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': true,
          },
        ];

        expect.assertions(1);

        const result = await output.execute(inputs, config);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': true,
            'carbon-operational': 0.023208995205000006,
          },
        ]);
      });

      it('returns a result when `green-web-host` and `options` are provided in input.', async () => {
        process.env.SWD_TYPE = 'true';
        const config = {type: 'swd'};
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': false,
            options: {
              dataReloadRatio: 0.6,
              firstVisitPercentage: 0.9,
              returnVisitPercentage: 0.1,
            },
          },
        ];
        const result = await output.execute(inputs, config);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'carbon-operational': 0.034032441600000005,
            'green-web-host': false,
            options: {
              dataReloadRatio: 0.6,
              firstVisitPercentage: 0.9,
              returnVisitPercentage: 0.1,
            },
          },
        ]);
      });

      it('throws an error when config is mising.', async () => {
        const errorMessage = 'Co2js: Config is not provided.';

        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': true,
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

      it('throws an error when `type` has wrong value.', async () => {
        const errorMessage =
          "\"type\" parameter is invalid enum value. expected '1byte' | 'swd', received 'wrong'. Error code: invalid_enum_value.";

        const config = {type: 'wrong', 'green-web-host': false};
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'network/data/bytes': 100000,
            'green-web-host': true,
          },
        ];

        expect.assertions(2);

        try {
          await output.execute(inputs, config);
        } catch (error) {
          expect(error).toEqual(new InputValidationError(errorMessage));
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });

      it('throws an error `network/data/bytes` is not provided.', async () => {
        const config = {type: '1byte', 'green-web-host': true};
        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'green-web-host': true,
          },
        ];

        expect.assertions(2);

        try {
          await output.execute(inputs, config);
        } catch (error) {
          expect(error).toEqual(
            new InputValidationError(
              'Either `network/data/bytes` or `network/data` should be provided in the input.'
            )
          );
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });
    });
  });
});
