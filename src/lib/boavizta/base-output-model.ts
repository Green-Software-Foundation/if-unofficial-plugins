import {ModelPluginInterface} from '../../interfaces';
import {KeyValuePair, ModelParams} from '../../types/common';

import {buildErrorMessage} from '../../util/helpers';
import {ERRORS} from '../../util/errors';

import {BoaviztaAPI} from './boavizta-api';
import {IBoaviztaUsageSCI} from './types';

const {InputValidationError} = ERRORS;

export abstract class BoaviztaBaseOutputModel implements ModelPluginInterface {
  protected sharedParams?: object = undefined;
  protected verbose: boolean = false;
  protected allocation: string = 'LINEAR';
  protected metricType: 'cpu-util' | 'gpu-util' | 'ram-util' = 'cpu-util';
  protected expectedLifespan: number = 4 * 365 * 24 * 60 * 60;
  protected authCredentials?: object;
  protected boaviztaAPI: BoaviztaAPI = new BoaviztaAPI();

  errorBuilder = buildErrorMessage(this.constructor); //TODO: send name after all models are refactored

  /**
   * Authenticates the model with provided authentication parameters.
   */
  protected async authenticate(authParams: object) {
    this.authCredentials = authParams;
  }

  /**
   * Configures the model with static parameters.
   */
  public async configure(staticParams: object): Promise<ModelPluginInterface> {
    this.sharedParams = await this.captureStaticParams(staticParams);

    return this;
  }

  /**
   * Calculates the output of the given usage.
   */
  public async execute(inputs: ModelParams[]): Promise<any[]> {
    if (!Array.isArray(inputs)) {
      throw new InputValidationError(
        this.errorBuilder({message: 'Input data is not an array.'})
      );
    }
    const result = [];

    for await (const input of inputs) {
      const usageResult = await this.calculateUsagePerInput(input);
      result.push(usageResult);
    }

    return result;
  }

  /**
   * Fetches data from Boavizta API according to the specific endpoint of the model
   */
  protected abstract fetchData(usageData: object | undefined): Promise<object>;

  /**
   * Converts the usage from IMPL input to the format required by Boavizta API.
   */
  private transformToBoaviztaUsage(duration: number, metric: number) {
    // duration is in seconds, convert to hours
    // metric is between 0 and 1, convert to percentage
    const usageInput: KeyValuePair = {
      hours_use_time: duration / 3600.0,
      time_workload: metric,
    };
    // convert expected lifespan from seconds to years
    usageInput['years_life_time'] =
      this.expectedLifespan / (365.0 * 24.0 * 60.0 * 60.0);

    return this.addLocationToUsage(usageInput);
  }

  /**
   * Adds location to usage if location is defined in sharedParams.
   */
  private addLocationToUsage(usageRaw: KeyValuePair) {
    if (this.sharedParams !== undefined && 'location' in this.sharedParams) {
      usageRaw['usage_location'] = this.sharedParams['location'];
    }

    return usageRaw;
  }

  /**
   * Abstract subs to make compatibility with base interface. allows configure to be defined in base class
   */
  protected abstract captureStaticParams(staticParams: object): Promise<object>;

  /**
   * Extracts information from Boavizta API response to return the output in the format required by IMPL.
   */
  protected formatResponse(data: KeyValuePair) {
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
  protected async calculateUsagePerInput(input: ModelParams) {
    if (!(this.metricType in input)) {
      throw new InputValidationError(
        this.errorBuilder({
          message: 'Invalid input parameter',
        })
      );
    }

    const usageInput = this.transformToBoaviztaUsage(
      input['duration'],
      input[this.metricType]
    );

    return (await this.fetchData(usageInput)) as IBoaviztaUsageSCI;
  }
}
