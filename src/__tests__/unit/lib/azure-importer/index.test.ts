import {
  MockAzureCredentials,
  MockComputeManagementClient,
  MockMonitorClient,
  MockMonitorClientEmpty,
  MockComputeManagementClientEmpty,
  MockMonitorClientEmptyData,
} from '../../../../__mocks__/azure';
import {AzureImporterModel} from '../../../../lib/azure-importer';
import {ERRORS} from '../../../../util/errors';

const {InputValidationError, UnsupportedValueError} = ERRORS;

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
  describe('AzureImporterModel: ', () => {
    let azureModel: AzureImporterModel;

    beforeEach(() => {
      jest.clearAllMocks();
      azureModel = new AzureImporterModel();
    });

    describe('init AzureImporterModel: ', () => {
      it('initalizes object with properties.', async () => {
        expect(azureModel).toHaveProperty('configure');
        expect(azureModel).toHaveProperty('execute');
      });
    });

    describe('configure(): ', () => {
      it('configures AzureImporterModel.', async () => {
        const configuredModel = await azureModel.configure();

        expect.assertions(1);

        expect(configuredModel).toBeInstanceOf(AzureImporterModel);
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
              'azure-observation-window': '5 mins',
              'azure-observation-aggregation': 'average',
              'azure-subscription-id': '9de7e19f-8a18-4e73-9451-45fc74e7d0d3',
              'azure-resource-group': 'vm1_group',
              'azure-vm-name': 'vm1',
            },
          ];

          const result = await azureModel.execute(inputs);

          expect.assertions(1);

          expect(result).toStrictEqual([
            {
              'azure-observation-aggregation': 'average',
              'azure-observation-window': '5 mins',
              'azure-resource-group': 'vm1_group',
              'azure-subscription-id': '9de7e19f-8a18-4e73-9451-45fc74e7d0d3',
              'azure-vm-name': 'vm1',
              timestamp: '2023-11-02T10:35:00.000Z',
              duration: 300,
              'cpu-util': '3.14',
              'mem-availableGB': 0.5,
              'mem-usedGB': 0.5,
              'total-memoryGB': 1,
              'mem-util': 50,
              location: 'uksouth',
              'cloud-instance-type': 'Standard_B1s',
              'cloud-vendor': 'azure',
            },
          ]);
        });

        it('throws an error for missing input field.', async () => {
          process.env.AZURE_TEST_SCENARIO = 'valid';
          const errorMessage =
            '"azure-observation-window" parameter is required. Error code: invalid_type.';
          const inputs = [
            {
              timestamp: '2023-11-02T10:35:31.820Z',
              duration: 3600,
              'azure-observation-aggregation': 'average',
              'azure-subscription-id': '9de7e19f-8a18-4e73-9451-45fc74e7d0d3',
              'azure-resource-group': 'vm1_group',
              'azure-vm-name': 'vm1',
            },
          ];

          expect.assertions(2);

          try {
            await azureModel.execute(inputs);
          } catch (error) {
            expect(error).toStrictEqual(new InputValidationError(errorMessage));
            expect(error).toBeInstanceOf(InputValidationError);
          }
        });

        it('throws an error if time is provided in seconds.', async () => {
          process.env.AZURE_TEST_SCENARIO = 'valid';
          const errorMessage =
            'AzureImporterModel: The minimum unit of time for azure importer is minutes.';
          const inputs = [
            {
              timestamp: '2023-11-02T10:35:31.820Z',
              duration: 3600,
              'azure-observation-window': '5 sec',
              'azure-observation-aggregation': 'average',
              'azure-subscription-id': '9de7e19f-8a18-4e73-9451-45fc74e7d0d3',
              'azure-resource-group': 'vm1_group',
              'azure-vm-name': 'vm1',
            },
          ];

          expect.assertions(2);

          try {
            await azureModel.execute(inputs);
          } catch (error) {
            expect(error).toStrictEqual(new InputValidationError(errorMessage));
            expect(error).toBeInstanceOf(InputValidationError);
          }
        });

        it('throws an error for invalid `azure-observation-window` value.', async () => {
          process.env.AZURE_TEST_SCENARIO = 'valid';

          const errorMessage =
            'AzureImporterModel: azure-observation-window parameter is malformed.';
          const inputs = [
            {
              timestamp: '2023-11-02T10:35:00.000Z',
              duration: 300,
              'azure-observation-aggregation': 'average',
              'azure-subscription-id': '9de7e19f-8a18-4e73-9451-45fc74e7d0d3',
              'azure-resource-group': 'vm1_group',
              'azure-vm-name': 'vm1',
              'azure-observation-window': 'dummy',
            },
          ];

          expect.assertions(2);

          try {
            await azureModel.execute(inputs);
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
              'azure-observation-window': '5 mins',
              'azure-observation-aggregation': 'average',
              'azure-subscription-id': '9de7e19f-8a18-4e73-9451-45fc74e7d0d3',
              'azure-resource-group': 'vm1_group',
              'azure-vm-name': 'vm1',
            },
          ];

          const result = await azureModel.execute(inputs);

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
              'azure-observation-window': '5 mins',
              'azure-observation-aggregation': 'average',
              'azure-subscription-id': '9de7e19f-8a18-4e73-9451-45fc74e7d0d3',
              'azure-resource-group': 'vm1_group',
              'azure-vm-name': 'vm1',
            },
          ];

          const result = await azureModel.execute(inputs);

          expect.assertions(1);

          expect(result).toEqual([]);
        });
      });
    });
  });
});
