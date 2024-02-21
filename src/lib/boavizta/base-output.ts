import {KeyValuePair, PluginParams} from '../../types/common';

import {BoaviztaUsageType} from './types';

export const BoaviztaBaseOutput = () => {
  const metricType: 'cpu/utilization' | 'gpu-util' | 'ram-util' =
    'cpu/utilization';
  const expectedLifespan: number = 4 * 365 * 24 * 60 * 60;

  /**
   * Converts the usage from IMPL input to the format required by Boavizta API.
   */
  const transformToBoaviztaUsage = (
    input: PluginParams,
    metricType: string
  ) => {
    // duration is in seconds, convert to hours
    // metric is between 0 and 1, convert to percentage
    const usageInput: KeyValuePair = {
      hours_use_time: input['duration'] / 3600.0,
      time_workload: input[metricType],
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

    return {'embodied-carbon': embodiedCarbon, energy};
  };

  /**
   * Converts the usage to the format required by Boavizta API.
   */
  const calculateUsagePerInput = async (
    input: PluginParams,
    fetchData: Function
  ) => {
    const usageInput = transformToBoaviztaUsage(input, metricType);

    const usage: BoaviztaUsageType = {
      hours_use_time: usageInput.hours_use_time,
      time_workload: usageInput.time_workload,
      years_life_time: usageInput.years_life_time,
      usage_location: usageInput.usage_location,
    };

    return fetchData(input, usage);
  };

  return {
    formatResponse,
    calculateUsagePerInput,
  };
};
