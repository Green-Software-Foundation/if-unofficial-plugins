import {
  MockAzureCredentials,
  MockComputeManagementClient,
  MockMonitorClient,
  MockMonitorClientEmpty,
  MockComputeManagementClientEmpty,
  MockMonitorClientEmptyData,
} from '../../../../__mocks__/azure';
import {AzureImporter} from '../../../../lib/azure-importer';
import {ERRORS} from '../../../../util/errors';

const {InputValidationError, UnsupportedValueError, ConfigValidationError} =
  ERRORS;

jest.mock('@azure/identity', () => ({
  __esModule: true,
  DefaultAzureCredential: MockAzureCredentials,
}));

jest.mock('@azure/arm-monitor', () => ({
  __esModule: true,
  MonitorClient: jest.fn(() => {
    if (process.env.AZURE_TEST_SCENARIO === 'empty') {
      return new MockMonitorClientEmpty();
    } else if (process.env.AZURE_TEST_SCENARIO === 'emptyData') {
      return new MockMonitorClientEmptyData();
    }
    return new MockMonitorClient();
  }),
}));

jest.mock('@azure/arm-compute', () => ({
  __esModule: true,
  ComputeManagementClient: jest.fn(() => {
    if (process.env.AZURE_TEST_SCENARIO === 'empty') {
      return new MockComputeManagementClientEmpty();
    }
    return new MockComputeManagementClient();
  }),
}));

describe('lib/azure-importer: ', () => {
  describe('AzureImporter: ', () => {
    const output = AzureImporter();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('init AzureImporter: ', () => {
      it('initalizes object with properties.', async () => {
        expect(output).toHaveProperty('metadata');
        expect(output).toHaveProperty('execute');
      });
    });

    describe('execute(): ', () => {
      describe('executes when provided a valid mock `timeseries` in metrics.', () => {
        it('returns a result when provided valid data.', async () => {
          process.env.AZURE_TEST_SCENARIO = 'valid';

          const inputs = [
            {
              timestamp: '2023-11-02T10:35:00.000Z',
              duration: 300,
            },
          ];
          const config = {
            'azure-observation-window': '5 mins',
            'azure-observation-aggregation': 'average',
            'azure-subscription-id': '9de7e19f-8a18-4e73-9451-45fc74e7d0d3',
            'azure-resource-group': 'vm1_group',
            'azure-vm-name': 'vm1',
          };

          const result = await output.execute(inputs, config);

          expect.assertions(1);

          expect(result).toStrictEqual([
            {
              timestamp: '2023-11-02T10:35:00.000Z',
              duration: 300,
              'azure-observation-window': '5 mins',
              'azure-observation-aggregation': 'average',
              'azure-subscription-id': '9de7e19f-8a18-4e73-9451-45fc74e7d0d3',
              'azure-resource-group': 'vm1_group',
              'azure-vm-name': 'vm1',
              'cpu/utilization': '3.14',
              'memory/available/GB': 0.5,
              'memory/used/GB': 0.5,
              'memory/capacity/GB': 1,
              'memory/utilization': 50,
              location: 'uksouth',
              'cloud/instance-type': 'Standard_B1s',
              'cloud/vendor': 'azure',
            },
          ]);
        });

        it('throws an error for missing config.', async () => {
          process.env.AZURE_TEST_SCENARIO = 'valid';
          const errorMessage = 'AzureImporter: Config must be provided.';
          const inputs = [
            {
              timestamp: '2023-11-02T10:35:31.820Z',
              duration: 3600,
            },
          ];
          const config = undefined;

          expect.assertions(2);

          try {
            await output.execute(inputs, config);
          } catch (error) {
            expect(error).toStrictEqual(
              new ConfigValidationError(errorMessage)
            );
            expect(error).toBeInstanceOf(ConfigValidationError);
          }
        });

        it('throws an error for missing input field.', async () => {
          process.env.AZURE_TEST_SCENARIO = 'valid';
          const errorMessage =
            '"azure-observation-window" parameter is required. Error code: invalid_type.';
          const inputs = [
            {
              timestamp: '2023-11-02T10:35:31.820Z',
              duration: 3600,
            },
          ];
          const config = {
            'azure-observation-aggregation': 'average',
            'azure-subscription-id': '9de7e19f-8a18-4e73-9451-45fc74e7d0d3',
            'azure-resource-group': 'vm1_group',
            'azure-vm-name': 'vm1',
          };

          expect.assertions(2);

          try {
            await output.execute(inputs, config);
          } catch (error) {
            expect(error).toStrictEqual(new InputValidationError(errorMessage));
            expect(error).toBeInstanceOf(InputValidationError);
          }
        });

        it('throws an error if time is provided in seconds.', async () => {
          process.env.AZURE_TEST_SCENARIO = 'valid';
          const errorMessage =
            'AzureImporter: The minimum unit of time for azure importer is minutes.';
          const inputs = [
            {
              timestamp: '2023-11-02T10:35:31.820Z',
              duration: 3600,
            },
          ];
          const config = {
            'azure-observation-window': '5 sec',
            'azure-observation-aggregation': 'average',
            'azure-subscription-id': '9de7e19f-8a18-4e73-9451-45fc74e7d0d3',
            'azure-resource-group': 'vm1_group',
            'azure-vm-name': 'vm1',
          };

          expect.assertions(2);

          try {
            await output.execute(inputs, config);
          } catch (error) {
            expect(error).toStrictEqual(new InputValidationError(errorMessage));
            expect(error).toBeInstanceOf(InputValidationError);
          }
        });

        it('throws an error for invalid `azure-observation-window` value.', async () => {
          process.env.AZURE_TEST_SCENARIO = 'valid';

          const errorMessage =
            'AzureImporter: azure-observation-window parameter is malformed.';
          const inputs = [
            {
              timestamp: '2023-11-02T10:35:00.000Z',
              duration: 300,
            },
          ];
          const config = {
            'azure-observation-aggregation': 'average',
            'azure-subscription-id': '9de7e19f-8a18-4e73-9451-45fc74e7d0d3',
            'azure-resource-group': 'vm1_group',
            'azure-vm-name': 'vm1',
            'azure-observation-window': 'dummy',
          };

          expect.assertions(2);

          try {
            await output.execute(inputs, config);
          } catch (error) {
            expect(error).toStrictEqual(
              new UnsupportedValueError(errorMessage)
            );
            expect(error).toBeInstanceOf(UnsupportedValueError);
          }
        });
      });

      describe('executes when the `timeseries` is missed from the mock metrics.', () => {
        it('returns valid data.', async () => {
          process.env.AZURE_TEST_SCENARIO = 'empty';

          const inputs = [
            {
              timestamp: '2023-11-02T10:35:00.000Z',
              duration: 300,
            },
          ];
          const config = {
            'azure-observation-window': '5 mins',
            'azure-observation-aggregation': 'average',
            'azure-subscription-id': '9de7e19f-8a18-4e73-9451-45fc74e7d0d3',
            'azure-resource-group': 'vm1_group',
            'azure-vm-name': 'vm1',
          };

          const result = await output.execute(inputs, config);

          expect.assertions(1);

          expect(result).toEqual([]);
        });
      });

      describe('executes when the `timeseries` is missed from mock metrics.', () => {
        it('returns valid data.', async () => {
          process.env.AZURE_TEST_SCENARIO = 'emptyData';

          const inputs = [
            {
              timestamp: '2023-11-02T10:35:00.000Z',
              duration: 300,
            },
          ];
          const config = {
            'azure-observation-window': '5 mins',
            'azure-observation-aggregation': 'average',
            'azure-subscription-id': '9de7e19f-8a18-4e73-9451-45fc74e7d0d3',
            'azure-resource-group': 'vm1_group',
            'azure-vm-name': 'vm1',
          };

          const result = await output.execute(inputs, config);

          expect.assertions(1);

          expect(result).toEqual([]);
        });
      });
    });
  });
});
