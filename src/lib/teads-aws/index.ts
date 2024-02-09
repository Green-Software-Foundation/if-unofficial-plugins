import Spline from 'typescript-cubic-spline';
import {z} from 'zod';

import {ModelPluginInterface} from '../../interfaces';
import {
  Interpolation,
  KeyValuePair,
  ModelParams,
  ComputeInstance,
} from '../../types/common';

import {buildErrorMessage} from '../../util/helpers';
import {validate} from '../../util/validations';
import {ERRORS} from '../../util/errors';

import * as AWS_INSTANCES from './aws-instances.json';
import * as AWS_EMBODIED from './aws-embodied.json';

const {InputValidationError, UnsupportedValueError} = ERRORS;

export class TeadsAWS implements ModelPluginInterface {
  private computeInstances: Record<string, ComputeInstance> = {};
  private instanceType = '';
  private expectedLifespan = 4 * 365 * 24 * 3600;
  private interpolation = Interpolation.LINEAR;

  errorBuilder = buildErrorMessage(this.constructor.name);

  constructor() {
    this.standardizeInstanceMetrics();
  }

  /**
   * Configures the TEADS Plugin for IEF.
   */
  public async configure(staticParams: object): Promise<TeadsAWS> {
    Object.keys(staticParams).length && this.setValidatedInstance(staticParams);

    return this;
  }

  /**
   * Calculate the total emissions for a list of inputs.
   */
  public async execute(inputs: ModelParams[]): Promise<ModelParams[]> {
    return inputs.map(input => {
      if (this.instanceType === '') {
        this.setValidatedInstance(input);
      }

      input['energy'] = this.calculateEnergy(input);
      input['embodied-carbon'] = this.embodiedEmissions(input);
      return input;
    });
  }

  /**
   * Standardize the instance metrics for all the vendors.
   * Maps the instance metrics to a standard format (min, max, idle, 10%, 50%, 100%) for all the vendors.
   */
  private standardizeInstanceMetrics() {
    AWS_INSTANCES.forEach((instance: KeyValuePair) => {
      const cpus = parseInt(instance['Instance vCPU'], 10);
      const consumption = this.parseConsumptionValues(instance);

      this.computeInstances[instance['Instance type']] = {
        consumption,
        vCPUs: cpus,
        maxvCPUs: parseInt(instance['Platform Total Number of vCPU'], 10),
        name: instance['Instance type'],
      } as ComputeInstance;
    });

    AWS_EMBODIED.forEach((instance: KeyValuePair) => {
      this.computeInstances[instance['type']].embodiedEmission =
        instance['total'];
    });
  }

  /**
   * Calculates the consumption metrics (idle, 10%, 50%, 100%) for a given compute instance.
   */
  private parseConsumptionValues(instance: KeyValuePair) {
    return {
      idle: this.getParsedInstanceMetric(instance['Instance @ Idle']),
      tenPercent: this.getParsedInstanceMetric(instance['Instance @ 10%']),
      fiftyPercent: this.getParsedInstanceMetric(instance['Instance @ 50%']),
      hundredPercent: this.getParsedInstanceMetric(instance['Instance @ 100%']),
    };
  }

  /**
   * Parses a metric value to a floating-point number.
   */
  private getParsedInstanceMetric(metric: string) {
    return parseFloat(metric.replace(',', '.'));
  }

  /**
   * Calculates the energy consumption for a single input
   * Uses a spline method for AWS and linear interpolation for GCP and Azure
   *
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
    if (!('cpu-util' in input)) {
      throw new InputValidationError(
        this.errorBuilder({
          message: "Required parameters 'cpu-util' is not provided",
        })
      );
    }

    const {duration, 'cpu-util': cpu} = input;
    const wattage = this.calculateWattage(cpu);

    return (wattage * duration) / 3600 / 1000;
  }

  private calculateWattage(cpu: number) {
    const consumption = this.computeInstances[this.instanceType].consumption;
    const x = [0, 10, 50, 100]; // Get the wattage for the instance type.
    const y: number[] = [
      consumption.idle,
      consumption.tenPercent,
      consumption.fiftyPercent,
      consumption.hundredPercent,
    ];
    const spline = new Spline(x, y);

    if (this.interpolation === Interpolation.SPLINE) {
      return spline.at(cpu);
    }

    return this.calculateLinearInterpolationWattage(cpu, x, y);
  }

  /**
   * Calculates the linear interpolation wattage.
   */
  private calculateLinearInterpolationWattage(
    cpu: number,
    points: number[],
    curve: number[]
  ): number {
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

    return result.baseRate + (cpu - result.baseCpu) * result.ratio;
  }

  /**
   * Calculates the embodied emissions for a given input.
   *
   *  M = TE * (TR/EL) * (RR/TR)
   *  Where:
   *  TE = Total Embodied Emissions, the sum of Life Cycle Assessment(LCA) emissions for all hardware components
   *  TR = Time Reserved, the length of time the hardware is reserved for use by the software
   *  EL = Expected Lifespan, the anticipated time that the equipment will be installed
   *  RR = Resources Reserved, the number of resources reserved for use by the software.
   *  TR = Total Resources, the total number of resources available.
   */
  private embodiedEmissions(input: ModelParams): number {
    const instance = this.computeInstances[this.instanceType];
    const totalEmissions = instance.embodiedEmission;
    const timeReserved = input['duration'] / 3600;
    const expectedLifespan = this.expectedLifespan / 3600;
    const reservedResources = instance.vCPUs;
    const totalResources = instance.maxvCPUs;

    // Multiply totalEmissions by 1000 to convert from kgCO2e to gCO2e
    return (
      totalEmissions *
      1000 *
      (timeReserved / expectedLifespan) *
      (reservedResources / totalResources)
    );
  }

  /**
   * Validates static parameters.
   */
  private validateParams(staticParams: object) {
    const schema = z
      .object({
        'instance-type': z.string(),
        'expected-lifespan': z.number().optional(),
        interpolation: z.nativeEnum(Interpolation).optional(),
      })
      .refine(param => {
        this.validateInstanceType(param['instance-type']);
        return true;
      });
    return validate(schema, staticParams);
  }

  /**
   * Sets validated parameters for the class instance.
   */
  private setValidatedInstance(params: object) {
    const safeParams = Object.assign(params, this.validateParams(params));

    this.instanceType = safeParams['instance-type'] ?? this.instanceType;
    this.expectedLifespan =
      safeParams['expected-lifespan'] ?? this.expectedLifespan;
    this.interpolation = safeParams.interpolation ?? this.interpolation;
  }

  /**
   * Validates an instance type.
   */
  private validateInstanceType(instanceType: string | undefined) {
    if (
      instanceType !== undefined &&
      (!(instanceType in this.computeInstances) || instanceType === '')
    ) {
      throw new UnsupportedValueError(
        this.errorBuilder({
          message: `Instance type ${instanceType} is not supported`,
          scope: 'configure',
        })
      );
    }
  }
}
