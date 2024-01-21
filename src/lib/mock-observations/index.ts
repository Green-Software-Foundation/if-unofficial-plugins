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
  private duration = 0;
  private timeBuckets: dayjs.Dayjs[] = [];
  private components: Record<string, Record<string, string>> = {};
  private generators: Generator[] = [];

  async execute(_inputs: ModelParams[]): Promise<any[]> {
    const observations: ModelParams[] = [];
    const generatorToHistory = new Map<Generator, number[]>();
    this.generators.forEach(generator => {
      generatorToHistory.set(generator, []);
    });
    for (const componentKey in this.components) {
      if (Object.prototype.hasOwnProperty.call(this.components, componentKey)) {
        const component = this.components[componentKey];
        for (const timeBucket of this.timeBuckets) {
          const observation = this.createObservation(
            component,
            timeBucket,
            generatorToHistory
          );
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
    const timestampFrom: dayjs.Dayjs = dayjs(
      this.getValidatedParam(
        'timestamp-from',
        staticParams
      ) as unknown as string
    );
    const timestampTo: dayjs.Dayjs = dayjs(
      this.getValidatedParam('timestamp-to', staticParams) as unknown as string
    );
    const duration = this.getValidatedParam(
      'duration',
      staticParams
    ) as unknown as number;
    this.timeBuckets = this.createTimeBuckets(
      timestampFrom,
      timestampTo,
      duration
    );
    this.components = this.getValidatedParam(
      'components',
      staticParams
    ) as Record<string, Record<string, string>>;
    this.generators = this.createGenerators(
      this.getValidatedParam('generators', staticParams)
    );
    return this;
  }

  private getValidatedParam(
    attributeName: string,
    params: {[key: string]: any}
  ): object {
    if (attributeName in params) {
      return params[attributeName];
    } else {
      throw new InputValidationError(
        this.errorBuilder({message: attributeName + ' missing from params'})
      );
    }
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

  private createObservation(
    component: Record<string, string>,
    timeBucket: dayjs.Dayjs,
    generatorToHistory: Map<Generator, number[]>
  ): ModelParams {
    const observation: ModelParams = {
      timestamp: timeBucket.format('YYYY-MM-DD HH:mm:ss'),
      duration: this.duration,
    };
    Object.assign(observation, component);
    for (const generator of this.generators) {
      const generated: Record<string, any> = generator.next(
        generatorToHistory.get(generator)
      );
      generatorToHistory.get(generator)?.push(generated.value);
      Object.assign(observation, generated);
    }
    return observation;
  }
}

export default MockObservations;
