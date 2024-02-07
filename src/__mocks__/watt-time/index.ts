import * as DATA from './data.json';

export function getMockResponse(url: string, data: any) {
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
      }
      return Promise.resolve({
        status: 401,
        data: {},
      });

    case 'https://apifail.watttime.org/v2/login': {
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
      }
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
  return Promise.resolve({});
}
