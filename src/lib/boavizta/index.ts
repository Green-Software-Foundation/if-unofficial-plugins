import {z} from 'zod';

import {ModelParams} from '../../types';

import {allDefined, validate} from '../../util/validations';
import {ERRORS} from '../../util/errors';

import {BoaviztaBaseOutputModel} from './base-output-model';
import {
  BoaviztaInstanceTypes,
  BoaviztaUsageType,
  BoaviztaCpuOutputType,
  BoaviztaCloudInstanceType,
} from './types';

const {InputValidationError, UnsupportedValueError} = ERRORS;

export class BoaviztaCpuOutputModel extends BoaviztaBaseOutputModel<BoaviztaCpuOutputType> {
  private readonly componentType = 'cpu';

  constructor() {
    super();
    this.metricType = 'cpu-util';
    this.componentType = 'cpu';
  }

  /**
   * Captures and validates static parameters for the CPU model.
   */
  protected async captureStaticParams(staticParams: ModelParams) {
    const safeStaticParams = this.validateStaticParams(staticParams);

    this.verbose = !!staticParams.verbose;

    delete staticParams.verbose;

    if ('expected-lifespan' in safeStaticParams) {
      this.expectedLifespan = safeStaticParams['expected-lifespan']!;
    }

    this.sharedParams = Object.assign({}, staticParams, safeStaticParams);

    return this.sharedParams;
  }

  /**
   * Fetches data from the Boavizta API for the CPU model.
   */
  protected async fetchData(
    usage: BoaviztaUsageType | undefined
  ): Promise<BoaviztaCpuOutputType> {
    if (this.sharedParams === undefined) {
      throw new InputValidationError(
        this.errorBuilder({
          message: 'Missing configuration parameters',
        })
      );
    }

    const data = Object.assign({}, this.sharedParams, {usage});

    const response = await this.boaviztaAPI.fetchCpuOutputData(
      data,
      this.componentType,
      this.verbose
    );

    const result = this.formatResponse(response);

    const cpuOutputData: BoaviztaCpuOutputType = {
      'energy-cpu': result.energy,
      'embodied-carbon': result['embodied-carbon'],
    };

    return cpuOutputData;
  }

  /**
   * Validates static parameters for the CPU model using Zod schema.
   */
  private validateStaticParams(staticParams: ModelParams) {
    const schema = z
      .object({
        'physical-processor': z.string(),
        'core-units': z.number(),
        'expected-lifespan': z.number().optional(),
      })
      .refine(allDefined, {message: 'All parameters are required.'});

    return validate<z.infer<typeof schema>>(schema, staticParams);
  }
}

export class BoaviztaCloudOutputModel extends BoaviztaBaseOutputModel<BoaviztaCloudInstanceType> {
  public instanceTypes: BoaviztaInstanceTypes = {};
  public allocation = 'LINEAR';

  /**
   * Captures and validates static parameters for the Cloud model.
   */
  protected async captureStaticParams(staticParams: ModelParams) {
    const safeStaticParams = Object.assign(
      staticParams,
      this.validateStaticParams(staticParams)
    );

    this.verbose = !!staticParams.verbose;

    delete staticParams.verbose;

    await this.validateProvider(safeStaticParams);
    await this.validateInstanceType(safeStaticParams);
    await this.validateLocation(safeStaticParams);

    if ('expected-lifespan' in safeStaticParams) {
      this.expectedLifespan = safeStaticParams['expected-lifespan']!;
    }

    this.sharedParams = Object.assign({}, staticParams);

    return this.sharedParams;
  }

  /**
   * Fetches data from the Boavizta API for the Cloud model.
   */
  protected async fetchData(
    usage: BoaviztaUsageType
  ): Promise<BoaviztaCloudInstanceType> {
    if (this.sharedParams === undefined) {
      throw new InputValidationError(
        this.errorBuilder({
          message: 'Missing configuration parameters',
        })
      );
    }

    const data = Object.assign({}, this.sharedParams, {usage});

    const response = await this.boaviztaAPI.fetchCloudInstanceData(
      data,
      this.verbose
    );
    return this.formatResponse(response);
  }

  /**
   * Validates static parameters for the Cloud model using Zod schema.
   */
  private validateStaticParams(staticParams: ModelParams) {
    const schema = z
      .object({
        provider: z.string(),
        'instance-type': z.string(),
        verbose: z.boolean().optional(),
        'expected-lifespan': z.number().optional(),
      })
      .refine(allDefined, {message: 'All parameters are required.'});

    return validate<z.infer<typeof schema>>(schema, staticParams);
  }

  /**
   * Validates the provider parameter for the Cloud model.
   */
  private async validateProvider(staticParamsCast: ModelParams) {
    const supportedProviders =
      await this.boaviztaAPI.getSupportedProvidersList();

    if (!supportedProviders.includes(staticParamsCast.provider)) {
      throw new InputValidationError(
        this.errorBuilder({
          message: `Invalid 'provider' parameter '${
            staticParamsCast.provider
          }'. Valid values are ${supportedProviders.join(', ')}`,
        })
      );
    }
  }

  /**
   * Validates the instance type parameter for the Cloud model.
   */
  private async validateInstanceType(staticParamsCast: ModelParams) {
    const provider = staticParamsCast.provider;

    if (
      !this.instanceTypes[provider] ||
      this.instanceTypes[provider].length === 0
    ) {
      this.instanceTypes[provider] =
        await this.boaviztaAPI.getSupportedInstancesList(provider);
    }

    if (
      !this.instanceTypes[provider].includes(staticParamsCast['instance-type'])
    ) {
      throw new UnsupportedValueError(
        this.errorBuilder({
          message: `Invalid 'instance-type' parameter: '${
            staticParamsCast['instance-type']
          }'. Valid values are : ${this.instanceTypes[provider].join(', ')}`,
        })
      );
    }
  }

  /**
   * Validates the location parameter for the Cloud model.
   */
  private async validateLocation(
    staticParamsCast: ModelParams
  ): Promise<string | void> {
    if ('location' in staticParamsCast) {
      const countries = await this.boaviztaAPI.getSupportedLocations();
      const whitelistedCountries = countries.join(', ');

      if (!countries.includes(staticParamsCast.location)) {
        throw new InputValidationError(
          this.errorBuilder({
            message: `Invalid location parameter location. Valid values are ${whitelistedCountries}`,
          })
        );
      }

      return staticParamsCast.location;
    }
  }
}
