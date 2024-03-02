import {INSTANCE_TYPE_COMPUTE_PROCESSOR_MAPPING} from '@cloud-carbon-footprint/aws/dist/lib/AWSInstanceTypes';

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

import {validate} from '../../util/validations';
import {buildErrorMessage} from '../../util/helpers';
import {ERRORS} from '../../util/errors';

import * as AWS_INSTANCES from './aws-instances.json';
import * as GCP_INSTANCES from './gcp-instances.json';
import * as AZURE_INSTANCES from './azure-instances.json';
import * as GCP_USE from './gcp-use.json';
import * as AWS_USE from './aws-use.json';
import * as AZURE_USE from './azure-use.json';
import * as GCP_EMBODIED from './gcp-embodied.json';
import * as AWS_EMBODIED from './aws-embodied.json';
import * as AZURE_EMBODIED from './azure-embodied.json';

const {UnsupportedValueError} = ERRORS;

export const CloudCarbonFootprint = (
  globalConfig?: ConfigParams
): PluginInterface => {
  const metadata = {kind: 'execute'};
  const computeInstances: Record<string, Record<string, ComputeInstance>> = {};

  const instanceUsage: KeyValuePair = {
    gcp: {},
    aws: {},
    azure: {},
  };
  const SUPPORTED_VENDORS = ['aws', 'gcp', 'azure'] as const;
  const deafultExpectedLifespan = 4;
  const errorBuilder = buildErrorMessage(CloudCarbonFootprint.name);

  /**
   * Calculate the total emissions for inputs.
   */
  const execute = async (inputs: PluginParams[]) => {
    standardizeInstanceMetrics();

    return inputs.map(input => {
      const mergedWithConfig = Object.assign({}, input, globalConfig);
      const validatedInputWithConfig = Object.assign(
        {},
        {interpolation: mergedWithConfig.interpolation || Interpolation.LINEAR},
        validateInputWithConfig(mergedWithConfig)
      );

      return {
        ...input,
        energy: calculateEnergy(validatedInputWithConfig),
        'carbon-embodied': embodiedEmissions(validatedInputWithConfig),
      };
    });
  };

  /**
   * Validates the interpolation method for AWS cloud/vendor.
   */
  const validateInterpolationForAws = (
    interpolation: Interpolation | undefined,
    cloudVendor: string
  ) => {
    if (interpolation && cloudVendor !== 'aws') {
      throw new UnsupportedValueError(
        errorBuilder({
          message: `Interpolation ${interpolation} method is not supported`,
        })
      );
    }

    return true;
  };

  /**
   * Validates the instance type for a specified cloud/vendor.
   */
  const validateInstanceTypeForVendor = (
    instanceType: string,
    cloudVendor: string
  ) => {
    if (!(instanceType in computeInstances[cloudVendor])) {
      throw new UnsupportedValueError(
        errorBuilder({
          message: `Instance type ${instanceType} is not supported`,
        })
      );
    }
    return true;
  };

  /**
   * Validates single input fields.
   */
  const validateInputWithConfig = (params: PluginParams) => {
    const errorMessageForVendor = `Only ${SUPPORTED_VENDORS} is currently supported`;
    const errorMessageForInterpolation = `Only ${Interpolation} is currently supported`;

    const schema = z
      .object({
        duration: z.number(),
        'cpu/utilization': z.number(),
        'cloud/instance-type': z.string(),
        'cloud/vendor': z.enum(SUPPORTED_VENDORS, {
          required_error: errorMessageForVendor,
        }),
        'cpu/expected-lifespan': z.number().optional(),
        interpolation: z
          .nativeEnum(Interpolation, {
            required_error: errorMessageForInterpolation,
          })
          .optional(),
      })
      .refine(
        param => {
          validateInterpolationForAws(
            param.interpolation,
            param['cloud/vendor']
          );
          validateInstanceTypeForVendor(
            param['cloud/instance-type'],
            param['cloud/vendor']
          );

          return true;
        },
        {
          message:
            '`duration`, `cpu/utilization`, `cloud/instance-type`, and `cloud/vendor` should be present in the input',
        }
      );

    return validate<z.infer<typeof schema>>(schema, params);
  };

  /**
   * Calculates the energy consumption for a single input
   * (wattage * duration) / (seconds in an hour) / 1000 = kWh
   */
  const calculateEnergy = (input: PluginParams) => {
    const {
      duration,
      'cpu/utilization': cpu,
      'cloud/instance-type': instanceType,
      'cloud/vendor': cloudVendor,
    } = input;

    const wattage =
      cloudVendor === 'aws' && input.interpolation === 'spline'
        ? getAWSSplineWattage(cpu, instanceType)
        : getLinerInterpolationWattage(cpu, input);

    return (wattage * duration) / 3600 / 1000;
  };

  /**
   * Uses a spline method for AWS to get wattages.
   */
  const getAWSSplineWattage = (cpu: number, instanceType: string) => {
    const consumption = computeInstances['aws'][instanceType].consumption;
    const x = [0, 10, 50, 100];
    const y = [
      consumption.idle,
      consumption.tenPercent,
      consumption.fiftyPercent,
      consumption.hundredPercent,
    ];

    const spline = new Spline(x, y);

    return spline.at(cpu);
  };

  /**
   *  Gets Liner interpolation wattages for GCP and Azure.
   */
  const getLinerInterpolationWattage = (cpu: number, input: PluginParams) => {
    const {'cloud/vendor': cloudVendor, 'cloud/instance-type': instanceType} =
      input;
    const idle =
      computeInstances[cloudVendor][instanceType].consumption.minWatts;
    const max =
      computeInstances[cloudVendor][instanceType].consumption.maxWatts;

    return idle + (max - idle) * (cpu / 100);
  };

  /**
   * Standardize the instance metrics for all the vendors.
   * Maps the instance metrics to a standard format (min, max, idle, 10%, 50%, 100%) for all the vendors.
   */
  const standardizeInstanceMetrics = () => {
    initializeComputeInstances();

    calculateAverage('gcp', GCP_USE);
    calculateAverage('azure', AZURE_USE);
    calculateAverage('aws', AWS_USE);

    processInstances(
      AWS_INSTANCES,
      'aws',
      'Instance type',
      'Platform Total Number of vCPU'
    );
    processInstances(
      GCP_INSTANCES,
      'gcp',
      'Machine type',
      'Platform vCPUs (highest vCPU possible)'
    );
    processInstances(
      AZURE_INSTANCES,
      'azure',
      'Virtual Machine',
      'Platform vCPUs (highest vCPU possible)'
    );

    processEmbodiedEmissions(AWS_EMBODIED, 'aws');
    processEmbodiedEmissions(GCP_EMBODIED, 'gcp');
    processEmbodiedEmissions(AZURE_EMBODIED, 'azure');
  };

  /**
   * Initializes instances.
   */
  const initializeComputeInstances = () => {
    computeInstances['aws'] = {};
    computeInstances['gcp'] = {};
    computeInstances['azure'] = {};
  };

  /**
   * Calculates average of all instances.
   */
  const calculateAverage = (
    cloudVendor: string,
    instanceList: KeyValuePair[]
  ) => {
    const {totalMin, totalMax, count} = instanceList.reduce(
      (accumulator, instance) => {
        instanceUsage[cloudVendor][instance['Architecture']] = instance;
        accumulator.totalMin += parseFloat(instance['Min Watts']);
        accumulator.totalMax += parseFloat(instance['Max Watts']);
        accumulator.count += 1.0;
        return accumulator;
      },
      {totalMin: 0.0, totalMax: 0.0, count: 0.0}
    );

    instanceUsage[cloudVendor]['Average'] = {
      'Min Watts': totalMin / count,
      'Max Watts': totalMax / count,
      Architecture: 'Average',
    };
  };

  /**
   * Resolves differences in AWS instance architecture strings.
   * Modifies the input architecture string based on predefined rules.
   * Validates the resolved architecture using the validateAwsArchitecture method.
   */
  const resolveAwsArchitecture = (architecture: string) => {
    const modifyArchitecture: {[key: string]: () => void} = {
      'AMD ': () => {
        architecture = architecture.substring(4);
      },
      Skylake: () => {
        architecture = 'Sky Lake';
      },
      Graviton: () => {
        architecture = architecture.includes('2') ? 'Graviton2' : 'Graviton';
      },
      Unknown: () => {
        architecture = 'Average';
      },
    };

    Object.keys(modifyArchitecture).forEach(key => {
      if (architecture.includes(key)) {
        modifyArchitecture[key]();
      }
    });

    validateAwsArchitecture(architecture);

    return architecture;
  };

  /**
   * Validates the AWS instance architecture against a predefined set of supported architectures.
   */

  const validateAwsArchitecture = (architecture: string) => {
    if (!(architecture in instanceUsage['aws'])) {
      throw new UnsupportedValueError(
        errorBuilder({
          message: `Architecture '${architecture}' is not supported`,
        })
      );
    }
  };

  /**
   * Calculates the embodied emissions for a given input.
   * Multiply totalEmissions by 1000 to convert from kgCO2e to gCO2e
   * M = TE * (TR/EL) * (RR/TR)
   * Where:
   * TE = Total Embodied Emissions, the sum of Life Cycle Assessment(LCA) emissions for all hardware components
   * TR = Time Reserved, the length of time the hardware is reserved for use by the software
   * EL = Expected Lifespan, the anticipated time that the equipment will be installed
   * RR = Resources Reserved, the number of resources reserved for use by the software.
   * TR = Total Resources, the total number of resources available.
   */
  const embodiedEmissions = (input: PluginParams): number => {
    const {
      'cloud/vendor': cloudVendor,
      'cloud/instance-type': instanceType,
      'cpu/expected-lifespan': expectedLifespan,
      duration,
    } = input;
    const durationInHours = duration / 3600;

    const instance = computeInstances[cloudVendor][instanceType];

    const totalEmissions = instance.embodiedEmission;
    const expectedLifespanInHours =
      8760 * (expectedLifespan || deafultExpectedLifespan);
    const reservedResources = instance.vCPUs;
    const totalResources = instance.maxvCPUs;

    return (
      totalEmissions *
      1000 *
      (durationInHours / expectedLifespanInHours) *
      (reservedResources / totalResources)
    );
  };

  /**
   * Processes a list of instances, calculates their consumption, and stores the standardized information in the computeInstances object.
   */
  const processInstances = (
    instances: KeyValuePair[],
    cloudVendor: string,
    type: string,
    maxvCPUs: string
  ) => {
    instances.forEach((instance: KeyValuePair) => {
      const vCPU = cloudVendor === 'aws' ? 'Instance vCPU' : 'Instance vCPUs';
      const cpus = parseInt(instance[vCPU], 10);
      const consumption =
        cloudVendor === 'aws'
          ? calculateAwsConsumption(instance, cpus)
          : calculateConsumption(instance, cloudVendor, cpus);

      computeInstances[cloudVendor][instance[type]] = {
        name: instance[type],
        vCPUs: cpus,
        consumption,
        maxvCPUs: parseInt(instance[maxvCPUs], 10),
      } as ComputeInstance;
    });
  };

  /**
   * Retrieves the list of architectures for a given instance based on the INSTANCE_TYPE_COMPUTE_PROCESSOR_MAPPING.
   */
  const getInstanceArchitectures = (instance: KeyValuePair): string[] => {
    const architectures = INSTANCE_TYPE_COMPUTE_PROCESSOR_MAPPING[
      instance['Instance type']
    ] ?? ['Average'];

    return architectures.map((architecture: string) =>
      resolveAwsArchitecture(architecture)
    );
  };

  /**
   * Calculates the average minimum and maximum watts consumption for AWS instances based on the provided architectures.
   */
  const calculateAwsAverageWatts = (architectures: string[]) => {
    const awsInstance = instanceUsage['aws'];

    const {minWatts, maxWatts, count} = architectures.reduce(
      (accumulator, architecture) => {
        accumulator.minWatts += awsInstance[architecture]['Min Watts'];
        accumulator.maxWatts += awsInstance[architecture]['Max Watts'];
        accumulator.count += 1;
        return accumulator;
      },
      {minWatts: 0.0, maxWatts: 0.0, count: 0}
    );

    return {
      minWatts: minWatts / count,
      maxWatts: maxWatts / count,
    };
  };

  /**
   * Calculates the consumption metrics (idle, 10%, 50%, 100%, minWatts, maxWatts) for a given compute instance.cv
   */
  const calculateConsumption = (
    instance: KeyValuePair,
    cloudVendor: string,
    cpus: number
  ) => {
    const architecture =
      instance['Microarchitecture'] in instanceUsage[cloudVendor]
        ? instance['Microarchitecture']
        : 'Average';

    return {
      idle: 0,
      tenPercent: 0,
      fiftyPercent: 0,
      hundredPercent: 0,
      minWatts: instanceUsage[cloudVendor][architecture]['Min Watts'] * cpus,
      maxWatts: instanceUsage[cloudVendor][architecture]['Max Watts'] * cpus,
    };
  };

  /**
   * Calculates the consumption metrics (idle, 10%, 50%, 100%, minWatts, maxWatts) for a given compute instance.
   */
  const calculateAwsConsumption = (instance: KeyValuePair, cpus: number) => {
    const architectures = getInstanceArchitectures(instance);
    const {minWatts, maxWatts} = calculateAwsAverageWatts(architectures);

    return {
      idle: getParsedInstanceMetric(instance['Instance @ Idle']),
      tenPercent: getParsedInstanceMetric(instance['Instance @ 10%']),
      fiftyPercent: getParsedInstanceMetric(instance['Instance @ 50%']),
      hundredPercent: getParsedInstanceMetric(instance['Instance @ 100%']),
      minWatts: minWatts * cpus,
      maxWatts: maxWatts * cpus,
    };
  };

  /**
   * Parses a metric value to a floating-point number.
   */
  const getParsedInstanceMetric = (metric: string) => {
    return parseFloat(metric.replace(',', '.'));
  };

  /**
   * Processes and assigns embodied emissions data to compute instances for a specific cloud/vendor.
   */
  const processEmbodiedEmissions = (
    embodiedList: KeyValuePair[],
    cloudVendor: string
  ) => {
    embodiedList.forEach((instance: KeyValuePair) => {
      computeInstances[cloudVendor][instance['type']].embodiedEmission =
        instance['total'];
    });
  };

  return {
    metadata,
    execute,
  };
};
