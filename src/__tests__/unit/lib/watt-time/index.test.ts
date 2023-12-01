import {describe, expect, jest, test} from '@jest/globals';
import {WattTimeGridEmissions} from '../../../../lib';
import * as DATA from '../../../../__mocks__/watt-time/data.json';
import axios from 'axios';

jest.setTimeout(30000);

jest.mock('axios');
const mockAxios = axios as jest.Mocked<typeof axios>;
// Mock out all top level functions, such as get, put, delete and post:
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
mockAxios.get.mockImplementation((url, data) => {
  switch (url) {
    case 'https://api2.watttime.org/v2/login':
      if (
        data?.auth?.username === 'test1' &&
        data?.auth?.password === 'test2'
      ) {
        return Promise.resolve({
          status: 200,
          data: {
            token: 'test_token',
          },
        });
      } else {
        return Promise.resolve({
          status: 401,
          data: {},
        });
      }
    case 'https://apifail.watttime.org/v2/login':
      if (
        data?.auth?.username === 'test1' &&
        data?.auth?.password === 'test2'
      ) {
        return Promise.resolve({
          status: 200,
          data: {
            token: 'test_token',
          },
        });
      } else {
        return Promise.resolve({
          status: 401,
          data: {},
        });
      }
    case 'https://apifail2.watttime.org/v2/login':
      return Promise.resolve({
        status: 200,
        data: {
          token: 'test_token',
        },
      });
    case 'https://apifail3.watttime.org/v2/login':
      return Promise.resolve({
        status: 200,
        data: {
          token: 'test_token',
        },
      });
    case 'https://api2.watttime.org/v2/data':
      return Promise.resolve({
        data: DATA,
        status: 200,
      });
    case 'https://apifail.watttime.org/v2/data':
      return Promise.resolve({
        status: 400,
        data: {},
      });
    case 'https://apifail2.watttime.org/v2/data':
      return Promise.resolve({
        status: 200,
        data: {
          none: {},
        },
      });
    case 'https://apifail3.watttime.org/v2/data':
      return Promise.reject({
        status: 401,
        data: {
          none: {},
        },
      });
  }
});
describe('watt-time:configure test', () => {
  test('initialize without configurations throws error', async () => {
    await expect(
      new WattTimeGridEmissions().configure(undefined)
    ).rejects.toThrow();
  });
  test('initialize with wrong credentials throw error', async () => {
    await expect(
      new WattTimeGridEmissions().configure({
        username: 'test1',
        password: 'test1',
      })
    ).rejects.toThrow();
  });
  test('initialize without either username / password throws error', async () => {
    await expect(
      new WattTimeGridEmissions().configure({
        password: 'test1',
      })
    ).rejects.toThrow();
    await expect(
      new WattTimeGridEmissions().configure({
        username: 'test1',
      })
    ).rejects.toThrow();
  });
  test('initialize with wrong username / password throws error', async () => {
    const modelFail = await new WattTimeGridEmissions().configure({
      baseUrl: 'https://apifail.watttime.org/v2',
      username: 'test1',
      password: 'test2',
    });
    await expect(
      modelFail.execute([
        {
          location: '37.7749,-122.4194',
          timestamp: '2021-01-01T00:00:00Z',
          duration: 360,
        },
      ])
    ).rejects.toThrow();
  });
  test('initialize with undefined environment variables throw error', async () => {
    await expect(
      new WattTimeGridEmissions().configure({
        username: 'ENV_WATT_USERNAME',
        password: 'ENV_WATT_PASSWORD',
      })
    ).rejects.toThrow();
    await expect(
      new WattTimeGridEmissions().configure({
        token: 'ENV_WATT_TOKEN',
      })
    ).rejects.toThrow();
  });

  test('throws error if watttime api returns wrong data', async () => {
    const model = await new WattTimeGridEmissions().configure({
      username: 'test1',
      password: 'test2',
    });

    // data is not enough to proceed with computation
    await expect(
      model.execute([
        {
          location: '37.7749,-122.4194',
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
        },
        {
          location: '37.7749,-122.4194',
          timestamp: '2021-01-02T01:00:00Z',
          duration: 3600,
        },
      ])
    ).rejects.toThrow();
  });
  test('throws error if wrong location is provided', async () => {
    const model = await new WattTimeGridEmissions().configure({
      username: 'test1',
      password: 'test2',
    });
    await expect(
      model.execute([
        {
          location: '0,-122.4194',
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
        },
      ])
    ).rejects.toThrow();
    await expect(
      model.execute([
        {
          location: '0,',
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
        },
      ])
    ).rejects.toThrow();
    await expect(
      model.execute([
        {
          location: '',
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
        },
      ])
    ).rejects.toThrow();
    await expect(
      model.execute([
        {
          location: 'gsf,ief',
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
        },
      ])
    ).rejects.toThrow();
  });
  test('throws error if no data is returned by API', async () => {
    const modelFail2 = await new WattTimeGridEmissions().configure({
      username: 'test1',
      password: 'test2',
      baseUrl: 'https://apifail2.watttime.org/v2',
    });
    await expect(
      modelFail2.execute([
        {
          location: '37.7749,-122.4194',
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
        },
        {
          location: '37.7749,-122.4194',
          timestamp: '2021-01-02T01:00:00Z',
          duration: 3600,
        },
      ])
    ).rejects.toThrow();
  });
  test('throws error if unauthorized error occurs during data fetch', async () => {
    const modelFail3 = await new WattTimeGridEmissions().configure({
      username: 'test1',
      password: 'test2',
      baseUrl: 'https://apifail3.watttime.org/v2',
    });
    await expect(
      modelFail3.execute([
        {
          location: '37.7749,-122.4194',
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
        },
        {
          location: '37.7749,-122.4194',
          timestamp: '2021-01-02T01:00:00Z',
          duration: 3600,
        },
      ])
    ).rejects.toThrow();
    await expect(
      modelFail3.execute([
        {
          location: '37.7749,-122.4194',
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
        },
        {
          location: '37.7749,-122.4194',
          timestamp: '2021-01-15T01:00:00Z',
          duration: 3600,
        },
        {
          location: '37.7749,-122.4194',
          timestamp: '2021-01-02T01:00:00Z',
          duration: 3600,
        },
      ])
    ).rejects.toThrow();
  });

  test('proper initialization and test', async () => {
    const model = await new WattTimeGridEmissions().configure({
      username: 'test1',
      password: 'test2',
    });
    expect(model).toBeInstanceOf(WattTimeGridEmissions);
    await expect(
      model.execute([
        {
          location: '37.7749,-122.4194',
          timestamp: '2021-01-01T00:00:00Z',
          duration: 1200,
        },
      ])
    ).resolves.toStrictEqual([
      {
        location: '37.7749,-122.4194',
        timestamp: '2021-01-01T00:00:00Z',
        duration: 1200,
        'grid-carbon-intensity': 2185.332173907599,
      },
    ]);
    await expect(
      model.execute([
        {
          location: '37.7749,-122.4194',
          timestamp: '2021-01-01T00:00:00Z',
          duration: 120,
        },
      ])
    ).resolves.toStrictEqual([
      {
        location: '37.7749,-122.4194',
        timestamp: '2021-01-01T00:00:00Z',
        duration: 120,
        'grid-carbon-intensity': 2198.0087539832293,
      },
    ]);
    await expect(
      model.execute([
        {
          location: '37.7749,-122.4194',
          timestamp: '2021-01-01T00:00:00Z',
          duration: 300,
        },
      ])
    ).resolves.toStrictEqual([
      {
        location: '37.7749,-122.4194',
        timestamp: '2021-01-01T00:00:00Z',
        duration: 300,
        'grid-carbon-intensity': 2198.0087539832293,
      },
    ]);
    await expect(
      model.execute([
        {
          location: '37.7749,-122.4194',
          timestamp: '2021-01-01T00:00:00Z',
          duration: 360,
        },
      ])
    ).resolves.toStrictEqual([
      {
        location: '37.7749,-122.4194',
        timestamp: '2021-01-01T00:00:00Z',
        duration: 360,
        'grid-carbon-intensity': 2193.5995087395318,
      },
    ]);
  });
});
