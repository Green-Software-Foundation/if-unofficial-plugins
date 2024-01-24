import {MonitorClient} from '@azure/arm-monitor';
import {DefaultAzureCredential} from '@azure/identity';
import {
  ComputeManagementClient,
  ResourceSku,
  VirtualMachine,
} from '@azure/arm-compute';

import {GetMetricsParams} from './types';

export class AzureAPI {
  private credential: DefaultAzureCredential;
  private client!: ComputeManagementClient;

  constructor() {
    this.credential = new DefaultAzureCredential();
  }

  /**
   * Fetches metrics for a specific virtual machine.
   */
  public async getMetricsTimeseries(
    params: GetMetricsParams,
    metricName: string
  ) {
    const {
      subscriptionId,
      resourceGroupName,
      timespan,
      interval,
      aggregation,
      vmName,
    } = params;

    this.setClient(subscriptionId);

    const monitorClient = new MonitorClient(this.credential, subscriptionId);
    const response = await monitorClient.metrics.list(
      `subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.Compute/virtualMachines/${vmName}`,
      {
        metricnames: metricName,
        timespan,
        interval,
        aggregation,
      }
    );

    return (response.value[0].timeseries || [])
      .map(series => series.data || [])
      .flat();
  }

  /**
   * Sets up the ComputeManagementClient with the specified subscription ID.
   */
  private setClient(subscriptionId: string) {
    this.client = new ComputeManagementClient(this.credential, subscriptionId);
  }

  /**
   * Fetches a list of virtual machines within a specific resource group.
   */
  public async getVMDataByResourceGroupName(resourceGroupName: string) {
    const vmData: VirtualMachine[] = [];
    const vmList = this.client.virtualMachines.list(resourceGroupName);

    for await (const item of vmList) {
      vmData.push(item);
    }

    return vmData;
  }

  /**
   * Fetches a list of available resource Skus.
   */
  public async getResourceSkus() {
    const iterator = this.client.resourceSkus.list();
    const resourceSkus: ResourceSku[] = [];

    for await (const resourceSku of iterator) {
      resourceSkus.push(resourceSku);
    }

    return resourceSkus;
  }
}
