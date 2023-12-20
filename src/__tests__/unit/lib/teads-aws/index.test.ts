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
      await expect(
        outputModel.execute([
          {
            duration: 3600,
            'cpu-util': 50,
            timestamp: '2021-01-01T00:00:00Z',
          },
        ])
      ).rejects.toThrowError(Error('TeadsAWS: Instance type is not provided..'));
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
        'embodied-carbon': 0.9577090468036529,
      },
      {
        duration: 3600,
        'cpu-util': 50,
        timestamp: '2021-01-01T00:00:00Z',
        energy: 0.011800000000000001,
        'embodied-carbon': 0.9577090468036529,
      },
      {
        duration: 3600,
        'cpu-util': 100,
        timestamp: '2021-01-01T00:00:00Z',
        energy: 0.016300000000000002,
        'embodied-carbon': 0.9577090468036529,
      },
    ]);
    await outputModel.configure({
      'instance-type': 'm5n.large',
      interpolation: Interpolation.LINEAR,
    });
    await expect(
      outputModel.execute([
        {
          duration: 3600,
          'cpu-util': 8,
          timestamp: '2021-01-01T00:00:00Z',
        },
        {
          duration: 3600,
          'cpu-util': 15,
          timestamp: '2021-01-01T00:00:00Z',
        },
        {
          duration: 3600,
          'cpu-util': 55,
          timestamp: '2021-01-01T00:00:00Z',
        },
        {
          duration: 3600,
          'cpu-util': 95,
          timestamp: '2021-01-01T00:00:00Z',
        },
      ])
    ).resolves.toStrictEqual([
      {
        duration: 3600,
        'cpu-util': 8,
        timestamp: '2021-01-01T00:00:00Z',
        energy: 0.00618,
        'embodied-carbon': 0.9577090468036529,
      },
      {
        duration: 3600,
        'cpu-util': 15,
        timestamp: '2021-01-01T00:00:00Z',
        energy: 0.0073375,
        'embodied-carbon': 0.9577090468036529,
      },
      {
        duration: 3600,
        'cpu-util': 55,
        timestamp: '2021-01-01T00:00:00Z',
        energy: 0.01225,
        'embodied-carbon': 0.9577090468036529,
      },
      {
        duration: 3600,
        'cpu-util': 95,
        timestamp: '2021-01-01T00:00:00Z',
        energy: 0.015850000000000003,
        'embodied-carbon': 0.9577090468036529,
      },
    ]);

    await expect(
      outputModel.execute([
        {
          duration: 3600,
          timestamp: '2021-01-01T00:00:00Z',
        },
      ])
    ).rejects.toThrowError(Error('TeadsAWS: Required parameters \'cpu-util\' is not provided.'));
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
        'embodied-carbon': 0.9577090468036529,
      },
      {
        duration: 3600,
        'cpu-util': 50,
        timestamp: '2021-01-01T00:00:00Z',
        energy: 0.011800000000000001,
        'embodied-carbon': 0.9577090468036529,
      },
      {
        duration: 3600,
        'cpu-util': 100,
        timestamp: '2021-01-01T00:00:00Z',
        energy: 0.016300000000000002,
        'embodied-carbon': 0.9577090468036529,
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
        'embodied-carbon': 0.47885452340182644,
      },
      {
        duration: 3600,
        'cpu-util': 50,
        timestamp: '2021-01-01T00:00:00Z',
        energy: 0.011800000000000001,
        'embodied-carbon': 0.47885452340182644,
      },
      {
        duration: 3600,
        'cpu-util': 100,
        timestamp: '2021-01-01T00:00:00Z',
        energy: 0.016300000000000002,
        'embodied-carbon': 0.47885452340182644,
      },
    ]);
  });
});
