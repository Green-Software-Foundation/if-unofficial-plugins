import Spline from 'typescript-cubic-spline';
import {z} from 'zod';

import {PluginInterface} from '../../interfaces';
import {Interpolation, PluginParams, ConfigParams} from '../../types';

import {buildErrorMessage} from '../../util/helpers';
import {validate} from '../../util/validations';
import {ERRORS} from '../../util/errors';

const {InputValidationError} = ERRORS;

export const TeadsCurve = (globalConfig?: ConfigParams): PluginInterface => {
  const CURVE: number[] = [0.12, 0.32, 0.75, 1.02];
  const POINTS: number[] = [0, 10, 50, 100];
  const errorBuilder = buildErrorMessage(TeadsCurve.name);

  const metadata = {
    kind: 'execute',
  };

  /**
   * Calculate the total emissions for a list of inputs.
   */
  const execute = async (
    inputs: PluginParams[],
    config?: ConfigParams
  ): Promise<PluginParams[]> => {
    const mergedConfig = Object.assign({}, globalConfig, config);
    const validatedConfig = validateConfig(mergedConfig);

    return inputs.map((input, index) => {
      const safeInput = getValidatedInput(input);
      const inputWithConfig: PluginParams = Object.assign(
        {},
        input,
        safeInput,
        validatedConfig
      );
      const energy = calculateEnergyForInput(inputWithConfig, index);

      return {
        ...input,
        'cpu/energy': energy,
      };
    });
  };

  /**
   * Calculates the energy for a given input, taking into account allocation if available.
   */
  const calculateEnergyForInput = (
    input: PluginParams,
    index: number
  ): number => {
    const energyWithoutAllocation = calculateEnergy(input);

    const total = parseNumericField(input, 'vcpus-total', index);
    const allocated = parseNumericField(input, 'vcpus-allocated', index);

    if (allocated !== undefined && total !== undefined && total !== 0) {
      return energyWithoutAllocation * (allocated / total);
    }

    return energyWithoutAllocation;
  };

  /**
   * Calculates the energy consumption for a single input.
   * Uses a spline method on the teads cpu wattage data.
   *
   * duration is in seconds
   * wattage is in watts
   * eg: 30W x 300s = 9000 J
   * 1 Wh = 3600 J
   * 9000 J / 3600 = 2.5 Wh
   * J / 3600 = Wh
   * 2.5 Wh / 1000 = 0.0025 kWh
   * Wh / 1000 = kWh
   * (wattage * duration) / (seconds in an hour) / 1000 = kWh
   */
  const calculateEnergy = (input: PluginParams) => {
    const {duration, 'cpu/utilization': cpu} = input;
    const spline: any = new Spline(POINTS, CURVE);

    const wattage =
      input.interpolation === Interpolation.SPLINE
        ? spline.at(cpu) * input['cpu/thermal-design-power']
        : calculateLinearInterpolationWattage(
            cpu,
            input['cpu/thermal-design-power']
          );

    return (wattage * duration) / 3600 / 1000;
  };

  /**
   * Calculates the linear interpolation wattage.
   *
   * sum of base_rate + (cpu - base_cpu) * ratio = total rate of cpu usage
   * total rate * tdp = wattage
   */
  const calculateLinearInterpolationWattage = (
    cpu: number,
    thermalDesignPower: number
  ) => {
    const result = POINTS.reduce(
      (acc, point, i) => {
        if (cpu === point) {
          acc.baseRate = CURVE[i];
          acc.baseCpu = point;
        } else if (cpu > point && cpu < POINTS[i + 1]) {
          acc.baseRate = CURVE[i];
          acc.baseCpu = point;
          acc.ratio = (CURVE[i + 1] - CURVE[i]) / (POINTS[i + 1] - point);
        }
        return acc;
      },
      {baseRate: 0, baseCpu: 0, ratio: 0}
    );

    return (
      (result.baseRate + (cpu - result.baseCpu) * result.ratio) *
      thermalDesignPower
    );
  };

  /**
   * Parse a numeric field from the input and handle type validation.
   */
  const parseNumericField = (
    input: PluginParams,
    field: string,
    index: number
  ): number | undefined => {
    if (field in input) {
      const fieldValue = input[field];

      switch (typeof fieldValue) {
        case 'string':
          return parseFloat(fieldValue);
        case 'number':
          return fieldValue;
        default:
          throw new InputValidationError(
            errorBuilder({
              message: `Invalid type for '${field}' in input[${index}]`,
            })
          );
      }
    }

    return undefined;
  };

  /**
   * Validates config params.
   */
  const validateConfig = (config: ConfigParams) => {
    const schema = z.object({
      interpolation: z.nativeEnum(Interpolation).optional(),
    });

    //Manually add default value
    config.interpolation = config.interpolation ?? Interpolation.SPLINE;

    return validate<z.infer<typeof schema>>(schema, config);
  };

  /**
   * Validates parameters.
   */
  const validateParams = (params: object) => {
    const schema = z.object({
      'cpu/utilization': z.number().min(0).max(100),
      'cpu/thermal-design-power': z.number().min(1),
    });

    return validate<z.infer<typeof schema>>(schema, params);
  };

  /**
   * Sets validated parameters for the class instance.
   */
  const getValidatedInput = (params: object) => {
    const safeParams = Object.assign({}, params, validateParams(params));

    return {
      'cpu/thermal-design-power': safeParams['cpu/thermal-design-power'] ?? 0,
      'cpu/utilization': safeParams['cpu/utilization'],
    };
  };

  return {
    metadata,
    execute,
  };
};
