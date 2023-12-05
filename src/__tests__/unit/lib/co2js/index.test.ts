import {describe, expect, jest, test} from '@jest/globals';
import {Co2jsModel} from '../../../../lib/co2js';

jest.setTimeout(30000);

describe('co2js-test', () => {
  test('initialize and test', async () => {
    const model = await new Co2jsModel().configure({
      type: '1byte',
    });
    expect(model).toBeInstanceOf(Co2jsModel);
    await expect(
      model.execute([
        {
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
          bytes: 100000,
          'green-web-host': true,
        },
      ])
    ).resolves.toStrictEqual([
      {
        timestamp: '2021-01-01T00:00:00Z',
        duration: 3600,
        bytes: 100000,
        'green-web-host': true,
        'operational-carbon': 0.023195833333333332,
      },
    ]);
  });
  test('initialize and test', async () => {
    const model = await new Co2jsModel().configure({
      type: '1byte',
    });
    expect(model).toBeInstanceOf(Co2jsModel);
    await expect(
      model.execute([
        {
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
          bytes: 100000,
          'green-web-host': true,
        },
      ])
    ).resolves.toStrictEqual([
      {
        timestamp: '2021-01-01T00:00:00Z',
        duration: 3600,
        bytes: 100000,
        'green-web-host': true,
        'operational-carbon': 0.023195833333333332,
      },
    ]);
  });
  test('initialize and test', async () => {
    const model = await new Co2jsModel().configure({
      type: '1byte',
    });
    expect(model).toBeInstanceOf(Co2jsModel);
    await expect(
      model.execute([
        {
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
          bytes: 100000,
          'green-web-host': true,
        },
      ])
    ).resolves.toStrictEqual([
      {
        timestamp: '2021-01-01T00:00:00Z',
        duration: 3600,
        bytes: 100000,
        'green-web-host': true,
        'operational-carbon': 0.023195833333333332,
      },
    ]);
  });
  test('initialize and test', async () => {
    const model = await new Co2jsModel().configure({
      type: '1byte',
    });
    expect(model).toBeInstanceOf(Co2jsModel);
    await expect(
      model.execute([
        {
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
          bytes: 100000,
          'green-web-host': true,
        },
      ])
    ).resolves.toStrictEqual([
      {
        timestamp: '2021-01-01T00:00:00Z',
        duration: 3600,
        bytes: 100000,
        'green-web-host': true,
        'operational-carbon': 0.023195833333333332,
      },
    ]);
  });
  test('initialize and test', async () => {
    const model = await new Co2jsModel().configure({
      type: '1byte',
    });
    expect(model).toBeInstanceOf(Co2jsModel);
    await expect(
      model.execute([
        {
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
          bytes: 100000,
          'green-web-host': true,
        },
      ])
    ).resolves.toStrictEqual([
      {
        timestamp: '2021-01-01T00:00:00Z',
        duration: 3600,
        bytes: 100000,
        'green-web-host': true,
        'operational-carbon': 0.023195833333333332,
      },
    ]);
  });
});
