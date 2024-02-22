import {co2} from '@tgwf/co2';
import {z} from 'zod';

import {PluginInterface} from '../../interfaces';
import {ConfigParams, PluginParams} from '../../types';

import {allDefined, validate} from '../../util/validations';
import {buildErrorMessage} from '../../util/helpers';
import {ERRORS} from '../../util/errors';

const {InputValidationError} = ERRORS;

export const Co2js = (globalConfig?: ConfigParams): PluginInterface => {
  const metadata = {kind: 'execute'};
  const errorBuilder = buildErrorMessage(Co2js.name);

  /**
   * Executes the model for a list of input parameters.
   */
  const execute = async (
    inputs: PluginParams[],
    config?: ConfigParams
  ): Promise<PluginParams[]> => {
    const mergedConfig = Object.assign({}, config, globalConfig);

    validateConfig(mergedConfig);

    const model = new co2({model: mergedConfig.type});

    return inputs.map(input => {
      const mergedWithConfig = Object.assign({}, input, mergedConfig);

      if (!(input['network/data/bytes'] || input['network/data'])) {
        throw new InputValidationError(
          errorBuilder({
            message: 'Bytes not provided',
          })
        );
      }

      const result = calculateResultByParams(mergedWithConfig, model);

      if (result) {
        return {
          ...input,
          'carbon-operational': result,
        };
      }

      return result
        ? {
            ...input,
            'carbon-operational': result,
          }
        : input;
    });
  };

  /**
   * Calculates a result based on the provided static parameters type.
   */
  const calculateResultByParams = (
    inputWithConfig: PluginParams,
    model: any
  ) => {
    const greenhosting = inputWithConfig['green-web-host'] === true;
    const options = inputWithConfig['options'];
    const GBinBytes = inputWithConfig['network/data'] * 1000 * 1000 * 1000;
    const bytes = inputWithConfig['network/data/bytes'] || GBinBytes;

    const paramType: {[key: string]: () => string} = {
      swd: () => {
        return options
          ? model.perVisitTrace(bytes, greenhosting, options).co2
          : model.perVisit(bytes, greenhosting);
      },
      '1byte': () => {
        return model.perByte(bytes, greenhosting);
      },
    };

    return paramType[inputWithConfig.type]();
  };

  /**
   * Validates static parameters.
   */
  const validateConfig = (config: ConfigParams) => {
    const schema = z
      .object({
        type: z.enum(['1byte', 'swd']),
        'green-web-host': z.boolean(),
        options: z
          .object({
            dataReloadRatio: z.number().min(0).max(1).optional(),
            firstVisitPercentage: z.number().min(0).max(1).optional(),
            returnVisitPercentage: z.number().min(0).max(1).optional(),
            gridIntensity: z.object({}).optional(),
          })
          .optional(),
      })
      .refine(allDefined);

    return validate<z.infer<typeof schema>>(schema, config);
  };

  return {
    metadata,
    execute,
  };
};
