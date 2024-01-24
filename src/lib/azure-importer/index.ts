import {MetricValue} from '@azure/arm-monitor';
import * as dotenv from 'dotenv';
import {z} from 'zod';

import {ModelPluginInterface} from '../../interfaces';
import {ModelParams} from '../../types/common';

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
import {TIME_UNITS_IN_SECONDS} from './config';

const {UnsupportedValueError, InputValidationError} = ERRORS;

export class AzureImporterModel implements ModelPluginInterface {
  errorBuilder = buildErrorMessage(this.constructor.name);
  azureAPI = new AzureAPI();

  /**
   * Configures the Azure Importer Plugin.
   */
  public async configure(): Promise<ModelPluginInterface> {
    return this;
  }

  /**
   * Executes the model for a list of input parameters.
   */
  public async execute(inputs: ModelParams[]): Promise<ModelParams[]> {
    dotenv.config();

    let enrichedOutputsArray: ModelParams[] = [];

    for await (const input of inputs) {
      const safeInput = Object.assign(input, this.validateInput(input));
      const azureInput = this.mapInputToAzureInputs(safeInput);
      const rawResults = await this.getVmUsage(azureInput);
      const rawMetadataResults = await this.getInstanceMetadata(
        azureInput.vmName,
        azureInput.resourceGroupName
      );
      safeInput['duration'] = this.calculateDurationPerInput(azureInput);

      enrichedOutputsArray = this.enrichOutputs(
        rawResults,
        rawMetadataResults,
        safeInput
      );
    }

    return enrichedOutputsArray.flat();
  }

  /**
   * Enriches the raw output and metadata results with additional information
   * and maps them to a new structure based on the ModelParams input.
   */
  private enrichOutputs(
    rawResults: AzureOutputs,
    rawMetadataResults: AzureMetadataOutputs,
    input: ModelParams
  ) {
    return rawResults.timestamps.map((timestamp, index) => ({
      'cloud-vendor': 'azure',
      'cpu-util': rawResults.cpu_utils[index],
      'mem-availableGB': parseFloat(rawResults.memAvailable[index]) * 1e-9,
      'mem-usedGB':
        parseFloat(rawMetadataResults.totalMemoryGB) -
        parseFloat(rawResults.memAvailable[index]) * 1e-9,
      'total-memoryGB': rawMetadataResults.totalMemoryGB,
      'mem-util':
        ((parseFloat(rawMetadataResults.totalMemoryGB) -
          parseFloat(rawResults.memAvailable[index]) * 1e-9) /
          parseFloat(rawMetadataResults.totalMemoryGB)) *
        100,
      location: rawMetadataResults.location,
      'cloud-instance-type': rawMetadataResults.instanceType,
      ...input,
      timestamp,
    }));
  }

  /**
   * Maps ModelParams input to AzureInputs structure for Azure-specific queries.
   */
  private mapInputToAzureInputs(input: ModelParams): AzureInputs {
    return {
      aggregation: input['azure-observation-aggregation'],
      resourceGroupName: input['azure-resource-group'],
      vmName: input['azure-vm-name'],
      subscriptionId: input['azure-subscription-id'],
      timestamp: input['timestamp'],
      duration: input['duration'].toString(),
      window: input['azure-observation-window'],
      timespan: this.getTimeSpan(input['duration'], input['timestamp']),
      interval: this.getInterval(input['azure-observation-window']),
    };
  }

  /**
   * Checks for required fields in input.
   */
  private validateInput(input: ModelParams) {
    const schema = z
      .object({
        'azure-observation-window': z.string(),
        'azure-observation-aggregation': z.string(),
        'azure-resource-group': z.string(),
        'azure-vm-name': z.string(),
        'azure-subscription-id': z.string(),
        timestamp: z.string().datetime(),
        duration: z.number(),
      })
      .refine(allDefined, {
        message: 'All parameters should be present.',
      });

    return validate<z.infer<typeof schema>>(schema, input);
  }

  /**
   * Retrieves virtual machine usage metrics from Azure based on the provided AzureInputs.
   */
  private async getVmUsage(metricParams: AzureInputs): Promise<AzureOutputs> {
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
          if (metricName === 'cpu_utils') {
            timestamps.push(data.timeStamp.toISOString());
          }
        }
      }
    };

    parseMetrics(this.getCPUMetrics(metricParams), cpuUtils, 'cpu_utils');
    parseMetrics(this.getRawMetrics(metricParams), memAvailable, '');

    return {timestamps, cpu_utils: cpuUtils, memAvailable};
  }

  /**
   * Gets CPU metrics by calling monitor client.
   */
  private async getCPUMetrics(metricParams: GetMetricsParams) {
    return this.azureAPI.getMetricsTimeseries(metricParams, 'Percentage CPU');
  }

  /**
   * Gets RAW metrics by calling monitor client.
   */
  private async getRawMetrics(metricParams: GetMetricsParams) {
    return this.azureAPI.getMetricsTimeseries(
      metricParams,
      'Available Memory Bytes'
    );
  }

  /**
   * Takes impl `timestamp` and `duration` and returns an Azure formatted `timespan` value.
   */
  private getTimeSpan(duration: number, timestamp: string): string {
    const start = new Date(timestamp);
    const end = new Date(start.getTime() + duration * 1000);

    return `${start.toISOString()}/${end.toISOString()}`;
  }

  /**
   * Formats given `amountOfTime` according to given `unit`.
   * Throws error if given `unit` is not supported.
   */
  private timeUnitConverter(amountOfTime: number, unit: string): string {
    const unitsMap: {[key: string]: string} = {
      seconds: 'The minimum unit of time for azure importer is minutes',
      minutes: `T${amountOfTime}M`,
      hours: `T${amountOfTime}H`,
      days: `${amountOfTime}D`,
      weeks: `${amountOfTime}W`,
      months: `${amountOfTime}M`,
      years: `${amountOfTime}Y`,
    };

    const aliases: {[key: string]: string[]} = {
      seconds: ['second', 'secs', 'sec', 's'],
      minutes: ['m', 'min', 'mins'],
      hours: ['hour', 'h', 'hr', 'hrs'],
      days: ['d'],
      weeks: ['week', 'wk', 'w', 'wks'],
      months: ['mth'],
      years: ['yr', 'yrs', 'y', 'ys'],
    };
    const matchedUnit = Object.keys(unitsMap).find(key => {
      return aliases[key].includes(unit && unit.toLowerCase());
    });

    if (!matchedUnit) {
      throw new UnsupportedValueError(
        this.errorBuilder({
          message: 'azure-observation-window parameter is malformed',
        })
      );
    }

    if (matchedUnit === 'seconds') {
      throw new InputValidationError(
        this.errorBuilder({message: unitsMap[matchedUnit]})
      );
    }

    return unitsMap[matchedUnit];
  }

  /**
   * Takes granularity as e.g. "1 m", "1 hr" and translates into ISO8601 as expected by the azure API.
   */
  private getInterval(window: string): string {
    const [amountOfTime, unit] = window.split(' ', 2);
    return `P${this.timeUnitConverter(parseFloat(amountOfTime), unit)}`;
  }

  /**
   * Caculates total memory based on data from ComputeManagementClient response.
   */
  private async calculateTotalMemory(instanceType: string, location: string) {
    const resourceSkusList = await this.azureAPI.getResourceSkus();

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
  }

  /**
   * Gathers instance metadata.
   */
  private async getInstanceMetadata(
    vmName: string,
    resourceGroupName: string
  ): Promise<AzureMetadataOutputs> {
    const vmData =
      await this.azureAPI.getVMDataByResourceGroupName(resourceGroupName);
    const [location, instanceType] = vmData
      .filter(item => item.name === vmName)
      .map(item => [
        item.location ?? 'unknown',
        item.hardwareProfile?.vmSize ?? 'unknown',
      ])[0];

    const totalMemoryGB = await this.calculateTotalMemory(
      instanceType,
      location
    );

    return {location, instanceType, totalMemoryGB};
  }

  /**
   * Calculates number of seconds covered by each individual input using `azure-time-window` value
   */
  private calculateDurationPerInput(azureInputs: AzureInputs): number {
    const [value, unit] = azureInputs.window.split(' ', 2);

    return parseFloat(value) * (TIME_UNITS_IN_SECONDS[unit.toLowerCase()] || 0);
  }
}
