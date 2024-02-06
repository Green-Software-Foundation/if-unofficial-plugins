import {INSTANCE_TYPE_COMPUTE_PROCESSOR_MAPPING} from '@cloud-carbon-footprint/aws/dist/lib/AWSInstanceTypes';

import Spline from 'typescript-cubic-spline';
import {z} from 'zod';

import {ModelPluginInterface} from '../../interfaces';
import {
  Interpolation,
  KeyValuePair,
  ModelParams,
  ComputeInstance,
} from '../../types/common';

import {allDefined, validate} from '../../util/validations';
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

const {InputValidationError, UnsupportedValueError} = ERRORS;

export class CloudCarbonFootprint implements ModelPluginInterface {
  private computeInstances: Record<string, Record<string, ComputeInstance>> =
    {};

  private instanceUsage: KeyValuePair = {
    gcp: {},
    aws: {},
    azure: {},
  };
  private SUPPORTED_VENDORS = ['aws', 'gcp', 'azure'] as const;
  private vendor = '';
  private instanceType = '';
  private expectedLifespan = 4;
  private interpolation = Interpolation.LINEAR;

  errorBuilder = buildErrorMessage(CloudCarbonFootprint);

  /**
   * Constructor initializes and standardizes instance metrics
   */
  constructor() {
    this.standardizeInstanceMetrics();
  }

  /**
   * Configures the CCF Plugin.
   */
  public async configure(staticParams: object): Promise<ModelPluginInterface> {
    const safeStaticParams = Object.assign(
      staticParams,
      this.validateStaticParams(staticParams)
    );

    this.vendor = safeStaticParams.vendor;
    this.instanceType = safeStaticParams['instance-type'];
    this.expectedLifespan =
      safeStaticParams['expected-lifespan'] ?? this.expectedLifespan;
    this.interpolation = safeStaticParams.interpolation ?? this.interpolation;

    return this;
  }

  /**
   * Calculate the total emissions for inputs.
   */
  public async execute(inputs: ModelParams[]): Promise<ModelParams[]> {
    if (this.instanceType === '' || this.vendor === '') {
      throw new InputValidationError(
        this.errorBuilder({
          message:
            "Incomplete configuration: 'instanceType' or 'vendor' is missing",
        })
      );
    }

    return inputs.map(input => {
      const safeInput = Object.assign(input, this.validateInput(input));

      safeInput['energy'] = this.calculateEnergy(safeInput);
      safeInput['embodied-carbon'] = this.embodiedEmissions(safeInput);

      return safeInput;
    });
  }

  /**
   * Validates single input fields
   */
  private validateStaticParams(staticParams: object) {
    const errorMessageForVendor = `Only ${this.SUPPORTED_VENDORS} is currently supported`;
    const errorMessageForInterpolation = `Only ${Interpolation} is currently supported`;

    const schema = z
      .object({
        'instance-type': z.string(),
        vendor: z.enum(this.SUPPORTED_VENDORS, {
          required_error: errorMessageForVendor,
        }),
        'expected-lifespan': z.number().optional(),
        interpolation: z
          .nativeEnum(Interpolation, {
            required_error: errorMessageForInterpolation,
          })
          .optional(),
      })
      .refine(param => {
        this.validateInterpolationForAws(param.interpolation, param.vendor);
        this.validateInstanceTypeForVendor(
          param['instance-type'],
          param.vendor
        );

        return true;
      });

    return validate<z.infer<typeof schema>>(schema, staticParams);
  }

  /**
   * Validates the interpolation method for AWS vendor.
   */
  private validateInterpolationForAws(
    interpolation: Interpolation | undefined,
    vendor: string
  ) {
    if (interpolation && vendor !== 'aws') {
      throw new UnsupportedValueError(
        this.errorBuilder({
          message: `Interpolation ${interpolation} method is not supported`,
        })
      );
    }

    return true;
  }

  /**
   * Validates the instance type for a specified vendor.
   */
  private validateInstanceTypeForVendor(instanceType: string, vendor: string) {
    if (!(instanceType in this.computeInstances[vendor])) {
      throw new UnsupportedValueError(
        this.errorBuilder({
          message: `Instance type ${instanceType} is not supported`,
        })
      );
    }
    return true;
  }

  /**
   * Validates single input fields.
   */
  private validateInput(input: ModelParams) {
    const schema = z
      .object({
        duration: z.number(),
        'cpu-util': z.number(),
        timestamp: z.string(),
      })
      .refine(allDefined, {
        message:
          '`duration`, `cpu-util` and `timestamp` should be present in the input',
      });
    return validate<z.infer<typeof schema>>(schema, input);
  }

  /**
   * Calculates the energy consumption for a single input
   * (wattage * duration) / (seconds in an hour) / 1000 = kWh
   */
  private calculateEnergy(input: KeyValuePair) {
    const {duration, 'cpu-util': cpu} = input;

    const wattage =
      this.vendor === 'aws' && this.interpolation === 'spline'
        ? this.getAWSSplineWattage(cpu)
        : this.getLinerInterpolationWattage(cpu);

    return (wattage * duration) / 3600 / 1000;
  }

  /**
   * Uses a spline method for AWS to get wattages.
   */
  private getAWSSplineWattage(cpu: number) {
    const consumption =
      this.computeInstances['aws'][this.instanceType].consumption;
    const x = [0, 10, 50, 100];
    const y = [
      consumption.idle,
      consumption.tenPercent,
      consumption.fiftyPercent,
      consumption.hundredPercent,
    ];

    const spline = new Spline(x, y);

    return spline.at(cpu);
  }

  /**
   *  Gets Liner interpolation wattages for GCP and Azure.
   */
  private getLinerInterpolationWattage(cpu: number) {
    const idle =
      this.computeInstances[this.vendor][this.instanceType].consumption
        .minWatts;
    const max =
      this.computeInstances[this.vendor][this.instanceType].consumption
        .maxWatts;

    return idle + (max - idle) * (cpu / 100);
  }

  /**
   * Standardize the instance metrics for all the vendors.
   * Maps the instance metrics to a standard format (min, max, idle, 10%, 50%, 100%) for all the vendors.
   */
  private standardizeInstanceMetrics() {
    this.initializeComputeInstances();

    this.calculateAverage('gcp', GCP_USE);
    this.calculateAverage('azure', AZURE_USE);
    this.calculateAverage('aws', AWS_USE);

    this.processInstances(
      AWS_INSTANCES,
      'aws',
      'Instance type',
      'Platform Total Number of vCPU'
    );
    this.processInstances(
      GCP_INSTANCES,
      'gcp',
      'Machine type',
      'Platform vCPUs (highest vCPU possible)'
    );
    this.processInstances(
      AZURE_INSTANCES,
      'azure',
      'Virtual Machine',
      'Platform vCPUs (highest vCPU possible)'
    );

    this.processEmbodiedEmissions(AWS_EMBODIED, 'aws');
    this.processEmbodiedEmissions(GCP_EMBODIED, 'gcp');
    this.processEmbodiedEmissions(AZURE_EMBODIED, 'azure');
  }

  /**
   * Initializes instances.
   */
  private initializeComputeInstances() {
    this.computeInstances['aws'] = {};
    this.computeInstances['gcp'] = {};
    this.computeInstances['azure'] = {};
  }

  /**
   * Calculates average of all instances.
   */
  private calculateAverage(vendor: string, instanceList: KeyValuePair[]) {
    const {totalMin, totalMax, count} = instanceList.reduce(
      (accumulator, instance) => {
        this.instanceUsage[vendor][instance['Architecture']] = instance;
        accumulator.totalMin += parseFloat(instance['Min Watts']);
        accumulator.totalMax += parseFloat(instance['Max Watts']);
        accumulator.count += 1.0;
        return accumulator;
      },
      {totalMin: 0.0, totalMax: 0.0, count: 0.0}
    );

    this.instanceUsage[vendor]['Average'] = {
      'Min Watts': totalMin / count,
      'Max Watts': totalMax / count,
      Architecture: 'Average',
    };
  }

  /**
   * Resolves differences in AWS instance architecture strings.
   * Modifies the input architecture string based on predefined rules.
   * Validates the resolved architecture using the validateAwsArchitecture method.
   */
  private resolveAwsArchitecture(architecture: string) {
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

    this.validateAwsArchitecture(architecture);

    return architecture;
  }

  /**
   * Validates the AWS instance architecture against a predefined set of supported architectures.
   */

  private validateAwsArchitecture(architecture: string) {
    if (!(architecture in this.instanceUsage['aws'])) {
      throw new UnsupportedValueError(
        this.errorBuilder({
          message: `Architecture '${architecture}' is not supported`,
        })
      );
    }
  }

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
  private embodiedEmissions(input: KeyValuePair): number {
    const durationInHours = input['duration'] / 3600;

    const instance = this.computeInstances[this.vendor][this.instanceType];

    const totalEmissions = instance.embodiedEmission;
    const expectedLifespan = 8760 * this.expectedLifespan;
    const reservedResources = instance.vCPUs;
    const totalResources = instance.maxvCPUs;

    return (
      totalEmissions *
      1000 *
      (durationInHours / expectedLifespan) *
      (reservedResources / totalResources)
    );
  }

  /**
   * Processes a list of instances, calculates their consumption, and stores the standardized information in the computeInstances object.
   */
  private processInstances(
    instances: KeyValuePair[],
    vendor: string,
    type: string,
    maxvCPUs: string
  ) {
    instances.forEach((instance: KeyValuePair) => {
      const vCPU = vendor === 'aws' ? 'Instance vCPU' : 'Instance vCPUs';
      const cpus = parseInt(instance[vCPU], 10);
      const consumption =
        vendor === 'aws'
          ? this.calculateAwsConsumption(instance, cpus)
          : this.calculateConsumption(instance, vendor, cpus);

      this.computeInstances[vendor][instance[type]] = {
        name: instance[type],
        vCPUs: cpus,
        consumption,
        maxvCPUs: parseInt(instance[maxvCPUs], 10),
      } as ComputeInstance;
    });
  }

  /**
   * Retrieves the list of architectures for a given instance based on the INSTANCE_TYPE_COMPUTE_PROCESSOR_MAPPING.
   */
  private getInstanceArchitectures(instance: KeyValuePair): string[] {
    const architectures = INSTANCE_TYPE_COMPUTE_PROCESSOR_MAPPING[
      instance['Instance type']
    ] ?? ['Average'];

    return architectures.map((architecture: string) =>
      this.resolveAwsArchitecture(architecture)
    );
  }

  /**
   * Calculates the average minimum and maximum watts consumption for AWS instances based on the provided architectures.
   */
  private calculateAwsAverageWatts(architectures: string[]) {
    const awsInstance = this.instanceUsage['aws'];

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
  }

  /**
   * Calculates the consumption metrics (idle, 10%, 50%, 100%, minWatts, maxWatts) for a given compute instance.cv
   */
  private calculateConsumption(
    instance: KeyValuePair,
    vendor: string,
    cpus: number
  ) {
    const architecture =
      instance['Microarchitecture'] in this.instanceUsage[vendor]
        ? instance['Microarchitecture']
        : 'Average';

    return {
      idle: 0,
      tenPercent: 0,
      fiftyPercent: 0,
      hundredPercent: 0,
      minWatts: this.instanceUsage[vendor][architecture]['Min Watts'] * cpus,
      maxWatts: this.instanceUsage[vendor][architecture]['Max Watts'] * cpus,
    };
  }

  /**
   * Calculates the consumption metrics (idle, 10%, 50%, 100%, minWatts, maxWatts) for a given compute instance.
   */
  private calculateAwsConsumption(instance: KeyValuePair, cpus: number) {
    const architectures = this.getInstanceArchitectures(instance);
    const {minWatts, maxWatts} = this.calculateAwsAverageWatts(architectures);

    return {
      idle: this.getParsedInstanceMetric(instance['Instance @ Idle']),
      tenPercent: this.getParsedInstanceMetric(instance['Instance @ 10%']),
      fiftyPercent: this.getParsedInstanceMetric(instance['Instance @ 50%']),
      hundredPercent: this.getParsedInstanceMetric(instance['Instance @ 100%']),
      minWatts: minWatts * cpus,
      maxWatts: maxWatts * cpus,
    };
  }

  /**
   * Parses a metric value to a floating-point number.
   */
  private getParsedInstanceMetric(metric: string) {
    return parseFloat(metric.replace(',', '.'));
  }

  /**
   * Processes and assigns embodied emissions data to compute instances for a specific vendor.
   */
  private processEmbodiedEmissions(
    embodiedList: KeyValuePair[],
    vendor: string
  ) {
    embodiedList.forEach((instance: KeyValuePair) => {
      this.computeInstances[vendor][instance['type']].embodiedEmission =
        instance['total'];
    });
  }
}
