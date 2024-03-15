import {KeyValuePair, PluginParams} from '../../types/common';
import {buildErrorMessage} from '../../util/helpers';
import {ERRORS} from '../../util/errors';

const {InputValidationError} = ERRORS;

export const BoaviztaBaseOutput = () => {
  const METRIC_TYPES = ['cpu/utilization', 'gpu-util', 'ram-util'] as const;
  const expectedLifespan: number = 4 * 365 * 24 * 60 * 60;
  const errorBuilder = buildErrorMessage(BoaviztaBaseOutput.name);

  /**
   * Converts the usage from manifest input to the format required by Boavizta API.
   */
  const transformToBoaviztaUsage = (input: PluginParams) => {
    const metricType = validateMetricType(input);

    // duration is in seconds, convert to hours
    // metric is between 0 and 1, convert to percentage
    const usageInput: KeyValuePair = {
      hours_use_time: input['duration'] / 3600.0,
      time_workload: [input[metricType]],
    };

    // convert expected lifespan from seconds to years
    const expectedLifeTime =
      (input['cpu/expected-lifespan'] || expectedLifespan) /
      (365.0 * 24.0 * 60.0 * 60.0);

    usageInput['years_life_time'] = expectedLifeTime;

    return addLocationToUsage(input, usageInput);
  };

  /**
   * Adds country to usage if country is defined in sharedParams.
   */
  const addLocationToUsage = (input: PluginParams, usageRaw: KeyValuePair) => {
    if ('country' in input) {
      usageRaw['usage_location'] = input['country'];
    }

    return usageRaw;
  };

  /**
   * Formats the response by converting units and extracting relevant data.
   * Coverts the embodied carbon value from kgCO2eq to gCO2eq, defaulting to 0 if 'impacts' is not present.
   * Converts the energy value from J to kWh, defaulting to 0 if 'impacts' is not present.
   * 1,000,000 J / 3600 = 277.7777777777778 Wh.
   * 1 MJ / 3.6 = 0.278 kWh
   */
  const formatResponse = (data: KeyValuePair) => {
    const impactsInData = 'impacts' in data;
    const embodiedCarbon = impactsInData
      ? data.impacts.gwp.embedded.value * 1000
      : 0;
    const energy = impactsInData ? data.impacts.pe.use.value / 3.6 : 0;

    return {'carbon-embodied': embodiedCarbon, energy};
  };

  /**
   * Get the provided metric type in input.
   */
  const getMetricType = (input: PluginParams) =>
    METRIC_TYPES.find(key => key in input);

  /**
   * Validates metric type.
   */
  const validateMetricType = (input: PluginParams) => {
    const metricType = getMetricType(input);
    if (!metricType) {
      throw new InputValidationError(
        errorBuilder({
          message: `One of these ${METRIC_TYPES} parameters should be provided in the input`,
        })
      );
    }

    return metricType;
  };
  /**
   * Gets metric type data if provided in the input.
   */
  const getMetricTypeData = (input: PluginParams) => {
    const metricType = validateMetricType(input);

    const metricTypeValue =
      metricType === 'cpu/utilization'
        ? {
            load_percentage: input['cpu/utilization'],
            time_percentage: 100,
          }
        : input[metricType];

    return {
      [metricType]: metricTypeValue,
    };
  };

  /**
   * Converts the usage to the format required by Boavizta API.
   */
  const calculateUsagePerInput = async (
    input: PluginParams,
    fetchData: Function
  ) => {
    const {hours_use_time, time_workload, years_life_time, usage_location} =
      transformToBoaviztaUsage(input);

    return fetchData(input, {
      hours_use_time,
      time_workload,
      years_life_time,
      usage_location,
    });
  };

  return {
    formatResponse,
    calculateUsagePerInput,
    getMetricTypeData,
  };
};
