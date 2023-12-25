// import axios from 'axios';
import {ERRORS} from '../../util/errors';
import {buildErrorMessage} from '../../util/helpers';

import {ModelParams} from '../../types/common';
import { ModelPluginInterface } from '../../interfaces';
import * as dayjs from 'dayjs';

import CommonGenerator from './helpers/CommonGenerator';
import RandIntGenerator from './helpers/RandIntGenerator';
import Generator from './interfaces/index';

const { InputValidationError } = ERRORS;

export class MockObservations implements ModelPluginInterface {
  // TODO PB - private members ?
  staticParams: object | undefined;
  errorBuilder = buildErrorMessage(MockObservations);
  timestampFrom: dayjs.Dayjs | undefined;
  timestampTo: dayjs.Dayjs | undefined;
  duration: number = 0;
  timeBuckets: dayjs.Dayjs[] = [];
  components: Record<string, Record<string, string>> = {}
  // components: object[] = [];
  generatorConfigs: object = {};
  dateList: dayjs.Dayjs[] = [];

  async execute(inputs: ModelParams[]): Promise<any[]> {
    // TODO PB - remove dummy line, resolve issue of error TS6133: 'inputs' is declared but its value is never read.
    console.log(inputs);
    // TODO PB - consider making generators a member and creating them at config()
    const generators = this.createGenerators(this.generatorConfigs);
    let observations: ModelParams[] = [];
    for (const componentKey in this.components) {
      if (this.components.hasOwnProperty(componentKey)) {
        const component = this.components[componentKey];
        for (const timeBucket of this.timeBuckets) {
          let observation: ModelParams = {
            timestamp: timeBucket.format('YYYY-MM-DD HH:mm:ss'),
            // TODO PB -- this is not always true, the last timebucket might be shorter than the global duration. so duratio should be a property of timebucket (define a DTO for this)
            duration: this.duration
          };
          // TODO PB -- consider this way to copy key-value pairs from component to observation, it looks like an overkill
          for (const key in component) {
            if (Object.prototype.hasOwnProperty.call(component, key)) {
              observation[key] = component[key];
            }
          }
          for (const generator of generators) {
            // TODO PB - for future proofing, need to collecat historically generated data and pass it here
            const generated: Record<string, any> = generator.next([]);
            // TODO PB -- consider this way to copy key-value pairs from component to observation, it looks like an overkill
            for (const key in generated) {
              if (Object.prototype.hasOwnProperty.call(generated, key)) {
                observation[key] = generated[key];
              }
            }
          }
          observations.push(observation);
        }
      }
    }
    return observations;
  }

  // TODO PB - clean this code
  async configure(
    staticParams: object | undefined
  ): Promise<ModelPluginInterface> {
    if (staticParams === undefined) {
      throw new InputValidationError(
        this.errorBuilder({ message: 'Input data is missing' })
      );
    }
    if ('timestamp-from' in staticParams) {
      this.timestampFrom = dayjs(staticParams['timestamp-from'] as string);
    }
    else {
      throw new InputValidationError(
        this.errorBuilder({ message: 'timestamp-from missing from input data' })
      );
    }
    if ('timestamp-to' in staticParams) {
      this.timestampTo = dayjs(staticParams['timestamp-to'] as string);
    }
    else {
      throw new InputValidationError(
        this.errorBuilder({ message: 'timestamp-to missing from input data' })
      );
    }
    if ('duration' in staticParams) {
      this.duration = staticParams['duration'] as number;
    }
    else {
      throw new InputValidationError(
        this.errorBuilder({ message: 'duration missing from input data' })
      );
    }
    this.timeBuckets = this.createTimeBuckets(this.timestampFrom, this.timestampTo, this.duration);

    if ('components' in staticParams) {
      // TODO PB -- is this casting needed?
      this.components = staticParams['components'] as Record<string, Record<string, string>>;
    }
    else {
      throw new InputValidationError(
        this.errorBuilder({ message: 'components missing from input data' })
      );
    }
    if ('generators' in staticParams) {
      // TODO PB -- is this casting needed?
      this.generatorConfigs = staticParams['generators'] as object;
    }
    else {
      throw new InputValidationError(
        this.errorBuilder({ message: 'generators missing from input data' })
      );
    }
	  // TODO PB -- remove dummy line
	  this.staticParams = staticParams;
	  return this;
  }

  private createTimeBuckets(timestampFrom: dayjs.Dayjs, timestampTo: dayjs.Dayjs, duration: number): dayjs.Dayjs[] {
    let timeBuckets: dayjs.Dayjs[] = []
    let currTimestamp: dayjs.Dayjs = timestampFrom;
    while (currTimestamp.isBefore(timestampTo) || currTimestamp.isSame(timestampTo, 'second')) {
      timeBuckets.push(currTimestamp);
      currTimestamp = currTimestamp.add(duration, 'second');
    }
    return timeBuckets;
  }

  private createGenerators(generatorsConfig: object): Generator[] {
    let generators: Generator[] = [];
    Object.entries(generatorsConfig).forEach(([key, value]) => {
      //console.log(`generator name: ${key}, generator config: ${value}`);
      if ('common' === key) {
        const commonGenerator = new CommonGenerator();
        commonGenerator.initialise('common-generator', value);
        generators.push(commonGenerator);
      }
      if ('randint' === key) {
        for (const fieldToPopulate in value) {
          const randIntGenerator = new RandIntGenerator()
          randIntGenerator.initialise(fieldToPopulate, value[fieldToPopulate]);
          generators.push(randIntGenerator)
        }
      }
    });
    return generators;
  }
}

export default MockObservations;
