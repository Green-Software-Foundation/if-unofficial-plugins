import {describe, expect, jest, test} from '@jest/globals';
import {Co2jsModel} from '../../../../lib/co2js';

jest.setTimeout(30000);

describe('lib/co2js', () => {
  describe('initialization tests', () => {
    test('init', async () => {
      const outputModel = new Co2jsModel();
      await expect(
        outputModel.configure({
          type: '1byte',
        })
      ).resolves.toBeInstanceOf(Co2jsModel);
      await expect(
        outputModel.configure({
          type: 'swd',
        })
      ).resolves.toBeInstanceOf(Co2jsModel);
      await expect(
        outputModel.configure({
          type: '1byt',
        })
      ).rejects.toThrow();
    });
  });
  describe('configure()', () => {
    test('initialize and configure 1byte', async () => {
      const model = await new Co2jsModel().configure({
        type: '1byte',
      });
      expect(model).toBeInstanceOf(Co2jsModel);
    });
    test('initialize and configure swd', async () => {
      const model = await new Co2jsModel().configure({
        type: 'swd',
      });
      expect(model).toBeInstanceOf(Co2jsModel);
    });
    test('initialize and test without bytes input', async () => {
      const model = await new Co2jsModel().configure({
        type: '1byte',
      });
      expect(model).toBeInstanceOf(Co2jsModel);
      await expect(
        model.execute([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'green-web-host': true,
          },
        ])
      ).rejects.toThrow();
    });
  });
  describe('execute()', () => {
    test('initialize and execute 1byte', async () => {
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
    test('initialize and execute swd', async () => {
      const model = await new Co2jsModel().configure({
        type: 'swd',
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
          'operational-carbon': 0.023209515022500005,
        },
      ]);
    });
    test('initialize and execute swd with options', async () => {
      const model = await new Co2jsModel().configure({
        type: 'swd',
      });
      expect(model).toBeInstanceOf(Co2jsModel);
      await expect(
        model.execute([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            bytes: 100000,
            'green-web-host': false,
            options: {
              dataReloadRatio: 0.6,
              firstVisitPercentage: 0.9,
              returnVisitPercentage: 0.1,
              gridIntensity: {
                device: 560.98,
                dataCenter: 50,
                networks: 437.66,
              },
            },
          },
        ])
      ).resolves.toStrictEqual([
        {
          timestamp: '2021-01-01T00:00:00Z',
          duration: 3600,
          bytes: 100000,
          'green-web-host': false,
          options: {
            dataReloadRatio: 0.6,
            firstVisitPercentage: 0.9,
            returnVisitPercentage: 0.1,
            gridIntensity: {
              device: 560.98,
              dataCenter: 50,
              networks: 437.66,
            },
          },
          'operational-carbon': 0.034497244224,
        },
      ]);
    });
    test('initialize and execute without bytes input', async () => {
      const model = await new Co2jsModel().configure({
        type: '1byte',
      });
      expect(model).toBeInstanceOf(Co2jsModel);
      await expect(
        model.execute([
          {
            timestamp: '2021-01-01T00:00:00Z',
            duration: 3600,
            'green-web-host': true,
          },
        ])
      ).rejects.toThrow();
    });
  });
});
