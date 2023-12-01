import axios from 'axios';

import {ERRORS} from '../../util/errors';
import {buildErrorMessage} from '../../util/helpers';

import {KeyValuePair, ModelParams} from '../../types/common';
import {ModelPluginInterface} from '../../interfaces';
import {BoaviztaInstanceTypes, IBoaviztaUsageSCI} from '../../types/boavizta';

const {InputValidationError, UnsupportedValueError} = ERRORS;

abstract class BoaviztaOutputModel implements ModelPluginInterface {
  name: string | undefined;
  sharedParams: object | undefined = undefined;
  metricType: 'cpu-util' | 'gpu-util' | 'ram-util' = 'cpu-util';
  expectedLifespan = 4 * 365 * 24 * 60 * 60;
  protected authCredentials: object | undefined;
  errorBuilder = buildErrorMessage(BoaviztaOutputModel);

  async authenticate(authParams: object) {
    this.authCredentials = authParams;
  }

  async configure(staticParams: object): Promise<ModelPluginInterface> {
    this.sharedParams = await this.captureStaticParams(staticParams);

    return this;
  }

  /**
   * Fetches data from Boavizta API according to the specific endpoint of the model
   */
  abstract fetchData(usageData: object | undefined): Promise<object>;

  /**
   * List of supported locations by the model.
   */
  async supportedLocations(): Promise<string[]> {
    const countries = await axios.get(
      'https://api.boavizta.org/v1/utils/country_code'
    );

    return Object.values(countries.data);
  }

  /**
   * Converts the usage from IMPL input to the format required by Boavizta API.
   */
  transformToBoaviztaUsage(duration: number, metric: number) {
    // duration is in seconds, convert to hours
    // metric is between 0 and 1, convert to percentage
    let usageInput: KeyValuePair = {
      hours_use_time: duration / 3600.0,
      time_workload: metric,
    };
    // convert expected lifespan from seconds to years
    usageInput['years_life_time'] =
      this.expectedLifespan / (365.0 * 24.0 * 60.0 * 60.0);
    usageInput = this.addLocationToUsage(usageInput);

    return usageInput;
  }

  /**
   * Calculates the output of the given usage.
   */
  async execute(inputs: ModelParams[]): Promise<any[]> {
    if (Array.isArray(inputs) && inputs.length > 0) {
      const results: KeyValuePair[] = [];

      for (const input of inputs) {
        const usageResult = await this.calculateUsageForinput(input);
        results.push(usageResult);
      }

      return results;
    } else {
      throw new InputValidationError(
        this.errorBuilder({message: 'Input data is not an array'})
      );
    }
  }

  /**
   * Adds location to usage if location is defined in sharedParams.
   */
  addLocationToUsage(usageRaw: KeyValuePair) {
    if (this.sharedParams !== undefined && 'location' in this.sharedParams) {
      usageRaw['usage_location'] = this.sharedParams['location'];
    }

    return usageRaw;
  }

  /**
   * Abstract subs to make compatibility with base interface. allows configure to be defined in base class
   */
  protected abstract captureStaticParams(staticParams: object): object;

  /**
   * Extracts information from Boavizta API response to return the output in the format required by IMPL.
   */
  protected formatResponse(data: KeyValuePair): KeyValuePair {
    let m = 0;
    let e = 0;
    if ('impacts' in data) {
      // embodied-carbon output is in kgCO2eq, convert to gCO2eq
      m = data['impacts']['gwp']['embedded']['value'] * 1000;
      // use output is in J , convert to kWh.
      // 1,000,000 J / 3600 = 277.7777777777778 Wh.
      // 1 MJ / 3.6 = 0.278 kWh
      e = data['impacts']['pe']['use']['value'] / 3.6;
    }

    return {'embodied-carbon': m, energy: e};
  }

  /**
   * converts the usage to the format required by Boavizta API.
   */
  protected async calculateUsageForinput(
    input: ModelParams
  ): Promise<KeyValuePair> {
    if (this.metricType in input) {
      const usageInput = this.transformToBoaviztaUsage(
        input['duration'],
        input[this.metricType]
      );
      const usage = (await this.fetchData(usageInput)) as IBoaviztaUsageSCI;

      return usage;
    } else {
      throw new InputValidationError(
        this.errorBuilder({
          message: 'Invalid input parameter',
        })
      );
    }
  }
}

export class BoaviztaCpuOutputModel
  extends BoaviztaOutputModel
  implements ModelPluginInterface
{
  sharedParams: object | undefined = undefined;
  public name: string | undefined;
  public verbose = false;
  public allocation = 'LINEAR';
  private readonly componentType = 'cpu';

  constructor() {
    super();
    this.metricType = 'cpu-util';
    this.componentType = 'cpu';
  }

  async fetchData(usageData: object | undefined): Promise<object> {
    if (this.sharedParams === undefined) {
      throw new InputValidationError(
        this.errorBuilder({
          message: 'Missing configuration parameters',
        })
      );
    }

    const dataCast = this.sharedParams as KeyValuePair;
    dataCast['usage'] = usageData;

    const response = await axios.post(
      `https://api.boavizta.org/v1/component/${this.componentType}?verbose=${this.verbose}&duration=${dataCast['usage']['hours_use_time']}`,
      dataCast
    );

    const result = this.formatResponse(response.data);

    return {
      'e-cpu': result.energy,
      'embodied-carbon': result['embodied-carbon'],
    };
  }

  protected async captureStaticParams(staticParams: object): Promise<object> {
    // if verbose is defined in staticParams, remove it from staticParams and set verbose to the value defined in staticParams
    if (
      'verbose' in staticParams &&
      (staticParams.verbose === true || staticParams.verbose === false)
    ) {
      this.verbose = staticParams.verbose;
      staticParams.verbose = undefined;
    }

    if (!('physical-processor' in staticParams)) {
      throw new InputValidationError(
        this.errorBuilder({
          message: "Missing 'physical-processor' parameter from configuration",
        })
      );
    }

    if (!('core-units' in staticParams)) {
      throw new InputValidationError(
        this.errorBuilder({
          message: "Missing 'core-units' parameter from configuration",
        })
      );
    }

    if ('expected-lifespan' in staticParams) {
      this.expectedLifespan = staticParams['expected-lifespan'] as number;
    }

    this.sharedParams = Object.assign({}, staticParams);

    return this.sharedParams;
  }
}

export class BoaviztaCloudOutputModel
  extends BoaviztaOutputModel
  implements ModelPluginInterface
{
  public sharedParams: object | undefined = undefined;
  public instanceTypes: BoaviztaInstanceTypes = {};
  public name: string | undefined;
  public verbose = false;
  public allocation = 'LINEAR';

  async validateLocation(staticParamsCast: object): Promise<string | void> {
    if ('location' in staticParamsCast) {
      const location = staticParamsCast.location as string;
      const countries = await this.supportedLocations();

      if (!countries.includes(location)) {
        throw new InputValidationError(
          this.errorBuilder({
            message: `Invalid location parameter location. Valid values are ${countries.join(
              ', '
            )}`,
          })
        );
      }

      return staticParamsCast.location as string;
    }
  }

  async validateInstanceType(staticParamsCast: object) {
    if (!('provider' in staticParamsCast)) {
      throw new InputValidationError(
        this.errorBuilder({
          message: "Missing 'provider' parameter from configuration",
        })
      );
    }

    if (!('instance-type' in staticParamsCast)) {
      throw new InputValidationError(
        this.errorBuilder({
          message: "Missing 'instance-type' parameter from configuration",
        })
      );
    }

    const provider = staticParamsCast.provider as string;

    if (
      this.instanceTypes[provider] === undefined ||
      this.instanceTypes[provider].length === 0
    ) {
      this.instanceTypes[provider] =
        await this.supportedInstancesList(provider);
    }

    if ('instance-type' in staticParamsCast) {
      if (
        !this.instanceTypes[provider].includes(
          staticParamsCast['instance-type'] as string
        )
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
  }

  async validateProvider(staticParamsCast: object) {
    if (!('provider' in staticParamsCast)) {
      throw new InputValidationError(
        this.errorBuilder({
          message: "Missing 'provider' parameter from configuration",
        })
      );
    } else {
      const supportedProviders = await this.supportedProvidersList();

      if (!supportedProviders.includes(staticParamsCast.provider as string)) {
        throw new InputValidationError(
          this.errorBuilder({
            message: `Invalid 'provider' parameter '${
              staticParamsCast.provider
            }'. Valid values are ${supportedProviders.join(', ')}`,
          })
        );
      }
    }
  }

  async supportedInstancesList(provider: string) {
    const instances = await axios.get(
      `https://api.boavizta.org/v1/cloud/instance/all_instances?provider=${provider}`
    );

    return instances.data;
  }

  async supportedProvidersList(): Promise<string[]> {
    const providers = await axios.get(
      'https://api.boavizta.org/v1/cloud/instance/all_providers'
    );

    return Object.values(providers.data);
  }

  async fetchData(usageData: object | undefined): Promise<object> {
    if (this.sharedParams === undefined) {
      throw new InputValidationError(
        this.errorBuilder({
          message: 'Missing configuration parameters',
        })
      );
    }

    const dataCast = this.sharedParams as KeyValuePair;

    for (const key in dataCast) {
      // replace - with _ in keys
      if (key.includes('-')) {
        const newKey = key.replace(/-/g, '_');
        dataCast[newKey] = dataCast[key];
        delete dataCast[key];
      }
    }

    dataCast['usage'] = usageData;
    const response = await axios.post(
      `https://api.boavizta.org/v1/cloud/instance?verbose=${this.verbose}&duration=${dataCast['usage']['hours_use_time']}`,
      dataCast
    );
    return this.formatResponse(response.data);
  }

  protected async captureStaticParams(staticParams: object): Promise<object> {
    if (
      'verbose' in staticParams &&
      staticParams.verbose !== undefined &&
      (staticParams.verbose === true || staticParams.verbose === false)
    ) {
      this.verbose = staticParams.verbose;
      staticParams.verbose = undefined;
    }

    await this.validateProvider(staticParams); // if no valid provider found, throw error

    await this.validateInstanceType(staticParams); // if no valid 'instance-type' found, throw error

    await this.validateLocation(staticParams); // if no valid location found, throw error

    if ('expected-lifespan' in staticParams) {
      this.expectedLifespan = staticParams['expected-lifespan'] as number;
    }

    this.sharedParams = Object.assign({}, staticParams);

    return this.sharedParams;
  }
}
