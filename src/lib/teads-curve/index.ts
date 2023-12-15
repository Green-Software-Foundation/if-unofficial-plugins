import Spline from 'typescript-cubic-spline';

import {ERRORS} from '../../util/errors';
import {buildErrorMessage} from '../../util/helpers';

import {Interpolation, KeyValuePair, ModelParams} from '../../types';
import {ModelPluginInterface} from '../../interfaces';

const {InputValidationError} = ERRORS;

export class TeadsCurveModel implements ModelPluginInterface {
  tdp = 0; // `tdp` of the chip being measured.
  curve: number[] = [0.12, 0.32, 0.75, 1.02]; // Default power curve provided by the Teads Team.
  points: number[] = [0, 10, 50, 100]; // Default percentage points.
  spline: any = new Spline(this.points, this.curve); // Spline interpolation of the power curve.
  interpolation: Interpolation = Interpolation.SPLINE; // Interpolation method.
  errorBuilder = buildErrorMessage(TeadsCurveModel);

  /**
   * Configures the TEADS Plugin for IEF
   * @param {string} name name of the resource
   * @param {Object} staticParams static parameters for the resource
   * @param {number} staticParams.tdp Thermal Design Power in Watts
   * @param {Interpolation} staticParams.interpolation Interpolation method
   */
  async configure(
    staticParams: object | undefined = undefined
  ): Promise<ModelPluginInterface> {
    if (staticParams === undefined) {
      throw new InputValidationError(
        this.errorBuilder({message: 'Input data is missing'})
      );
    }

    if ('thermal-design-power' in staticParams) {
      this.tdp = staticParams['thermal-design-power'] as number;
    }

    if ('interpolation' in staticParams) {
      this.interpolation = staticParams?.interpolation as Interpolation;
    }

    return this;
  }

  /**
   * Calculate the total emissions for a list of inputs
   *
   * Each input require:
   * @param {Object[]} inputs
   * @param {string} inputs[].timestamp RFC3339 timestamp string
   * @param {number} inputs[].duration input duration in seconds
   * @param {number} inputs[].cpu-util percentage cpu usage
   */
  async execute(inputs: ModelParams[]): Promise<ModelParams[]> {
    return inputs.map((input, index) => {
      console.log(input);
      this.configure(input);
      let energy = this.calculateEnergy(input);
      let total: number;
      let allocated: number;

      if ('vcpus-allocated' in input && 'vcpus-total' in input) {
        switch (typeof input['vpus-allocated']) {
          case 'string':
            allocated = parseFloat(input['vcpus-allocated']);
            break;
          case 'number':
            allocated = input['vcpus-allocated'];
            break;
          default:
            throw new InputValidationError(
              this.errorBuilder({
                message: `Invalid type for 'vcpus-allocated' in input[${index}]`,
              })
            );
        }
        switch (typeof input['vcpus-total']) {
          case 'string':
            total = parseFloat(input['vcpus-total']);
            break;
          case 'number':
            total = input['vcpus-total'];
            break;
          default:
            throw new InputValidationError(
              this.errorBuilder({
                message: `Invalid type for 'vcpus-total' in input[${index}]`,
              })
            );
        }
        energy = energy * (allocated / total);
      }
      input['energy-cpu'] = energy;

      return input;
    });
  }

  /**
   * Calculates the energy consumption for a single input
   * requires
   *
   * duration: duration of the input in seconds
   * cpu-util: cpu usage in percentage
   * timestamp: RFC3339 timestamp string
   *
   * Uses a spline method on the teads cpu wattage data
   */
  private calculateEnergy(input: KeyValuePair) {
    if (
      !('duration' in input) ||
      !('cpu-util' in input) ||
      !('timestamp' in input)
    ) {
      throw new InputValidationError(
        this.errorBuilder({
          message:
            'Required parameters \'duration\', \'cpu\', \'timestamp\' are not provided',
        })
      );
    }

    const duration = input['duration']; // duration is in seconds
    const cpu = input['cpu-util']; // convert cpu usage to percentage

    if (cpu < 0 || cpu > 100) {
      throw new InputValidationError(
        this.errorBuilder({
          message:
            'Invalid value for \'mem-util\'. Must be between \'0\' and \'100\'',
        })
      );
    }

    let tdp = this.tdp;

    if ('thermal-design-power' in input) {
      tdp = input['thermal-design-power'] as number;
    }
    if (tdp === 0) {
      throw new InputValidationError(
        this.errorBuilder({
          message:
            '\'thermal-design-power\' not provided. Can not compute energy.',
        })
      );
    }

    let wattage = 0.0;
    if (this.interpolation === Interpolation.SPLINE) {
      wattage = this.spline.at(cpu) * tdp;
    } else if (this.interpolation === Interpolation.LINEAR) {
      const x = this.points;
      const y = this.curve;
      // base rate is from which level of cpu linear interpolation is applied at
      let base_rate = 0;
      let base_cpu = 0;
      let ratio = 0;
      // find the base rate and ratio
      for (let i = 0; i < x.length; i++) {
        if (cpu === x[i]) {
          base_rate = y[i];
          base_cpu = x[i];
          break;
        } else if (cpu > x[i] && cpu < x[i + 1]) {
          base_rate = y[i];
          base_cpu = x[i];
          ratio = (y[i + 1] - y[i]) / (x[i + 1] - x[i]);
          break;
        }
      }
      // sum of base_rate + (cpu - base_cpu) * ratio = total rate of cpu usage
      // total rate * tdp = wattage
      wattage = (base_rate + (cpu - base_cpu) * ratio) * tdp;
    }
    //  duration is in seconds
    //  wattage is in watts
    //  eg: 30W x 300s = 9000 J
    //  1 Wh = 3600 J
    //  9000 J / 3600 = 2.5 Wh
    //  J / 3600 = Wh
    //  2.5 Wh / 1000 = 0.0025 kWh
    //  Wh / 1000 = kWh
    // (wattage * duration) / (seconds in an hour) / 1000 = kWh
    return (wattage * duration) / 3600 / 1000;
  }
}
