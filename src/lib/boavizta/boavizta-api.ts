import axios from 'axios';

import {KeyValuePair} from '../../types/common';

import {ICountryCodes} from './types';

export const BoaviztaAPI = () => {
  const BASE_URL = 'https://api.boavizta.org/v1';

  /**
   * Fetches CPU output data from Boavizta API for a specific component type.
   */
  const fetchCpuOutputData = async (
    data: KeyValuePair,
    componentType: string,
    verbose: boolean
  ): Promise<object> => {
    const response = await axios.post(
      `${BASE_URL}/component/${componentType}?verbose=${verbose}&duration=${data['usage']['hours_use_time']}`,
      data
    );

    return response.data;
  };

  /**
   * Fetches cloud instance data from Boavizta API.
   */
  const fetchCloudInstanceData = async (
    dataCast: KeyValuePair,
    verbose: boolean
  ): Promise<object> => {
    const updatedDataCast = replaceHyphensWithUnderscores(dataCast);

    const response = await axios.post(
      `${BASE_URL}/cloud/instance?verbose=${verbose}&duration=${updatedDataCast['usage']['hours_use_time']}`,
      dataCast
    );
    return response.data;
  };

  /**
   * Gets the list of supported cloud instances for a given provider.
   */
  const getSupportedInstancesList = async (provider: string) => {
    const instances = await axios.get<string[]>(
      `${BASE_URL}/cloud/instance/all_instances?provider=${provider}`
    );

    return instances.data;
  };

  /**
   * Gets the list of supported cloud providers.
   */
  const getSupportedProvidersList = async (): Promise<string[]> => {
    const providers = await axios.get<string[]>(
      `${BASE_URL}/cloud/instance/all_providers`
    );

    return providers.data;
  };

  /**
   * Gets the list of supported locations by the model.
   */
  const getSupportedLocations = async (): Promise<string[]> => {
    const countries = await axios.get<ICountryCodes>(
      `${BASE_URL}/utils/country_code`
    );

    return Object.values(countries.data);
  };

  /**
   * Replaces hyphens with underscores in keys of a key-value pair object.
   */
  const replaceHyphensWithUnderscores = (data: KeyValuePair): KeyValuePair => {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key.replace(/-/g, '_'),
        value,
      ])
    );
  };

  return {
    getSupportedLocations,
    getSupportedProvidersList,
    getSupportedInstancesList,
    fetchCloudInstanceData,
    fetchCpuOutputData,
  };
};
