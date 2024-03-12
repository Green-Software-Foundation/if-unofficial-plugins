import * as DATA from './data.json';

export function getMockResponse(url: string) {
  switch (url) {
    case 'https://api.watttime.org/login':
      if (
        process.env.WATT_TIME_USERNAME &&
        ['test1', 'invalidData1', 'fetchError1'].includes(
          process.env.WATT_TIME_USERNAME
        ) &&
        process.env.WATT_TIME_PASSWORD &&
        ['test2', 'invalidData2', 'fetchError2'].includes(
          process.env.WATT_TIME_PASSWORD
        )
      ) {
        return Promise.resolve({
          status: 200,
          data: {
            token: 'test_token',
          },
        });
      }
      return Promise.resolve({
        status: 401,
        data: {},
      });
    case 'https://api2.watttime.org/v2/data':
      if (
        process.env.WATT_TIME_USERNAME === 'invalidData1' &&
        process.env.WATT_TIME_PASSWORD === 'invalidData2'
      ) {
        return Promise.resolve({
          status: 400,
          data: {},
        });
      } else if (
        process.env.WATT_TIME_USERNAME === 'fetchError1' &&
        process.env.WATT_TIME_PASSWORD === 'fetchError2'
      ) {
        return Promise.resolve({
          status: 400,
          data: {none: {}},
        });
      }

      return Promise.resolve({
        data: DATA,
        status: 200,
      });
  }
  return Promise.resolve({});
}
