import {Settings, DateTime, Duration} from 'luxon';
import {z} from 'zod';

import {ERRORS} from '../../util/errors';
import {buildErrorMessage} from '../../util/helpers';

import {KeyValuePair, PluginParams} from '../../types/common';
import {PluginInterface} from '../../interfaces';
import {validate} from '../../util/validations';

import {WattTimeParams, WattTimeRegionParams} from './types';
import {WattTimeAPI} from './watt-time-api';

const {InputValidationError} = ERRORS;
Settings.defaultZone = 'utc';

export const WattTimeGridEmissions = (): PluginInterface => {
  const metadata = {kind: 'execute'};
  const wattTimeAPI = WattTimeAPI();
  const errorBuilder = buildErrorMessage(WattTimeGridEmissions.name);
  let isWarned = false;

  /**
   * Initialize authentication with global config.
   */
  const initializeAuthentication = async () => {
    await wattTimeAPI.authenticate();
  };

  /**
   * Calculates the average emission.
   */
  const execute = async (inputs: PluginParams[]) => {
    await initializeAuthentication();
    const result = [];
    let lastValidTimestamp = inputs[0] && inputs[0].timestamp;
    const executedInputData = {
      averageEmission: 0,
      locale: '',
    };

    for await (const input of inputs) {
      const safeInput = Object.assign({}, input, validateInput(input));
      const validTimestamp = validateAndFormatTimestamp(safeInput.timestamp);
      const timestamp = validateAndFormatTimestamp(lastValidTimestamp);
      const locale = safeInput['cloud/region-wt-id'] || safeInput.geolocation;

      if (
        executedInputData.locale === locale &&
        safeInput.timestamp !== lastValidTimestamp &&
        validTimestamp.diff(timestamp, 'seconds').seconds < 300
      ) {
        result.push({
          ...input,
          'grid/carbon-intensity': executedInputData.averageEmission,
        });

        continue;
      }

      lastValidTimestamp = safeInput.timestamp;

      const wattTimeData = await getWattTimeData(safeInput);
      const inputStart = validateAndFormatTimestamp(lastValidTimestamp);
      const inputEnd = getEndTime(inputStart, safeInput.duration);
      executedInputData.locale = (safeInput['cloud/region-wt-id'] ||
        safeInput.geolocation)!;

      const data = getWattTimeDataForDuration(
        wattTimeData,
        inputStart,
        inputEnd
      );

      const totalEmission = data.reduce((a: number, b: number) => a + b, 0);
      executedInputData.averageEmission = totalEmission / data.length;

      result.push({
        ...input,
        'grid/carbon-intensity': executedInputData.averageEmission || 0,
      });
    }

    return result;
  };

  /**
   * Validates input parameters.
   */
  const validateInput = (input: PluginParams) => {
    const schema = z
      .object({
        duration: z.number().refine(value => {
          if (value < 300 && !isWarned) {
            isWarned = true;
            console.warn(
              'WARN (Watt-TIME): your timestamps are spaced less than 300s apart. The minimum resolution of the Watt-time API is 300s. To account for this, we make API requests every 300s and interpolate the values in between. To use real Watt-time data only, change your time resolution to >= 300 seconds.'
            );
          }

          return value;
        }),
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
    inputStart: DateTime,
    inputEnd: DateTime
  ) => {
    const kgMWh = 0.45359237;

    return wattTimeData.reduce((accumulator, data) => {
      const pointTimeInSeconds = DateTime.fromISO(data.point_time).toSeconds();

      if (
        pointTimeInSeconds >= inputStart.toSeconds() &&
        pointTimeInSeconds < inputEnd.toSeconds()
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
   * Retrieves data from the WattTime API based on the provided input.
   * Determines the start time and fetch duration from the inputs, and parses the geolocation.
   * Fetches data from the WattTime API for the entire duration and returns the sorted data.
   */
  const getWattTimeData = async (input: PluginParams) => {
    const {timestamp: startTime, duration} = input;
    const formatedStartTime = validateAndFormatTimestamp(startTime);
    const formatedEndTime = getEndTime(formatedStartTime, duration);

    if (input['cloud/region-wt-id']) {
      const params: WattTimeRegionParams = {
        start: formatedStartTime.toString(),
        end: formatedEndTime.toString(),
        region: input['cloud/region-wt-id'],
        signal_type: input['signal-type'],
      };

      return await wattTimeAPI.fetchDataWithRegion(params);
    }

    const {latitude, longitude} = parseLocation(input.geolocation);

    const params: WattTimeParams = {
      latitude,
      longitude,
      starttime: formatedStartTime.toString(),
      endtime: formatedEndTime.toString(),
      signal_type: input['signal-type'],
    };

    return await wattTimeAPI.fetchAndSortData(params);
  };

  /**
   * Validates timestamp format.
   */
  const validateAndFormatTimestamp = (timestamp: string) => {
    const isoDateTime = DateTime.fromISO(timestamp);
    const sqlDateTime = DateTime.fromSQL(timestamp);

    if (isoDateTime.isValid) {
      return isoDateTime;
    } else if (sqlDateTime.isValid) {
      return sqlDateTime;
    } else {
      throw new InputValidationError(
        errorBuilder({
          message: 'Timestamp is not valid date format',
        })
      );
    }
  };

  /**
   * Calculates end time with given start time and duration.
   */
  const getEndTime = (startTime: DateTime, duration: number) =>
    startTime.plus(Duration.fromObject({seconds: duration}));

  return {
    metadata,
    execute,
  };
};
