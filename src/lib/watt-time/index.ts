import axios from 'axios';
import * as dayjs from 'dayjs';

import {ERRORS} from '../../util/errors';
import {buildErrorMessage} from '../../util/helpers';

import {KeyValuePair, ModelParams} from '../../types/common';
import {ModelPluginInterface} from '../../interfaces';

const {AuthorizationError, InputValidationError, APIRequestError} = ERRORS;

interface WattTimeParams {
  latitude: number;
  longitude: number;
  starttime: string;
  endtime: dayjs.Dayjs;
}

interface LatitudeLongitude {
  latitude: number;
  longitude: number;
}

export class WattTimeGridEmissions implements ModelPluginInterface {
  token = '';
  staticParams: object | undefined;
  baseUrl = 'https://api2.watttime.org/v2';
  errorBuilder = buildErrorMessage(WattTimeGridEmissions);

  async authenticate(authParams: object): Promise<void> {
    this.token = 'token' in authParams ? (authParams['token'] as string) : '';

    if (this.token.startsWith('ENV_')) {
      this.token = process.env[this.token.slice(4)] ?? '';
    }

    if (this.token === '') {
      // Extracting username and password from authParams
      let username =
        'username' in authParams ? (authParams['username'] as string) : '';
      let password =
        'password' in authParams ? (authParams['password'] as string) : '';

      // if username or password is ENV_<env_var_name>, then extract the value from the environment variable
      if (username.startsWith('ENV_')) {
        username = process.env[username.slice(4)] ?? '';
      }

      if (password.startsWith('ENV_')) {
        password = process.env[password.slice(4)] ?? '';
      }

      //  WattTime API requires username and password / token
      if (username === '' || password === '') {
        throw new AuthorizationError(
          this.errorBuilder({
            message: 'Missing username or password & token',
            scope: 'authorization',
          })
        );
      }

      // Login to WattTime API to get a token
      const tokenResponse = await axios.get(`${this.baseUrl}/login`, {
        auth: {
          username,
          password,
        },
      });

      if (
        tokenResponse === undefined ||
        tokenResponse.data === undefined ||
        !('token' in tokenResponse.data)
      ) {
        throw new AuthorizationError(
          this.errorBuilder({
            message: 'Missing token in response. Invalid credentials provided.',
            scope: 'authorization',
          })
        );
      }

      this.token = tokenResponse.data.token;
    }
  }

  async execute(inputs: ModelParams[]): Promise<ModelParams[]> {
    // validate inputs for location data + timestamp + duration
    this.validateinputs(inputs);
    // determine the earliest start and total duration of all input blocks
    const {startTime, fetchDuration} = this.determineinputStartEnd(inputs);

    /**
     * Fetch data from WattTime API for the entire duration
     * @todo Check watt time data should be fetched for each input or not.
     */
    const wattimedata = await this.fetchData({
      ...inputs[0],
      timestamp: startTime.format(),
      duration: fetchDuration,
    });


    // for each input block, calculate the average emission
    return inputs.map((input, index) => {
      const inputStart = dayjs(input.timestamp);
      const inputEnd = inputStart.add(input.duration, 'seconds');
      const {datapoints, data} = this.getWattTimeDataForDuration(
        wattimedata,
        inputStart,
        inputEnd
      );
      const emissionSum = data.reduce((a: number, b: number) => a + b, 0);

      if (datapoints === 0) {
        throw new InputValidationError(
          this.errorBuilder({
            message: `Did not receive data from WattTime API for the input[${index}] block`,
          })
        );
      }

      input['grid-carbon-intensity'] = emissionSum / datapoints;

      return input;
    });
  }

  private getWattTimeDataForDuration(
    wattimedata: KeyValuePair[],
    inputStart: dayjs.Dayjs,
    inputEnd: dayjs.Dayjs
  ): { datapoints: number; data: number[] } {
    let datapoints = 0;

    const data = wattimedata.map((data: KeyValuePair) => {
      // WattTime API returns full data for the entire duration.
      // if the data point is before the input start, ignore it
      if (dayjs(data.point_time).isBefore(inputStart)) {
        return 0;
      }
      // if the data point is after the input end, ignore it.
      // if the data point is exactly the same as the input end, ignore it
      if (
        dayjs(data.point_time).isAfter(inputEnd) ||
        dayjs(data.point_time).format() === dayjs(inputEnd).format()
      ) {
        return 0;
      }
      // lbs/MWh to Kg/MWh by dividing by 0.453592 (0.453592 Kg/lbs)
      // (Kg/MWh == g/kWh)
      // convert to kg/KWh by dividing by 1000. (1MWh = 1000KWh)
      // convert to g/KWh by multiplying by 1000. (1Kg = 1000g)
      // hence each other cancel out and g/KWh is the same as kg/MWh
      const grid_emission = data.value / 0.45359237;
      datapoints += 1;
      return grid_emission;
    });

    return {datapoints, data};
  }

  private validateinputs(inputs: ModelParams[]) {
    inputs.forEach((input: ModelParams, index) => {
      if ('location' in input) {
        const {latitude, longitude} = this.getLatitudeLongitudeFrominput(input);

        if (isNaN(latitude) || isNaN(longitude)) {
          throw new InputValidationError(
            this.errorBuilder({
              message: `'latitude' or 'longitude' from input[${index}] is not a number`,
            })
          );
        }
      }
    });
  }

  private getLatitudeLongitudeFrominput(input: ModelParams): LatitudeLongitude {
    const location = input['location'].split(','); //split location into latitude and longitude
    if (location.length !== 2) {
      throw new InputValidationError(
        this.errorBuilder({
          message:
            '\'location\' should be a comma separated string of \'latitude\' and \'longitude\'',
        })
      );
    }

    if (location[0] === '' || location[1] === '') {
      throw new InputValidationError(
        this.errorBuilder({
          message: '\'latitude\' or \'longitude\' is missing',
        })
      );
    }

    if (location[0] === '0' || location[1] === '0') {
      throw new InputValidationError(
        this.errorBuilder({
          message: '\'latitude\' or \'longitude\' is missing',
        })
      );
    }

    const latitude = parseFloat(location[0]); //convert latitude to float
    const longitude = parseFloat(location[1]); //convert longitude to float

    return {latitude, longitude};
  }

  private determineinputStartEnd(inputs: ModelParams[]): { startTime: dayjs.Dayjs, fetchDuration: number } {
    let starttime = dayjs('9999-12-31'); // largest possible start time
    let endtime = dayjs('1970-01-01'); // smallest possible end time

    inputs.forEach((input: ModelParams) => {
      const duration = input.duration;

      // if the input timestamp is before the current starttime, set it as the new starttime
      starttime = dayjs(input.timestamp).isBefore(starttime)
        ? dayjs(input.timestamp)
        : starttime;
      // if the input timestamp + duration is after the current endtime, set it as the new endtime
      endtime = dayjs(input.timestamp).add(duration, 'seconds').isAfter(endtime)
        ? dayjs(input.timestamp).add(duration, 'seconds')
        : endtime;
    });

    const fetchDuration = endtime.diff(starttime, 'seconds');

    // WattTime API only supports up to 32 days
    if (fetchDuration > 32 * 24 * 60 * 60 /** 32 days */) {
      throw new InputValidationError(
        this.errorBuilder({
          message: `WattTime API supports up to 32 days. Duration of ${fetchDuration} seconds is too long`,
        })
      );
    }

    return {startTime: starttime, fetchDuration};
  }

  async fetchData(input: ModelParams): Promise<KeyValuePair[]> {
    const duration = input.duration;

    const {latitude, longitude} = this.getLatitudeLongitudeFrominput(input);

    const params: WattTimeParams = {
      latitude: latitude,
      longitude: longitude,
      starttime: dayjs(input.timestamp).format('YYYY-MM-DDTHH:mm:ssZ'),
      endtime: dayjs(input.timestamp).add(duration, 'seconds'),
    };

    const result = await axios
      .get(`${this.baseUrl}/data`, {
        params,
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      })
      .catch(error => {
        throw new APIRequestError(
          this.errorBuilder({
            message: `Error fetching data from WattTime API. ${JSON.stringify(
              error
            )}`,
          })
        );
      });

    if (result.status !== 200) {
      throw new APIRequestError(
        this.errorBuilder({
          message: `Error fetching data from WattTime API: ${JSON.stringify(
            result.status
          )}`,
        })
      );
    }

    if (!('data' in result) || !Array.isArray(result.data)) {
      throw new APIRequestError(
        this.errorBuilder({
          message: 'Invalid response from WattTime API',
        })
      );
    }

    return result.data.sort((a: any, b: any) => {
      return dayjs(a.point_time).unix() > dayjs(b.point_time).unix() ? 1 : -1;
    });
  }

  async configure(
    staticParams: object | undefined
  ): Promise<ModelPluginInterface> {
    this.staticParams = staticParams;

    if (!staticParams) {
      throw new Error('Missing staticParams');
    }

    await this.authenticate(staticParams);

    if ('baseUrl' in staticParams) {
      this.baseUrl = staticParams['baseUrl'] as string;
    }

    return this;
  }
}
