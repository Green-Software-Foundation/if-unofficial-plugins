import Spline from 'typescript-cubic-spline';
import {z} from 'zod';

import {PluginInterface} from '../../interfaces';
import {
  Interpolation,
  KeyValuePair,
  PluginParams,
  ComputeInstance,
  ConfigParams,
} from '../../types/common';

import {buildErrorMessage} from '../../util/helpers';
import {validate} from '../../util/validations';
import {ERRORS} from '../../util/errors';

import * as AWS_INSTANCES from './aws-instances.json';
import * as AWS_EMBODIED from './aws-embodied.json';

const {InputValidationError, UnsupportedValueError} = ERRORS;

/**
 * @deprecated This plugin will be removed.
 */
export const TeadsAWS = (globalConfig: ConfigParams): PluginInterface => {
  const metadata = {kind: 'execute'};
  const computeInstances: Record<string, ComputeInstance> = {};
  const expectedLifespan = 4 * 365 * 24 * 3600;
  const interpolation = globalConfig.interpolation || Interpolation.LINEAR;

  const errorBuilder = buildErrorMessage(TeadsAWS.name);

  /**
   * Calculate the total emissions for a list of inputs.
   */
  const execute = async (inputs: PluginParams[]) => {
    standardizeInstanceMetrics();

    return inputs.map(input => {
      const safeInput = Object.assign({}, input, validateInput(input));

      const instanceType = safeInput['cloud/instance-type'];
      const validExpectedLifespan =
        input['cpu/expected-lifespan'] ?? expectedLifespan;

      return {
        ...input,
        energy: calculateEnergy(safeInput, instanceType),
        'carbon-embodied': embodiedEmissions(
          safeInput,
          instanceType,
          validExpectedLifespan
        ),
      };
    });
  };

  /**
   * Standardize the instance metrics for all the vendors.
   * Maps the instance metrics to a standard format (min, max, idle, 10%, 50%, 100%) for all the vendors.
   */
  const standardizeInstanceMetrics = () => {
    AWS_INSTANCES.forEach((instance: KeyValuePair) => {
      const cpus = parseInt(instance['Instance vCPU'], 10);
      const consumption = parseConsumptionValues(instance);

      computeInstances[instance['Instance type']] = {
        consumption,
        vCPUs: cpus,
        maxvCPUs: parseInt(instance['Platform Total Number of vCPU'], 10),
        name: instance['Instance type'],
      } as ComputeInstance;
    });

    AWS_EMBODIED.forEach((instance: KeyValuePair) => {
      computeInstances[instance['type']].embodiedEmission = instance['total'];
    });
  };

  /**
   * Calculates the consumption metrics (idle, 10%, 50%, 100%) for a given compute instance.
   */
  const parseConsumptionValues = (instance: KeyValuePair) => {
    return {
      idle: getParsedInstanceMetric(instance['Instance @ Idle']),
      tenPercent: getParsedInstanceMetric(instance['Instance @ 10%']),
      fiftyPercent: getParsedInstanceMetric(instance['Instance @ 50%']),
      hundredPercent: getParsedInstanceMetric(instance['Instance @ 100%']),
    };
  };

  /**
   * Parses a metric value to a floating-point number.
   */
  const getParsedInstanceMetric = (metric: string) => {
    return parseFloat(metric.replace(',', '.'));
  };

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
  const calculateEnergy = (input: PluginParams, instanceType: string) => {
    if (!('cpu/utilization' in input)) {
      throw new InputValidationError(
        errorBuilder({
          message: "Required parameters 'cpu/utilization' is not provided",
        })
      );
    }

    const {duration, 'cpu/utilization': cpu} = input;
    const wattage = calculateWattage(cpu, instanceType);

    return (wattage * duration) / 3600 / 1000;
  };

  const calculateWattage = (cpu: number, instanceType: string) => {
    const consumption = computeInstances[instanceType].consumption;
    const x = [0, 10, 50, 100]; // Get the wattage for the instance type.
    const y: number[] = [
      consumption.idle,
      consumption.tenPercent,
      consumption.fiftyPercent,
      consumption.hundredPercent,
    ];
    const spline = new Spline(x, y);

    if (interpolation === Interpolation.SPLINE) {
      return spline.at(cpu);
    }

    return calculateLinearInterpolationWattage(cpu, x, y);
  };

  /**
   * Calculates the linear interpolation wattage.
   */
  const calculateLinearInterpolationWattage = (
    cpu: number,
    points: number[],
    curve: number[]
  ): number => {
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
  };

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
  const embodiedEmissions = (
    input: PluginParams,
    instanceType: string,
    expectedLifespan: number
  ): number => {
    const instance = computeInstances[instanceType];
    const totalEmissions = instance.embodiedEmission;
    const timeReserved = input['duration'] / 3600;
    const expectedLifespanInSeconds = expectedLifespan / 3600;
    const reservedResources = instance.vCPUs;
    const totalResources = instance.maxvCPUs;

    // Multiply totalEmissions by 1000 to convert from kgCO2e to gCO2e
    return (
      totalEmissions *
      1000 *
      (timeReserved / expectedLifespanInSeconds) *
      (reservedResources / totalResources)
    );
  };

  /**
   * Validates static parameters.
   */
  const validateInput = (input: PluginParams) => {
    const schema = z
      .object({
        'cloud/instance-type': z.string(),
        'cpu/expected-lifespan': z.number().optional(),
      })
      .refine(param => {
        validateInstanceType(param['cloud/instance-type']);
        return true;
      });

    return validate(schema, input);
  };

  /**
   * Validates an instance type.
   */
  const validateInstanceType = (instanceType: string | undefined) => {
    if (
      instanceType !== undefined &&
      (!(instanceType in computeInstances) || instanceType === '')
    ) {
      throw new UnsupportedValueError(
        errorBuilder({
          message: `Instance type ${instanceType} is not supported`,
        })
      );
    }
  };

  return {
    metadata,
    execute,
  };
};
