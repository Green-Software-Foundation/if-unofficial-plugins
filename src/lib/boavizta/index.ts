import {z} from 'zod';

import {PluginInterface} from '../../interfaces';
import {ConfigParams, PluginParams} from '../../types';

import {validate} from '../../util/validations';
import {buildErrorMessage} from '../../util/helpers';
import {ERRORS} from '../../util/errors';

import {BoaviztaBaseOutput} from './base-output';
import {BoaviztaAPI} from './boavizta-api';
import {
  BoaviztaInstanceTypes,
  BoaviztaUsageType,
  BoaviztaCpuOutputType,
  BoaviztaCloudInstanceType,
} from './types';

const {InputValidationError, UnsupportedValueError} = ERRORS;
const boaviztaAPI = BoaviztaAPI();
const baseOutput = BoaviztaBaseOutput();

export const BoaviztaCpuOutput = (
  globalConfig: ConfigParams
): PluginInterface => {
  const metadata = {kind: 'execute'};
  const componentType = 'cpu';

  /**
   * Calculates the output of the given usage.
   */
  const execute = async (inputs: PluginParams[]) => {
    const result = [];

    for await (const input of inputs) {
      const safeInput = validateInput(input);
      const metricTypeData = baseOutput.getMetricTypeData(input);
      const metricType = Object.keys(metricTypeData)[0];

      const mergedWithConfig = Object.assign(
        {},
        input,
        safeInput,
        {[metricType]: metricTypeData[metricType]},
        globalConfig
      );

      const usageResult = await baseOutput.calculateUsagePerInput(
        mergedWithConfig,
        fetchData
      );

      result.push({
        ...input,
        ...usageResult,
      });
    }

    return result;
  };

  /**
   * Fetches data from the Boavizta API for the CPU plugin.
   */
  const fetchData = async (
    input: PluginParams,
    usage: BoaviztaUsageType | undefined
  ): Promise<BoaviztaCpuOutputType> => {
    const data = Object.assign({}, input, {usage});
    const verbose = (globalConfig && globalConfig.verbose) || false;
    const response = await boaviztaAPI.fetchCpuOutputData(
      data,
      componentType,
      verbose
    );
    const result = baseOutput.formatResponse(response);
    const cpuOutputData: BoaviztaCpuOutputType = {
      'cpu/energy': result.energy,
      'carbon-embodied': result['carbon-embodied'],
    };

    return cpuOutputData;
  };

  /**
   * Validates static parameters for the CPU plugin using Zod schema.
   */
  const validateInput = (input: PluginParams) => {
    const schema = z.object({
      duration: z.number().gt(0),
      'cpu/name': z.string(),
      'cpu/number-cores': z.number(),
      'cpu/expected-lifespan': z.number().optional(),
    });

    return validate<z.infer<typeof schema>>(schema, input);
  };

  return {
    metadata,
    execute,
  };
};

export const BoaviztaCloudOutput = (
  globalConfig: ConfigParams
): PluginInterface => {
  const metadata = {kind: 'execute'};
  const instanceTypes: BoaviztaInstanceTypes = {};
  const errorBuilder = buildErrorMessage(BoaviztaCloudOutput.name);

  /**
   * Calculates the output of the given usage.
   */
  const execute = async (inputs: PluginParams[]) => {
    const result = [];

    for await (const input of inputs) {
      const safeInput = Object.assign({}, input, validateInput(input));
      const metricTypeData = baseOutput.getMetricTypeData(input);
      const metricType = Object.keys(metricTypeData)[0];
      const mergedWithConfig = Object.assign(
        {},
        input,
        safeInput,
        {[metricType]: metricTypeData[metricType]},
        globalConfig
      );

      await validateProvider(safeInput);
      await validateInstanceType(safeInput);
      await validateLocation(safeInput);

      const usageResult = await baseOutput.calculateUsagePerInput(
        mergedWithConfig,
        fetchData
      );

      result.push({
        ...input,
        ...usageResult,
      });
    }

    return result;
  };

  /**
   * Fetches data from the Boavizta API for the Cloud plugin.
   */
  const fetchData = async (
    input: PluginParams,
    usage: BoaviztaUsageType
  ): Promise<BoaviztaCloudInstanceType> => {
    const data = Object.assign({}, input, {usage});
    const verbose = (globalConfig && globalConfig.verbose) || false;
    const response = await boaviztaAPI.fetchCloudInstanceData(data, verbose);

    return baseOutput.formatResponse(response);
  };

  /**
   * Validates static parameters for the Cloud plugin using Zod schema.
   */
  const validateInput = (input: PluginParams) => {
    const schema = z.object({
      duration: z.number().gt(0),
      provider: z.string(),
      'instance-type': z.string(),
      verbose: z.boolean().optional(),
      'cpu/expected-lifespan': z.number().optional(),
    });

    return validate<z.infer<typeof schema>>(schema, input);
  };

  /**
   * Validates the provider parameter for the Cloud plugin.
   */
  const validateProvider = async (staticParams: PluginParams) => {
    const supportedProviders = await boaviztaAPI.getSupportedProvidersList();

    if (!supportedProviders.includes(staticParams.provider)) {
      const whiteListedProviders = supportedProviders.join(', ');

      throw new InputValidationError(
        errorBuilder({
          message: `Invalid 'provider' parameter '${staticParams.provider}'. Valid values are ${whiteListedProviders}`,
        })
      );
    }
  };

  /**
   * Validates the instance type parameter for the Cloud plugin.
   */
  const validateInstanceType = async (staticParams: PluginParams) => {
    const provider = staticParams.provider;

    if (!instanceTypes[provider] || instanceTypes[provider].length === 0) {
      instanceTypes[provider] =
        await boaviztaAPI.getSupportedInstancesList(provider);
    }

    if (!instanceTypes[provider].includes(staticParams['instance-type'])) {
      const whiteListedTypes = instanceTypes[provider].join(', ');

      throw new UnsupportedValueError(
        errorBuilder({
          message: `Invalid 'instance-type' parameter: '${staticParams['instance-type']}'. Valid values are : ${whiteListedTypes}`,
        })
      );
    }
  };

  /**
   * Validates the country parameter for the Cloud plugin.
   */
  const validateLocation = async (
    staticParams: PluginParams
  ): Promise<string | void> => {
    if ('country' in staticParams) {
      const countries = await boaviztaAPI.getSupportedLocations();
      const whitelistedCountries = countries.join(', ');

      if (!countries.includes(staticParams.country)) {
        throw new InputValidationError(
          errorBuilder({
            message: `Invalid country parameter country. Valid values are ${whitelistedCountries}`,
          })
        );
      }

      return staticParams.country;
    }
  };

  return {
    metadata,
    execute,
  };
};
