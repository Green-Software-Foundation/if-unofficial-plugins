import {Co2jsModel} from '../../../../lib/co2js';

import {ERRORS} from '../../../../util/errors';

const {InputValidationError} = ERRORS;

describe('lib/co2js: ', () => {
  describe('Co2jsModel: ', () => {
    let outputModel: Co2jsModel;

    beforeEach(() => {
      outputModel = new Co2jsModel();
    });

    describe('init Co2jsModel: ', () => {
      it('initalizes object with properties.', async () => {
        expect(outputModel).toHaveProperty('configure');
        expect(outputModel).toHaveProperty('execute');
      });
    });

    describe('configure(): ', () => {
      it('configures when provided an empty object.', async () => {
        const model = await outputModel.configure({});

        expect.assertions(1);

        expect(model).toBeInstanceOf(Co2jsModel);
      });

      it('configures when `type` has `1byte` value.', async () => {
        const model = await outputModel.configure({type: '1byte'});

        expect.assertions(1);

        expect(model).toBeInstanceOf(Co2jsModel);
      });

      it('configures when `type` has `swd` value.', async () => {
        const model = await outputModel.configure({type: 'swd'});

        expect.assertions(1);

        expect(model).toBeInstanceOf(Co2jsModel);
      });

      it('throws an error when `type` has wrong value.', async () => {
        const errorMessage =
          "\"type\" parameter is invalid enum value. expected '1byte' | 'swd', received 'wrong'. Error code: invalid_enum_value.";

        expect.assertions(2);

        try {
          await outputModel.configure({
            type: 'wrong',
          });
        } catch (error) {
          expect(error).toEqual(new InputValidationError(errorMessage));
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });
    });

    describe('execute(): ', () => {
      it('returns a result when `bytes` is provided in the input.', async () => {
        await outputModel.configure({type: '1byte'});

        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            bytes: 100000,
            'green-web-host': true,
          },
        ];
        const result = await outputModel.execute(inputs);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            bytes: 100000,
            'green-web-host': true,
            'operational-carbon': 0.023195833333333332,
          },
        ]);
      });

      it('returns a result when `green-web-host` is false.', async () => {
        await outputModel.configure({type: '1byte'});

        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            bytes: 100000,
            'green-web-host': false,
          },
        ];
        const result = await outputModel.execute(inputs);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            bytes: 100000,
            'green-web-host': false,
            'operational-carbon': 0.029081299999999994,
          },
        ]);
      });
      it('returns a result when `type` has `swg` value in the config.', async () => {
        await outputModel.configure({type: 'swd'});

        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            bytes: 100000,
            'green-web-host': true,
          },
        ];

        expect.assertions(1);

        const result = await outputModel.execute(inputs);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            bytes: 100000,
            'green-web-host': true,
            'operational-carbon': 0.023208995205000006,
          },
        ]);
      });

      it('returns a result when provided `options` in the input.', async () => {
        await outputModel.configure({type: 'swd'});

        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            bytes: 100000,
            'green-web-host': false,
            options: {
              dataReloadRatio: 0.6,
              firstVisitPercentage: 0.9,
              returnVisitPercentage: 0.1,
              gridIntensity: {
                device: 560.98,
                dataCenter: 50,
                networks: 437.66,
              },
            },
          },
        ];

        const result = await outputModel.execute(inputs);

        expect.assertions(1);

        expect(result).toStrictEqual([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            bytes: 100000,
            'green-web-host': false,
            options: {
              dataReloadRatio: 0.6,
              firstVisitPercentage: 0.9,
              returnVisitPercentage: 0.1,
              gridIntensity: {
                device: 560.98,
                dataCenter: 50,
                networks: 437.66,
              },
            },
            'operational-carbon': 0.034497244224,
          },
        ]);
      });

      it('throws an error `bytes` is not provided.', async () => {
        await outputModel.configure({type: '1byte'});

        const inputs = [
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'green-web-host': true,
          },
        ];

        expect.assertions(2);

        try {
          await outputModel.execute(inputs);
        } catch (error) {
          expect(error).toEqual(
            new InputValidationError('Co2jsModel: Bytes not provided.')
          );
          expect(error).toBeInstanceOf(InputValidationError);
        }
      });
    });
  });
});
