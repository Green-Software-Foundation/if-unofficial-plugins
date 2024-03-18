import {MetricValue} from '@azure/arm-monitor';
import * as dotenv from 'dotenv';
import {z} from 'zod';

import {PluginInterface} from '../../interfaces';
import {ConfigParams, PluginParams} from '../../types/common';

import {allDefined, validate} from '../../util/validations';
import {buildErrorMessage} from '../../util/helpers';
import {ERRORS} from '../../util/errors';

import {
  AzureInputs,
  AzureOutputs,
  GetMetricsParams,
  AzureMetadataOutputs,
} from './types';
import {AzureAPI} from './azure-api';
import {ALIASES_OF_UNITS, TIME_UNITS_IN_SECONDS} from './config';

const {UnsupportedValueError, InputValidationError, ConfigValidationError} =
  ERRORS;

export const AzureImporter = (): PluginInterface => {
  const metadata = {kind: 'execute'};
  const errorBuilder = buildErrorMessage(AzureImporter.name);
  const azureAPI = new AzureAPI();

  /**
   * Executes the model for a list of input parameters.
   */
  const execute = async (inputs: PluginParams[], config?: ConfigParams) => {
    dotenv.config();

    const validatedConfig = validateConfig(config);
    let enrichedOutputsArray: PluginParams[] = [];

    for await (const input of inputs) {
      const mergedWithConfig = Object.assign(
        {},
        validateInput(input),
        validatedConfig
      );
      const azureInput = mapInputToAzureInputs(mergedWithConfig);
      const rawResults = await getVmUsage(azureInput);
      const rawMetadataResults = await getInstanceMetadata(
        azureInput.vmName,
        azureInput.resourceGroupName
      );
      mergedWithConfig['duration'] = calculateDurationPerInput(azureInput);

      enrichedOutputsArray = enrichOutputs(
        rawResults,
        rawMetadataResults,
        mergedWithConfig
      );
    }

    return enrichedOutputsArray.flat();
  };

  /**
   * Enriches the raw output and metadata results with additional information
   * and maps them to a new structure based on the PluginParams input.
   */
  const enrichOutputs = (
    rawResults: AzureOutputs,
    rawMetadataResults: AzureMetadataOutputs,
    input: PluginParams
  ) => {
    return rawResults.timestamps.map((timestamp, index) => ({
      'cloud/vendor': 'azure',
      'cpu/utilization': rawResults.cpuUtilizations[index],
      'memory/available/GB': parseFloat(rawResults.memAvailable[index]) * 1e-9,
      'memory/used/GB':
        parseFloat(rawMetadataResults.totalMemoryGB) -
        parseFloat(rawResults.memAvailable[index]) * 1e-9,
      'memory/capacity/GB': rawMetadataResults.totalMemoryGB,
      'memory/utilization':
        ((parseFloat(rawMetadataResults.totalMemoryGB) -
          parseFloat(rawResults.memAvailable[index]) * 1e-9) /
          parseFloat(rawMetadataResults.totalMemoryGB)) *
        100,
      location: rawMetadataResults.location,
      'cloud/instance-type': rawMetadataResults.instanceType,
      ...input,
      timestamp,
    }));
  };

  /**
   * Maps PluginParams input to AzureInputs structure for Azure-specific queries.
   */
  const mapInputToAzureInputs = (input: PluginParams): AzureInputs => {
    return {
      aggregation: input['azure-observation-aggregation'],
      resourceGroupName: input['azure-resource-group'],
      vmName: input['azure-vm-name'],
      subscriptionId: input['azure-subscription-id'],
      timestamp: input['timestamp']!,
      duration: input['duration'].toString(),
      window: input['azure-observation-window'],
      timespan: getTimeSpan(input['duration'], input['timestamp']!),
      interval: getInterval(input['azure-observation-window']),
    };
  };

  const validateConfig = (config?: ConfigParams) => {
    if (!config) {
      throw new ConfigValidationError(
        errorBuilder({message: 'Config must be provided'})
      );
    }

    const schema = z
      .object({
        'azure-observation-window': z.string(),
        'azure-observation-aggregation': z.string(),
        'azure-resource-group': z.string(),
        'azure-vm-name': z.string(),
        'azure-subscription-id': z.string(),
      })
      .refine(allDefined, {
        message: 'All parameters should be present.',
      });

    return validate<z.infer<typeof schema>>(schema, config);
  };

  /**
   * Checks for required fields in input.
   */
  const validateInput = (input: PluginParams) => {
    const schema = z
      .object({
        timestamp: z.string().datetime(),
        duration: z.number(),
      })
      .refine(allDefined);

    return validate<z.infer<typeof schema>>(schema, input);
  };

  /**
   * Retrieves virtual machine usage metrics from Azure based on the provided AzureInputs.
   */
  const getVmUsage = async (
    metricParams: AzureInputs
  ): Promise<AzureOutputs> => {
    const timestamps: string[] = [];
    const cpuUtils: string[] = [];
    const memAvailable: string[] = [];

    // Helper function to parse metric data and populate metricArray and timestamps.
    const parseMetrics = async (
      timeSeriesData: Promise<MetricValue[]>,
      metricArray: string[],
      metricName: string
    ) => {
      for (const data of (await timeSeriesData) ?? []) {
        if (typeof data.average !== 'undefined') {
          metricArray.push(data.average.toString());
          if (metricName === 'cpuUtilizations') {
            timestamps.push(data.timeStamp.toISOString());
          }
        }
      }
    };

    parseMetrics(getCPUMetrics(metricParams), cpuUtils, 'cpuUtilizations');
    parseMetrics(getRawMetrics(metricParams), memAvailable, '');

    return {timestamps, cpuUtilizations: cpuUtils, memAvailable};
  };

  /**
   * Gets CPU metrics by calling monitor client.
   */
  const getCPUMetrics = async (metricParams: GetMetricsParams) => {
    return azureAPI.getMetricsTimeseries(metricParams, 'Percentage CPU');
  };

  /**
   * Gets RAW metrics by calling monitor client.
   */
  const getRawMetrics = async (metricParams: GetMetricsParams) => {
    return azureAPI.getMetricsTimeseries(
      metricParams,
      'Available Memory Bytes'
    );
  };

  /**
   * Takes manifest `timestamp` and `duration` and returns an Azure formatted `timespan` value.
   */
  const getTimeSpan = (duration: number, timestamp: string): string => {
    const start = new Date(timestamp);
    const end = new Date(start.getTime() + duration * 1000);

    return `${start.toISOString()}/${end.toISOString()}`;
  };

  /**
   * Formats given `amountOfTime` according to given `unit`.
   * Throws error if given `unit` is not supported.
   */
  const timeUnitConverter = (amountOfTime: number, unit: string): string => {
    const unitsMap: {[key: string]: string} = {
      seconds: 'The minimum unit of time for azure importer is minutes',
      minutes: `T${amountOfTime}M`,
      hours: `T${amountOfTime}H`,
      days: `${amountOfTime}D`,
      weeks: `${amountOfTime}W`,
      months: `${amountOfTime}M`,
      years: `${amountOfTime}Y`,
    };

    const matchedUnit = Object.keys(unitsMap).find(key => {
      return ALIASES_OF_UNITS[key].includes(unit && unit.toLowerCase());
    });

    if (!matchedUnit) {
      throw new UnsupportedValueError(
        errorBuilder({
          message: 'azure-observation-window parameter is malformed',
        })
      );
    }

    if (matchedUnit === 'seconds') {
      throw new InputValidationError(
        errorBuilder({message: unitsMap[matchedUnit]})
      );
    }

    return unitsMap[matchedUnit];
  };

  /**
   * Takes granularity as e.g. "1 m", "1 hr" and translates into ISO8601 as expected by the azure API.
   */
  const getInterval = (window: string): string => {
    const [amountOfTime, unit] = window.split(' ', 2);
    return `P${timeUnitConverter(parseFloat(amountOfTime), unit)}`;
  };

  /**
   * Caculates total memory based on data from ComputeManagementClient response.
   */
  const calculateTotalMemory = async (
    instanceType: string,
    location: string
  ) => {
    const resourceSkusList = await azureAPI.getResourceSkus();

    const filteredMemData = resourceSkusList
      .filter(item => item.resourceType === 'virtualMachines')
      .filter(item => item.name === instanceType)
      .filter(item => item.locations !== undefined);

    const vmCapabilitiesData = filteredMemData
      .filter(
        item => item.locations !== undefined && item.locations[0] === location
      )
      .map(item => item.capabilities)[0];

    const totalMemory = vmCapabilitiesData?.find(
      item => item.name === 'MemoryGB'
    );

    return totalMemory?.value || '';
  };

  /**
   * Gathers instance metadata.
   */
  const getInstanceMetadata = async (
    vmName: string,
    resourceGroupName: string
  ): Promise<AzureMetadataOutputs> => {
    const vmData =
      await azureAPI.getVMDataByResourceGroupName(resourceGroupName);
    const [location, instanceType] = vmData
      .filter(item => item.name === vmName)
      .map(item => [
        item.location ?? 'unknown',
        item.hardwareProfile?.vmSize ?? 'unknown',
      ])[0];

    const totalMemoryGB = await calculateTotalMemory(instanceType, location);

    return {location, instanceType, totalMemoryGB};
  };

  /**
   * Calculates number of seconds covered by each individual input using `azure-time-window` value
   */
  const calculateDurationPerInput = (azureInputs: AzureInputs): number => {
    const [value, unit] = azureInputs.window.split(' ', 2);

    return parseFloat(value) * (TIME_UNITS_IN_SECONDS[unit.toLowerCase()] || 0);
  };

  return {
    metadata,
    execute,
  };
};
