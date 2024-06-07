# Teads' CPU Estimation Plugin

> [!CAUTION] **This plugin is deprecated and will be deleted, likely before July 2024. Instead of providing a Teads plugin we have created a set of generic arithmetic plugins that can be chained together to replicate the behaviour of this plugin. We have added an example manifest to the IF repository to use as a template. You should start migrating your pipelines over to this method as soon as possible instead of relying on this Teads curve plugin.**

Teads Engineering team has built a plugin that is capable of estimating CPU usages across varying type of CPUs using a curve commonly known as Teads Curve.

## Parameters

### Plugin global config

- `interpolation`: the interpolation method to apply to the TDP data

### Inputs

- `cpu/thermal-design-power`: the TDp of the processor
- `cpu/utilization`: percentage CPU utilization for the input
- `duration`: the amount of time the observation covers, in seconds

## Returns

- `cpu/energy`: The energy used by the CPU, in kWh

> **Note** If `vcpus-allocated` and `vcpus-total` are available, these data will be used to scale the CPU energy usage. If they are not present, we assume the entire processor is being used. For example, if only 1 out of 64 available vCPUS are allocated, we scale the processor TDP by 1/64.

## Implementation

### Linear Interpolation

This plugin implements linear interpolation by default for estimating energy consumption using the TDP of a chip.

The power curve provided for `IDLE`, `10%`, `50%`, `100%` in the Teads Curve are used by default.

The algorithm in linear interpolation will take the lowest possible base value + linear interpolated value. ie. 75% usage will be calculated as follows.
`100%` and `50%` are the known values hence we are interpolating linearly between them.
(`50%` + `(100%-50%)` `x` `(75%-50%))` `x` `cpu/thermal-design-power`.

#### Example

```typescript
import {TeadsCurve} from '@grnsft/if-unofficial-plugins';

const teads = TeadsCurve({
  'cpu/thermal-design-power': 100, // cpu/thermal-design-power of the CPU
});
const results = await teads.execute([
  {
    duration: 3600, // duration institute
    timestamp: '2021-01-01T00:00:00Z', // ISO8601 / RFC3339 timestamp
    'cpu/utilization': 100, // CPU usage as a value between 0 to 100 in percentage
  },
]);
```

### Spline Curve Approximation

This method implements the spline curve approximation using `typescript-cubic-spline`. It is not possible to customize the spline behaviour as of now.

Resulting values are an estimate based on the testing done by Teads' Engineering Team. Further information can be found in the following links.

1. [TEADS Engineering: Building An AWS EC2 Carbon Emissions Dataset](https://medium.com/teads-engineering/building-an-aws-ec2-carbon-emissions-dataset-3f0fd76c98ac)
2. [TEADS Engineering: Estimating AWS EC2 Instances Power Consumption](https://medium.com/teads-engineering/estimating-aws-ec2-instances-power-consumption-c9745e347959)

#### Example

```typescript
import {TeadsCurve, Interpolation} from '@grnsft/if-unofficial-plugins';

const teads = TeadsCurve({interpolation: Interpolation.SPLINE});
const results = await teads.execute(
  [
    {
      duration: 3600, // duration institute
      timestamp: '2021-01-01T00:00:00Z', // ISO8601 / RFC3339 timestamp
      'cpu/utilization': 100, // CPU usage as a value between 0 to 100 in percentage
    },
  ],
  {
    'cpu/thermal-design-power': 100, // TDP of the CPU
  }
);
```

## Example `manifest`

```yaml
name: teads-curve
description: simple demo invoking teads-curve
tags:
initialize:
  plugins:
    teads-curve:
      method: TeadsCurve
      path: '@grnsft/if-unofficial-plugins'
      global-config:
        interpolation: spline
tree:
  children:
    child:
      pipeline:
        - teads-curve
      inputs:
        - timestamp: 2023-07-06T00:00
          duration: 3600
          cpu/thermal-design-power: 300
          cpu/utilization: 50
```

You can run this by passing it to `ie`. Run impact using the following command run from the project root:

```sh
npm i -g @grnsft/if
npm i -g @grnsft/if-unofficial-plugins
ie --manifest ./examples/manifests/test/teads-curve.yml --output ./examples/outputs/teads-curve.yml
```
