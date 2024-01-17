// import axios from 'axios';
import {ERRORS} from '../../util/errors';
import {buildErrorMessage} from '../../util/helpers';

import {ModelParams} from '../../types/common';
import {ModelPluginInterface} from '../../interfaces';
import * as dayjs from 'dayjs';

import CommonGenerator from './helpers/CommonGenerator';
import RandIntGenerator from './helpers/RandIntGenerator';
import Generator from './interfaces/index';
const {InputValidationError} = ERRORS;

export class MockObservations implements ModelPluginInterface {
  private errorBuilder = buildErrorMessage(MockObservations);
  private timestampFrom: dayjs.Dayjs | undefined;
  private timestampTo: dayjs.Dayjs | undefined;
  private duration = 0;
  private timeBuckets: dayjs.Dayjs[] = [];
  private components: Record<string, Record<string, string>> = {};
  private generatorConfigs: object = {};

  async execute(_inputs: ModelParams[]): Promise<any[]> {
    const generators = this.createGenerators(this.generatorConfigs);
    const observations: ModelParams[] = [];
    for (const componentKey in this.components) {
      if (Object.prototype.hasOwnProperty.call(this.components, componentKey)) {
        const component = this.components[componentKey];
        for (const timeBucket of this.timeBuckets) {
          const observation: ModelParams = {
            timestamp: timeBucket.format('YYYY-MM-DD HH:mm:ss'),
            duration: this.duration,
          };
          Object.assign(observation, component);
          const generatorToHistory = new Map<Generator, number[]>();
          generators.forEach(generator => {
            generatorToHistory.set(generator, []);
          });
          for (const generator of generators) {
            const generated: Record<string, any> = generator.next(
              generatorToHistory.get(generator)
            );
            generatorToHistory.get(generator)?.push(generated.value);
            Object.assign(observation, generated);
          }
          observations.push(observation);
        }
      }
    }
    return observations;
  }

  async configure(
    staticParams: object | undefined
  ): Promise<ModelPluginInterface> {
    if (staticParams === undefined) {
      throw new InputValidationError(
        this.errorBuilder({message: 'Input data is missing'})
      );
    }
    if ('timestamp-from' in staticParams) {
      this.timestampFrom = dayjs(staticParams['timestamp-from'] as string);
    } else {
      throw new InputValidationError(
        this.errorBuilder({message: 'timestamp-from missing from input data'})
      );
    }
    if ('timestamp-to' in staticParams) {
      this.timestampTo = dayjs(staticParams['timestamp-to'] as string);
    } else {
      throw new InputValidationError(
        this.errorBuilder({message: 'timestamp-to missing from input data'})
      );
    }
    if ('duration' in staticParams) {
      this.duration = staticParams['duration'] as number;
    } else {
      throw new InputValidationError(
        this.errorBuilder({message: 'duration missing from input data'})
      );
    }
    this.timeBuckets = this.createTimeBuckets(
      this.timestampFrom,
      this.timestampTo,
      this.duration
    );

    if ('components' in staticParams) {
      this.components = staticParams['components'] as Record<
        string,
        Record<string, string>
      >;
    } else {
      throw new InputValidationError(
        this.errorBuilder({message: 'components missing from input data'})
      );
    }
    if ('generators' in staticParams) {
      this.generatorConfigs = staticParams['generators'] as object;
    } else {
      throw new InputValidationError(
        this.errorBuilder({message: 'generators missing from input data'})
      );
    }
    return this;
  }

  private createTimeBuckets(
    timestampFrom: dayjs.Dayjs,
    timestampTo: dayjs.Dayjs,
    duration: number
  ): dayjs.Dayjs[] {
    const timeBuckets: dayjs.Dayjs[] = [];
    let currTimestamp: dayjs.Dayjs = timestampFrom;
    while (
      currTimestamp.isBefore(timestampTo) ||
      currTimestamp.isSame(timestampTo, 'second')
    ) {
      timeBuckets.push(currTimestamp);
      currTimestamp = currTimestamp.add(duration, 'second');
    }
    return timeBuckets;
  }

  private createGenerators(generatorsConfig: object): Generator[] {
    const generators: Generator[] = [];
    Object.entries(generatorsConfig).forEach(([key, value]) => {
      if ('common' === key) {
        const commonGenerator = new CommonGenerator();
        commonGenerator.initialise('common-generator', value);
        generators.push(commonGenerator);
      }
      if ('randint' === key) {
        for (const fieldToPopulate in value) {
          const randIntGenerator = new RandIntGenerator();
          randIntGenerator.initialise(fieldToPopulate, value[fieldToPopulate]);
          generators.push(randIntGenerator);
        }
      }
    });
    return generators;
  }
}

export default MockObservations;
