import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import {z} from 'zod';

import {ERRORS} from '../../util/errors';
import {buildErrorMessage} from '../../util/helpers';

import {ConfigParams, KeyValuePair, PluginParams} from '../../types/common';
import {PluginInterface} from '../../interfaces';
import {validate} from '../../util/validations';

import {WattTimeParams, WattTimeRegionParams} from './types';
import {WattTimeAPI} from './watt-time-api';

dayjs.extend(utc);
dayjs.extend(timezone);

const {InputValidationError} = ERRORS;

export const WattTimeGridEmissions = (
  globalConfig?: ConfigParams
): PluginInterface => {
  const metadata = {kind: 'execute'};
  const wattTimeAPI = WattTimeAPI();
  const errorBuilder = buildErrorMessage(WattTimeGridEmissions.name);

  /**
   * Initialize authentication with global config.
   */
  const initializeAuthentication = async () => {
    validateConfig();

    await wattTimeAPI.authenticate();
  };

  /**
   * Calculates the average emission.
   */
  const execute = async (inputs: PluginParams[]) => {
    await initializeAuthentication();

    const wattTimeData = await getWattTimeData(inputs);

    return inputs.map(input => {
      const safeInput = Object.assign({}, input, validateInput(input));
      const inputStart = dayjs(safeInput.timestamp);
      const inputEnd = inputStart.add(safeInput.duration, 'seconds');

      const data = getWattTimeDataForDuration(
        wattTimeData,
        inputStart,
        inputEnd
      );

      const totalEmission = data.reduce((a: number, b: number) => a + b, 0);
      const result = totalEmission / data.length;

      return {
        ...input,
        'grid/carbon-intensity': result || 0,
      };
    });
  };

  /**
   * Validates input parameters.
   */
  const validateInput = (input: PluginParams) => {
    const schema = z
      .object({
        duration: z.number(),
        timestamp: z.string(),
        geolocation: z
          .string()
          .regex(new RegExp('^\\-?\\d{1,3}\\.\\d+,-?\\d{1,3}\\.\\d+$'), {
            message:
              'not a comma-separated string consisting of `latitude` and `longitude`',
          })
          .optional(),
        'cloud/region-wt-id': z.string().optional(),
        'cloud/region-geolocation': z.string().optional(),
        'signal-type': z.string().optional(),
      })
      .refine(
        data => {
          const {
            geolocation,
            'cloud/region-wt-id': regionWtId,
            'cloud/region-geolocation': regionGeolocation,
          } = data;
          return geolocation || regionWtId || regionGeolocation;
        },
        {
          message:
            'at least one of `geolocation`, `cloud/region-wt-id`, or `cloud/region-geolocation` parameters should be provided.',
        }
      );

    if (input['cloud/region-geolocation']) {
      input.geolocation = input['cloud/region-geolocation'];
    }

    return validate<z.infer<typeof schema>>(schema, input);
  };

  /**
   * lbs/MWh to Kg/MWh by dividing by 0.453592 (0.453592 Kg/lbs)
   * (Kg/MWh == g/kWh)
   * convert to kg/KWh by dividing by 1000. (1MWh = 1000KWh)
   * convert to g/KWh by multiplying by 1000. (1Kg = 1000g)
   * hence each other cancel out and g/KWh is the same as kg/MWh
   */
  const getWattTimeDataForDuration = (
    wattTimeData: KeyValuePair[],
    inputStart: dayjs.Dayjs,
    inputEnd: dayjs.Dayjs
  ) => {
    const kgMWh = 0.45359237;
    const formatedInputStart = dayjs.tz(inputStart, 'UTC').format();
    const formatedInputEnd = dayjs.tz(inputEnd, 'UTC').format();

    return wattTimeData.reduce((accumulator, data) => {
      /* WattTime API returns full data for the entire duration.
       * if the data point is before the input start, ignore it.
       * if the data point is after the input end, ignore it.
       * if the data point is exactly the same as the input end, ignore it
       */
      if (
        !dayjs(data.point_time).isBefore(formatedInputStart) &&
        !dayjs(data.point_time).isAfter(formatedInputEnd) &&
        dayjs(data.point_time).format() !== dayjs(formatedInputEnd).format()
      ) {
        accumulator.push(data.value / kgMWh);
      }

      return accumulator;
    }, []);
  };

  /**
   * Parses the geolocation string from the input data to extract latitude and longitude.
   * Throws an InputValidationError if the geolocation string is invalid.
   */
  const parseLocation = (
    geolocation: string
  ): {
    latitude: number;
    longitude: number;
  } => {
    const [latitude, longitude] = geolocation.split(',');

    return {latitude: parseFloat(latitude), longitude: parseFloat(longitude)};
  };

  /**
   * Retrieves data from the WattTime API based on the provided inputs.
   * Determines the start time and fetch duration from the inputs, and parses the geolocation.
   * Fetches data from the WattTime API for the entire duration and returns the sorted data.
   */
  const getWattTimeData = async (inputs: PluginParams[]) => {
    const {startTime, fetchDuration} = calculateStartDurationTime(inputs);

    const formatedStartTime = dayjs.tz(startTime, 'UTC').format();
    const formatEndTime = dayjs
      .tz(startTime, 'UTC')
      .add(fetchDuration, 'seconds')
      .format();

    if (inputs[0]['cloud/region-wt-id']) {
      const params: WattTimeRegionParams = {
        start: formatedStartTime,
        end: formatEndTime,
        region: inputs[0]['cloud/region-wt-id'],
        signal_type: inputs[0]['signal-type'],
      };

      return await wattTimeAPI.fetchDataWithRegion(params);
    }

    const {latitude, longitude} = parseLocation(inputs[0].geolocation);

    const params: WattTimeParams = {
      latitude,
      longitude,
      starttime: formatedStartTime,
      endtime: formatEndTime,
    };

    return await wattTimeAPI.fetchAndSortData(params);
  };

  /**
   * Calculates the start time and fetch duration based on the provided inputs.
   * Iterates through the inputs to find the earliest start time and latest end time.
   * Calculates the fetch duration based on the time range.
   * Throws an InputValidationError if the fetch duration exceeds the maximum supported by the WattTime API.
   *
   */
  const calculateStartDurationTime = (
    inputs: PluginParams[]
  ): {
    startTime: dayjs.Dayjs;
    fetchDuration: number;
  } => {
    const {startTime, endtime} = inputs.reduce(
      (acc, input) => {
        const safeInput = validateInput(input);
        const {duration, timestamp} = safeInput;
        const dayjsTimestamp = dayjs.tz(timestamp, 'UTC');
        const startTime = dayjsTimestamp.isBefore(acc.startTime)
          ? dayjsTimestamp
          : acc.startTime;
        const durationInSeconds = dayjsTimestamp.add(duration, 'seconds');
        const endTime = durationInSeconds.isAfter(acc.endtime)
          ? durationInSeconds
          : acc.endtime;

        return {startTime: startTime, endtime: endTime};
      },
      {startTime: inputs[0].timestamp, endtime: inputs[0].timestamp}
    );

    const fetchDuration = endtime.diff(startTime, 'seconds');

    // WattTime API only supports up to 32 days
    if (fetchDuration > 32 * 24 * 60 * 60) {
      throw new InputValidationError(
        errorBuilder({
          message: `WattTime API supports up to 32 days. Duration of ${fetchDuration} seconds is too long`,
        })
      );
    }

    return {startTime: startTime, fetchDuration};
  };

  /**
   * Validates static parameters.
   */
  const validateConfig = () => {
    const WATT_TIME_USERNAME = process.env.WATT_TIME_USERNAME;
    const WATT_TIME_PASSWORD = process.env.WATT_TIME_PASSWORD;

    const schema = z.object({
      WATT_TIME_USERNAME: z.string({
        required_error: 'not provided in .env file of `IF` root directory',
      }),
      WATT_TIME_PASSWORD: z.string().min(1, {
        message: 'not provided in .env file of `IF` root directory',
      }),
    });

    return validate<z.infer<typeof schema>>(schema, {
      ...(globalConfig || {}),
      WATT_TIME_USERNAME,
      WATT_TIME_PASSWORD,
    });
  };

  return {
    metadata,
    execute,
  };
};
