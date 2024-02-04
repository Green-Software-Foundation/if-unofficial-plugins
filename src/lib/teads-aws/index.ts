import Spline from 'typescript-cubic-spline';
import {z} from 'zod';

import {ModelPluginInterface} from '../../interfaces';
import {Interpolation, KeyValuePair, ModelParams} from '../../types/common';
import {IComputeInstance} from '../../types';

import {buildErrorMessage} from '../../util/helpers';
import {validate} from '../../util/validations';
import {ERRORS} from '../../util/errors';

import * as AWS_INSTANCES from './aws-instances.json';
import * as AWS_EMBODIED from './aws-embodied.json';

const {InputValidationError, UnsupportedValueError} = ERRORS;

export class TeadsAWS implements ModelPluginInterface {
  private computeInstances: Record<string, IComputeInstance> = {};
  private instanceType = '';
  private expectedLifespan = 4 * 365 * 24 * 3600;
  private interpolation = Interpolation.LINEAR;

  errorBuilder = buildErrorMessage(this.constructor); //TODO: send the name

  constructor() {
    this.standardizeInstanceMetrics();
  }

  /**
   * Configures the TEADS Plugin for IEF.
   */
  public async configure(staticParams: object): Promise<TeadsAWS> {
    this.setValidatedParams(staticParams);

    return this;
  }

  /**
   * Calculate the total emissions for a list of inputs.
   */
  public async execute(inputs: ModelParams[]): Promise<ModelParams[]> {
    return inputs.map(input => {
      if (this.instanceType === '') {
        this.setValidatedParams(input);
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
      } as IComputeInstance;
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
    x: number[],
    y: number[]
  ) {
    // base rate is from which level of cpu linear interpolation is applied at
    let base_rate = 0;
    let base_cpu = 0;
    let ratio = 0;

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

    return base_rate + (cpu - base_cpu) * ratio;
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
  private validateStaticParams(staticParams: object) {
    const schema = z
      .object({
        'instance-type': z.string().optional(),
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
  private setValidatedParams(params: object) {
    const safeParams = Object.assign(params, this.validateStaticParams(params));

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
