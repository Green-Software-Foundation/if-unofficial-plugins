# Cloud Carbon Footprint

> [!NOTE] > `CCF` is a community plugin, not part of the IF standard library. This means the IF core team are not closely monitoring these plugins to keep them up to date. You should do your own research before implementing them!

"Cloud Carbon Footprint is an open source tool that provides visibility and tooling to measure, monitor and reduce your cloud carbon emissions. We use best practice methodologies to convert cloud utilization into estimated energy usage and carbon emissions, producing metrics and carbon savings estimates that can be shared with employees, investors, and other stakeholders." - [CCF](https://www.cloudcarbonfootprint.org/)

## Parameters

### Plugin global config

- `interpolation`: the interpolation method to apply to the CCF data

### Inputs

- `duration`: the amount of time the observation covers, in seconds
- `cpu/utilization`: percentage CPU utilization for a given observation
- `cloud/vendor`: the cloud platform provider, e.g. `aws`
- `cloud/instance-type`: the name of the specific instance being used, e.g. `m5n.large`

## Returns

- `carbon-embodied`: carbon emitted in manufacturing the device, in gCO2eq
- `energy`: energy used by CPU in kWh

## IF Implementation

IF reimplements the Cloud Carbon Footprint methodology from scratch conforming to the IF specification. This means the CCF plugins can be run inside IF without any external API calls and can be invoked as part of a plugin pipeline defined in an `manifest`.

Cloud Carbon Footprint includes calculations for three cloud vendors: AWS, Azure and GCP.

The general methodology is as follows:

`Total CO2e = operational emissions + embodied Emissions`

Where:

`Operational emissions = (Cloud cloud/vendor service usage) x (Cloud energy conversion factors [kWh]) x (Cloud cloud/vendor Power Usage Effectiveness (PUE)) x (grid emissions factors [metric tons CO2e])`

And:

`Embodied Emissions = estimated metric tons CO2e emissions from the manufacturing of datacenter servers, for compute usage`

You can read a detailed explanation ofn the calculations in the [CCF docs](https://www.cloudcarbonfootprint.org/docs/methodology/) and see the code for our implementing in [this repository](../../src/lib/ccf/).

## Usage

In IF, the plugin is called from a `manifest`. A `manifest` is a `.yaml` file that contains configuration metadata and usage inputs. This is interpreted by the command line tool, `ie`. The plugin input is expected to contain `duration`,`cpu/utilization`, `cloud/vendor` and `cloud/instance-type` fields.

You can see example Typescript invocations for each `cloud/vendor` below:

### AWS

```typescript
import {CloudCarbonFootprint} from '@grnsft/if-unofficial-plugins';

const ccf = CloudCarbonFootprint({interpolation: Interpolation.LINEAR});
const results = await ccf.execute([
  {
    timestamp: '2021-01-01T00:00:00Z', // ISO8601 / RFC3339 timestamp
    duration: 3600, // duration institute
    'cloud/vendor': 'aws',
    'cloud/instance-type': 'm5n.large',
    'cpu/utilization': 10, // CPU usage as a percentage
  },
]);
```

### Azure

```typescript
import {CloudCarbonFootprint} from '@grnsft/if-unofficial-plugins';

const ccf = CloudCarbonFootprint();
const results = await ccf.execute([
  {
    timestamp: '2021-01-01T00:00:00Z', // ISO8601 / RFC3339 timestamp
    duration: 3600, // duration institute
    'cpu/utilization': 10, // CPU usage as a percentage
    'cloud/vendor': 'azure',
    'cloud/instance-type': 'D4 v4',
  },
]);
```

### GCP

```typescript
import {CloudCarbonFootprint} from '@grnsft/if-unofficial-plugins';

const ccf = CloudCarbonFootprint();
const results = await ccf.execute([
  {
    timestamp: '2021-01-01T00:00:00Z', // ISO8601 / RFC3339 timestamp
    duration: 3600, // duration institute
    'cpu/utilization': 10, // CPU usage as a percentage
    'cloud/vendor': 'gcp',
    'cloud/instance-type': 'n2-standard-2',
  },
]);
```

## Example manifest

The following is an example of how CCF can be invoked using a `manifest`.

```yaml
name: ccf-demo
description: example manifest invoking CCF plugin
initialize:
  plugins:
    ccf:
      method: CloudCarbonFootprint
      path: '@grnsft/if-unofficial-plugins'
tree:
  children:
    child:
      pipeline:
        - ccf
      defaults:
        cloud/vendor: aws
        cloud/instance-type: m5n.large
      inputs:
        - timestamp: 2023-07-06T00:00 # [KEYWORD] [NO-SUBFIELDS] time when measurement occurred
          duration: 1
          cpu/utilization: 10
```

You can run this by passing it to `ie`. Run impact using the following command run from the project root:

```sh

npm i -g @grnsft/if
npm i -g @grnsft/if-unofficial-plugins
ie --manifest ./examples/manifests/test/ccf.yml --output ./examples/outputs/ccf.yml
```

This yields a result that looks like the following (saved to `/outputs/ccf.yml`):

```yaml
name: ccf-demo
description: example manifest invoking CCF plugin
initialize:
  plugins:
    ccf:
      method: CloudCarbonFootprint
      path: '@grnsft/if-unofficial-plugins'
tree:
  children:
    front-end:
      pipeline:
        - ccf
      defaults:
        cloud/vendor: aws
        cloud/instance-type: m5n.large
      inputs:
        - timestamp: 2023-07-06T00:00
          duration: 1
          cpu/utilization: 10
      outputs:
        - timestamp: 2023-07-06T00:00
          duration: 1
          cpu/utilization: 10
          cloud/vendor: aws
          cloud/instance-type: m5n.large
          energy: 0.000018845835066981333
          carbon-embodied: 0.02553890791476408
```
