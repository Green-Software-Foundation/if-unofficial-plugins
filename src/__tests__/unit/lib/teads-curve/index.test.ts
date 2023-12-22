import {describe, expect, jest, test} from '@jest/globals';
import {TeadsCurveModel} from '../../../../lib';

jest.setTimeout(30000);

describe('lib/teads-curve', () => {
  describe('initialize-configure', () => {
    test('configure()', async () => {
      const outputModel = new TeadsCurveModel();
      await outputModel.configure({
        'thermal-design-power': 200,
      });
      await expect(outputModel.configure()).rejects.toThrow();
    });
  });
  describe('execute()', () => {
    test('tdp:200', async () => {
      const outputModel = new TeadsCurveModel();
      await outputModel.configure({
        'thermal-design-power': 200,
      });
      await expect(
        outputModel.execute([
          {
            duration: 3600,
            'cpu-util': 50.0,
            timestamp: '2021-01-01T00:00:00Z',
          },
        ])
      ).resolves.toStrictEqual([
        {
          'energy-cpu': 0.15,
          duration: 3600,
          'cpu-util': 50.0,
          timestamp: '2021-01-01T00:00:00Z',
        },
      ]);
    });
    test('scale with vcpu usage', async () => {
      const outputModel = new TeadsCurveModel();
      await outputModel.configure({
        'thermal-design-power': 200,
      });
      await expect(
        outputModel.execute([
          {
            duration: 3600,
            'cpu-util': 50.0,
            timestamp: '2021-01-01T00:00:00Z',
            'vcpus-allocated': 1,
            'vcpus-total': 64,
          },
        ])
      ).resolves.toStrictEqual([
        {
          'energy-cpu': 0.00234375,
          duration: 3600,
          'cpu-util': 50.0,
          timestamp: '2021-01-01T00:00:00Z',
          'vcpus-allocated': 1,
          'vcpus-total': 64,
        },
      ]);
    });
    test('spline: execute()', async () => {
      const outputModel = new TeadsCurveModel();
      await outputModel.configure({
        'thermal-design-power': 300,
      });
      await expect(
        outputModel.execute([
          {
            duration: 3600,
            'cpu-util': 10.0,
            timestamp: '2021-01-01T00:00:00Z',
          },
          {
            duration: 3600,
            'cpu-util': 50.0,
            timestamp: '2021-01-01T00:00:00Z',
          },
          {
            duration: 3600,
            'cpu-util': 100.0,
            timestamp: '2021-01-01T00:00:00Z',
          },
        ])
      ).resolves.toStrictEqual([
        {
          duration: 3600,
          'cpu-util': 10.0,
          timestamp: '2021-01-01T00:00:00Z',
          'energy-cpu': 0.096,
        },
        {
          duration: 3600,
          'cpu-util': 50.0,
          timestamp: '2021-01-01T00:00:00Z',
          'energy-cpu': 0.225,
        },
        {
          duration: 3600,
          'cpu-util': 100.0,
          timestamp: '2021-01-01T00:00:00Z',
          'energy-cpu': 0.306,
        },
      ]);
    });
    test('linear: execute()', async () => {
      const outputModel = new TeadsCurveModel();
      await outputModel.configure({
        'thermal-design-power': 300,
        interpolation: 'linear',
      });
      await expect(
        outputModel.execute([
          {
            duration: 3600,
            'cpu-util': 10.0,
            timestamp: '2021-01-01T00:00:00Z',
          },
          {
            duration: 3600,
            'cpu-util': 50.0,
            timestamp: '2021-01-01T00:00:00Z',
          },
          {
            duration: 3600,
            'cpu-util': 100.0,
            timestamp: '2021-01-01T00:00:00Z',
          },
          {
            duration: 3600,
            'cpu-util': 15.0,
            timestamp: '2021-01-01T00:00:00Z',
          },
          {
            duration: 3600,
            'cpu-util': 55.0,
            timestamp: '2021-01-01T00:00:00Z',
          },
          {
            duration: 3600,
            'cpu-util': 75.0,
            timestamp: '2021-01-01T00:00:00Z',
          },
        ])
      ).resolves.toStrictEqual([
        {
          duration: 3600,
          'cpu-util': 10.0,
          timestamp: '2021-01-01T00:00:00Z',
          'energy-cpu': 0.096,
        },
        {
          duration: 3600,
          'cpu-util': 50.0,
          timestamp: '2021-01-01T00:00:00Z',
          'energy-cpu': 0.225,
        },
        {
          duration: 3600,
          'cpu-util': 100.0,
          timestamp: '2021-01-01T00:00:00Z',
          'energy-cpu': 0.306,
        },

        {
          duration: 3600,
          'cpu-util': 15.0,
          timestamp: '2021-01-01T00:00:00Z',
          'energy-cpu': 0.11212500000000002,
        },
        {
          duration: 3600,
          'cpu-util': 55.0,
          timestamp: '2021-01-01T00:00:00Z',
          'energy-cpu': 0.2331,
        },
        {
          duration: 3600,
          'cpu-util': 75.0,
          timestamp: '2021-01-01T00:00:00Z',
          'energy-cpu': 0.2655,
        },
      ]);
    });
    test('linear: vcpus-allocated execute()', async () => {
      const outputModel = new TeadsCurveModel();
      await outputModel.configure({
        'thermal-design-power': 300,
        interpolation: 'linear',
      });
      await expect(
        outputModel.execute([
          {
            duration: 3600,
            'cpu-util': 10.0,
            'vcpus-allocated': 1,
            'vcpus-total': 64,
            timestamp: '2021-01-01T00:00:00Z',
          },
        ])
      ).resolves.toStrictEqual([
        {
          duration: 3600,
          'cpu-util': 10.0,
          timestamp: '2021-01-01T00:00:00Z',

          'vcpus-allocated': 1,
          'vcpus-total': 64,
          'energy-cpu': 0.0015,
        },
      ]);
      await expect(
        outputModel.execute([
          {
            duration: 3600,
            'cpu-util': 10.0,
            'vcpus-allocated': '1',
            'vcpus-total': '64',
            timestamp: '2021-01-01T00:00:00Z',
          },
        ])
      ).resolves.toStrictEqual([
        {
          duration: 3600,
          'cpu-util': 10.0,
          timestamp: '2021-01-01T00:00:00Z',
          'vcpus-allocated': '1',
          'vcpus-total': '64',
          'energy-cpu': 0.0015,
        },
      ]);
      await expect(
        outputModel.execute([
          {
            duration: 3600,
            'cpu-util': 10.0,
            'thermal-design-power': 200,
            'vcpus-allocated': '1',
            'vcpus-total': '64',
            timestamp: '2021-01-01T00:00:00Z',
          },
        ])
      ).resolves.toStrictEqual([
        {
          duration: 3600,
          'cpu-util': 10.0,
          timestamp: '2021-01-01T00:00:00Z',
          'vcpus-allocated': '1',
          'thermal-design-power': 200,
          'vcpus-total': '64',
          'energy-cpu': 0.001,
        },
      ]);
      await expect(
        outputModel.execute([
          {
            duration: 3600,
            'cpu-util': 10.0,
            'vcpus-allocated': false,
            'vcpus-total': '64',
            timestamp: '2021-01-01T00:00:00Z',
          },
        ])
      ).rejects.toThrow();
      await expect(
        outputModel.execute([
          {
            duration: 3600,
            'cpu-util': 10.0,
            'vcpus-allocated': '12',
            'vcpus-total': false,
            timestamp: '2021-01-01T00:00:00Z',
          },
        ])
      ).rejects.toThrow();
      await expect(
        outputModel.execute([
          {
            duration: 3600,
            timestamp: '2021-01-01T00:00:00Z',
          },
        ])
      ).rejects.toThrow();
      await expect(
        outputModel.execute([
          {
            duration: 3600,
            'cpu-util': 200,
            timestamp: '2021-01-01T00:00:00Z',
          },
        ])
      ).rejects.toThrow();
    });
    test('linear: vcpus-allocated execute()', async () => {
      const outputModel = new TeadsCurveModel();
      await outputModel.configure({
        interpolation: 'linear',
      });
      await expect(
        outputModel.execute([
          {
            duration: 3600,
            'cpu-util': 10.0,
            'vcpus-allocated': 1,
            'vcpus-total': 64,
            timestamp: '2021-01-01T00:00:00Z',
          },
        ])
      ).rejects.toThrow();
    });
  });
});
