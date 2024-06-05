# Teads' AWS Estimation Plugin

[!CAUTION] **This plugin is deprecated and will be deleted, likely before July 2024. We no longer want to support this plugin. It is possibel to replicate its behaviour using a set of generic arithmetic plugins that now come bundled in IF. You should start migrating your pipelines over to this method as soon as possible instead of relying on this plugin.**

Teads Engineering Team built a plugin for estimating AWS instances energy usage. This plugin creates a power curve on a correlation to SPEC Power database. This allows the plugin to generate a power curve for any AWS EC2 instance type based on publicly available AWS EC2 Instance CPU data.

The main benefit of this plugin is that it accounts for all the components involved in an instance's compute capacity.

## Parameters

### Plugin global config

- `interpolation`: the interpolation method to apply to the TDP curve

### Inputs

- `cloud/instance-type`: the name of the instance type, e.g. `t2.micro`
- `cpu/utilization`: percentage CPU usage for the given time period
- `timestamp`: a timestamp for the input
- `duration`: the amount of time, in seconds, that the input covers.

## Returns

- `energy`: The energy used in operating the application, in kWh
- `carbon-embodied`: The carbon used in manufacturing and disposing of the device

## Implementation

IF implements this plugin based on the data gathered from the CCF (Cloud Carbon Footprint) dataset.

Spline interpolation is implemented as the default method of estimating the usage using the power curve provided by `IDLE`, `10%`, `50%`, `100%` values in the dataset.

Resulting values are an estimate based on the testing done by Teads' Engineering Team. Further information can be found in the following links.

1. [TEADS Engineering: Building An AWS EC2 Carbon Emissions Dataset](https://medium.com/teads-engineering/building-an-aws-ec2-carbon-emissions-dataset-3f0fd76c98ac)
2. [TEADS Engineering: Estimating AWS EC2 Instances Power Consumption](https://medium.com/teads-engineering/estimating-aws-ec2-instances-power-consumption-c9745e347959)

## Example

```typescript
import {TeadsAWS} from '@grnsft/if-unofficial-plugins';

const teads = TeadsAWS({});
const results = await teads.execute([
  {
    duration: 3600, // duration institute
    timestamp: '2021-01-01T00:00:00Z', // ISO8601 / RFC3339 timestamp
    'cloud/instance-type': 'c6i.large',
    'cpu/utilization: 0.1, // CPU usage as a value between 0 and 1 in floating point number
  },
]);
```

## Example `manifest`

```yaml
name: teads-aws
description: simple demo invoking TeadsAWS plugin
tags:
initialize:
  plugins:
    teads-aws:
      method: TeadsAWS
      path: '@grnsft/if-unofficial-plugins'
      global-config:
        interpolation: linear
tree:
  children:
    child:
      pipeline:
        - teads-aws # duration & config -> embodied
      defaults:
        cloud/instance-type: m5n.large
        interpolation: linear
        cpu/expected-lifespan: 252288000
      inputs:
        - timestamp: 2023-07-06T00:00
          duration: 3600
          cpu/utilization: 10
```

You can run this by passing it to `ie`. Run impact using the following command run from the project root:

```sh
npm i -g @grnsft/if
npm i -g @grnsft/if-unofficial-plugins
ie --manifest ./examples/manifests/test/teads-aws.yml --output ./examples/outputs/teads-aws.yml
```
