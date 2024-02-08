import Spline from 'typescript-cubic-spline';
import {z} from 'zod';

import {ERRORS} from '../../util/errors';
import {buildErrorMessage} from '../../util/helpers';

import {Interpolation, ModelParams} from '../../types';
import {ModelPluginInterface} from '../../interfaces';
import {validate} from '../../util/validations';

const {InputValidationError} = ERRORS;

export class TeadsCurveModel implements ModelPluginInterface {
  private tdp = 0;
  private interpolation: Interpolation = Interpolation.SPLINE;

  errorBuilder = buildErrorMessage(TeadsCurveModel);

  /**
   * Configures the TEADS Plugin for IEF.
   */
  public async configure(staticParams: object): Promise<ModelPluginInterface> {
    Object.keys(staticParams).length && this.setValidatedInstance(staticParams);

    return this;
  }

  /**
   * Calculate the total emissions for a list of inputs.
   */
  public async execute(inputs: ModelParams[]): Promise<ModelParams[]> {
    return inputs.map((input, index) => {
      if (this.tdp === 0) {
        this.setValidatedInstance(input);
      }

      const safeInput = Object.assign(input, this.validateInput(input));
      const total = this.parseNumericField(safeInput, 'vcpus-total', index);
      const allocated = this.parseNumericField(
        safeInput,
        'vcpus-allocated',
        index
      );
      let energy = this.calculateEnergy(safeInput);

      if (allocated !== undefined && total !== undefined && total !== 0) {
        energy = energy * (allocated / total);
      }
      safeInput['energy-cpu'] = energy;

      return safeInput;
    });
  }

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
  private calculateEnergy(input: ModelParams) {
    const {duration, 'cpu-util': cpu} = input;
    const curve: number[] = [0.12, 0.32, 0.75, 1.02];
    const points: number[] = [0, 10, 50, 100];
    const spline: any = new Spline(points, curve);

    const wattage =
      this.interpolation === Interpolation.SPLINE
        ? spline.at(cpu) * this.tdp
        : this.calculateLinearInterpolationWattage(cpu, points, curve);

    return (wattage * duration) / 3600 / 1000;
  }

  /**
   * Calculates the linear interpolation wattage.
   *
   * sum of base_rate + (cpu - base_cpu) * ratio = total rate of cpu usage
   * total rate * tdp = wattage
   */
  private calculateLinearInterpolationWattage(
    cpu: number,
    points: number[],
    curve: number[]
  ) {
    const result = points.reduce(
      (acc, point, i) => {
        if (cpu === point) {
          acc.baseRate = curve[i];
          acc.baseCpu = point;
        } else if (cpu > point && cpu < points[i + 1]) {
          acc.baseRate = curve[i];
          acc.baseCpu = point;
          acc.ratio = (curve[i + 1] - curve[i]) / (points[i + 1] - point);
        }
        return acc;
      },
      {baseRate: 0, baseCpu: 0, ratio: 0}
    );

    return (result.baseRate + (cpu - result.baseCpu) * result.ratio) * this.tdp;
  }

  /**
   * Parse a numeric field from the input and handle type validation.
   */
  private parseNumericField(
    input: ModelParams,
    field: string,
    index: number
  ): number | undefined {
    if (field in input) {
      const fieldValue = input[field];

      switch (typeof fieldValue) {
        case 'string':
          return parseFloat(fieldValue);
        case 'number':
          return fieldValue;
        default:
          throw new InputValidationError(
            this.errorBuilder({
              message: `Invalid type for '${field}' in input[${index}]`,
            })
          );
      }
    }

    return undefined;
  }

  /**
   * Validate input fields.
   */
  private validateInput(input: ModelParams) {
    const schema = z.object({
      'cpu-util': z.number().min(0).max(100),
    });

    return validate<z.infer<typeof schema>>(schema, input);
  }

  /**
   * Validates parameters.
   */
  private validateParams(params: object) {
    const schema = z.object({
      'thermal-design-power': z.number().min(1),
      interpolation: z.nativeEnum(Interpolation).optional(),
    });

    return validate<z.infer<typeof schema>>(schema, params);
  }

  /**
   * Sets validated parameters for the class instance.
   */
  private setValidatedInstance(params: object) {
    const safeParams = Object.assign(params, this.validateParams(params));

    this.tdp = safeParams['thermal-design-power'] ?? this.tdp;
    this.interpolation = safeParams.interpolation ?? this.interpolation;
  }
}
