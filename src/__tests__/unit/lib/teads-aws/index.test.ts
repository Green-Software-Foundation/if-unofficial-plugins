import {describe, expect, jest, test} from '@jest/globals';
import {TeadsAWS} from '../../../../lib/teads-aws/index';

import {Interpolation} from '../../../../types/common';

jest.setTimeout(30000);
describe('lib/teads-aws', () => {
  describe('initialize', () => {
    test('configure', async () => {
      const outputModel = new TeadsAWS();
      await expect(outputModel.configure()).rejects.toThrow();
      await expect(
        outputModel.configure({'instance-type': 't2213'})
      ).rejects.toThrow();
      await expect(
        outputModel.configure({'instance-type': ''})
      ).rejects.toThrow();
      await expect(
        outputModel.execute([
          {
            duration: 3600,
            'cpu-util': 50,
            timestamp: '2021-01-01T00:00:00Z',
          },
        ])
      ).rejects.toThrow();
    });
  });
});
describe('teads:configure test', () => {
  test('teads:initialize with params: spline', async () => {
    const outputModel = new TeadsAWS();
    await outputModel.configure({
      'instance-type': 'm5n.large',
      interpolation: Interpolation.SPLINE,
    });
    await expect(
      outputModel.execute([
        {
          duration: 3600,
          'cpu-util': 10,
          timestamp: '2021-01-01T00:00:00Z',
        },
        {
          duration: 3600,
          'cpu-util': 50,
          timestamp: '2021-01-01T00:00:00Z',
        },
        {
          duration: 3600,
          'cpu-util': 100,
          timestamp: '2021-01-01T00:00:00Z',
        },
      ])
    ).resolves.toStrictEqual([
      {
        duration: 3600,
        'cpu-util': 10,
        timestamp: '2021-01-01T00:00:00Z',
        energy: 0.0067,
        'embodied-carbon': 91.94006849315068,
      },
      {
        duration: 3600,
        'cpu-util': 50,
        timestamp: '2021-01-01T00:00:00Z',
        energy: 0.011800000000000001,
        'embodied-carbon': 91.94006849315068,
      },
      {
        duration: 3600,
        'cpu-util': 100,
        timestamp: '2021-01-01T00:00:00Z',
        energy: 0.016300000000000002,
        'embodied-carbon': 91.94006849315068,
      },
    ]);
  });
  test('teads:initialize with params: linear', async () => {
    const outputModel = new TeadsAWS();
    await outputModel.configure({
      'instance-type': 'm5n.large',
      interpolation: Interpolation.LINEAR,
    });
    await expect(
      outputModel.execute([
        {
          duration: 3600,
          'cpu-util': 10,
          timestamp: '2021-01-01T00:00:00Z',
        },
        {
          duration: 3600,
          'cpu-util': 50,
          timestamp: '2021-01-01T00:00:00Z',
        },
        {
          duration: 3600,
          'cpu-util': 100,
          timestamp: '2021-01-01T00:00:00Z',
        },
      ])
    ).resolves.toStrictEqual([
      {
        duration: 3600,
        'cpu-util': 10,
        timestamp: '2021-01-01T00:00:00Z',
        energy: 0.0067,
        'embodied-carbon': 91.94006849315068,
      },
      {
        duration: 3600,
        'cpu-util': 50,
        timestamp: '2021-01-01T00:00:00Z',
        energy: 0.011800000000000001,
        'embodied-carbon': 91.94006849315068,
      },
      {
        duration: 3600,
        'cpu-util': 100,
        timestamp: '2021-01-01T00:00:00Z',
        energy: 0.016300000000000002,
        'embodied-carbon': 91.94006849315068,
      },
    ]);
  });
  test('teads:initialize with params: linear 2', async () => {
    const outputModel = new TeadsAWS();
    await outputModel.configure({
      'instance-type': 'm5n.large',
      interpolation: Interpolation.LINEAR,
      'expected-lifespan': 8 * 365 * 24 * 3600,
    });
    await expect(
      outputModel.execute([
        {
          duration: 3600,
          'cpu-util': 10,
          timestamp: '2021-01-01T00:00:00Z',
        },
        {
          duration: 3600,
          'cpu-util': 50,
          timestamp: '2021-01-01T00:00:00Z',
        },
        {
          duration: 3600,
          'cpu-util': 100,
          timestamp: '2021-01-01T00:00:00Z',
        },
      ])
    ).resolves.toStrictEqual([
      {
        duration: 3600,
        'cpu-util': 10,
        timestamp: '2021-01-01T00:00:00Z',
        energy: 0.0067,
        'embodied-carbon': 45.97003424657534,
      },
      {
        duration: 3600,
        'cpu-util': 50,
        timestamp: '2021-01-01T00:00:00Z',
        energy: 0.011800000000000001,
        'embodied-carbon': 45.97003424657534,
      },
      {
        duration: 3600,
        'cpu-util': 100,
        timestamp: '2021-01-01T00:00:00Z',
        energy: 0.016300000000000002,
        'embodied-carbon': 45.97003424657534,
      },
    ]);
  });
});
