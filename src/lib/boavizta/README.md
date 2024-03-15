# Boavizta

> [!NOTE]
> Boavizta is a community plugin, not part of the IF standard library. This means the IF core team are not closely monitoring these plugins to keep them up to date. You should do your own research before implementing them!

[Boavizta](https://boavizta.org/) is an environmental impact calculator that exposes an API we use in IF to retrieve energy and embodied carbon estimates.

## Implementation

Boavizta exposes a [REST API](https://doc.api.boavizta.org/). If the `boavizta` plugin is included in an IF pipeline, IF sends API requests to Boavizta. The request payload is generated from input data provided to IF in an `manifest` file.

## Parameters

### Plugin global config

- `verbose`: determines how much information the API response contains (optional)

### Inputs

- `cpu/name`: the name of the physical processor being used (required for `BoaviztaCpuOutput`)
- `cpu/number-cores`: number of physical cores on a CPU (required for `BoaviztaCpuOutput`)
- `cpu/expected-lifespan`: the lifespan of the component, in seconds (optional)
- `country`: the country used to lookup grid carbon intensity, e.g. "USA" (optional - falls back to Boavizta default)
- `instance-type`: the name of the specific instance (required for `BoaviztaCloudOutput`, optional for `BoaviztaCpuOutput`)
- `provider`: the name of cloud provider (required for `BoaviztaCloudOutput`)
  One of the metric type should be provided in the input
- `cpu/utilization`: percentage CPU utilization for a given observation. If this metric is provided
- `gpu-util`: percentage GPU quantity for a given observation
- `ram-util`: number of RAM

## Returns

- `carbon-embodied`: carbon emitted in manufacturing the device, in gCO2eq
- `cpu/energy`: energy used by CPU in kWh

## Usage for `BoaviztaCpuOutput`

To run the `boavista-cpu` plugin an instance of `BoaviztaCpuOutput` must be created using `BoaviztaCpuOutput()` and, if applicable, passing global configurations. Subsequently, the `execute()` function can be invoked to retrieve data on `carbon-embodied` and `cpu/energy`.

This is how you could run the plugin in Typescript:

```typescript
import {BoaviztaCpuOutput} from '@grnsft/if-unofficial-plugins';

const output = BoaviztaCpuOutput({});
const usage = await output.execute([
  {
    timestamp: '2021-01-01T00:00:00Z',
    duration: 1,
    'cpu/utilization': 34,
    'cpu/name': 'Intel Xeon Gold 6138f',
    'cpu/number-cores': 24,
    'cpu/expected-lifespan': 4 * 365 * 24 * 60 * 60,
  },
  {
    timestamp: '2021-01-01T00:00:15Z',
    duration: 1,
    'cpu/utilization': 12,
    'cpu/name': 'Intel Xeon Gold 6138f',
    'cpu/number-cores': 24,
    'cpu/expected-lifespan': 4 * 365 * 24 * 60 * 60,
  },
  {
    timestamp: '2021-01-01T00:00:30Z',
    duration: 1,
    'cpu/utilization': 1,
    'cpu/name': 'Intel Xeon Gold 6138f',
    'cpu/number-cores': 24,
    'cpu/expected-lifespan': 4 * 365 * 24 * 60 * 60,
  },
  {
    timestamp: '2021-01-01T00:00:45Z',
    duration: 1,
    'cpu/utilization': 78,
    'cpu/name': 'Intel Xeon Gold 6138f',
    'cpu/number-cores': 24,
    'cpu/expected-lifespan': 4 * 365 * 24 * 60 * 60,
  },
]);
```

## Example `manifest`

In IF plugins are expected to be invoked from an `manifest` file. This is a yaml containing the plugin configuration and inputs. The following `manifest` initializes and runs the `boavizta-cpu` plugin:

```yaml
name: boavizta-demo
description: calls boavizta api
tags:
initialize:
  plugins:
    boavizta-cpu:
      method: BoaviztaCpuOutput
      path: '@grnsft/if-unofficial-plugins'
      global-config:
        allocation: LINEAR
        verbose: true
tree:
  children:
    child:
      pipeline:
        - boavizta-cpu
      defaults:
        cpu/number-cores: 24
        cpu/name: Intel® Core™ i7-1185G7
      inputs:
        - timestamp: 2023-07-06T00:00 # [KEYWORD] [NO-SUBFIELDS] time when measurement occurred
          duration: 3600 # Secs
          cpu/utilization: 18.392
        - timestamp: 2023-08-06T00:00 # [KEYWORD] [NO-SUBFIELDS] time when measurement occurred
          duration: 3600 # Secs
          cpu/utilization: 16
```

You can run this by passing it to `ie`. Run impact using the following command run from the project root:

```sh
npm i -g @grnsft/if
npm i -g @grnsft/if-unofficial-plugins
ie --manifest ./examples/manifests/test/boavizta.yml --output ./examples/outputs/boavizta.yml
```

## Usage for `BoaviztaCloudOutput`

To run the `boavista-cloud` plugin an instance of `BoaviztaCloudOutput` must be created using `BoaviztaCloudOutput()` and, if applicable, passing global configurations. Subsequently, the `execute()` function can be invoked to retrieve data on `carbon-embodied` and `cpu/energy`.

This is how you could run the plugin in Typescript:

```typescript
import {BoaviztaCloudOutput} from '@grnsft/if-unofficial-plugins';

const output = BoaviztaCloudOutput({});
const usage = await output.execute([
  {
    timestamp: '2021-01-01T00:00:00Z',
    duration: 15,
    'cpu/utilization': 34,
    'instance-type': 't2.micro',
    country: 'USA',
    provider: 'aws',
  },
]);
```

## Example `manifest`

In IF plugins are expected to be invoked from an `manifest` file. This is a yaml containing the plugin configuration and inputs. The following `manifest` initializes and runs the `boavizta-cloud` plugin:

```yaml
name: boavizta cloud demo
description: calls boavizta api
tags:
initialize:
  plugins:
    'boavizta-cloud':
      method: BoaviztaCloudOutput
      path: '@grnsft/if-unofficial-plugins'
tree:
  children:
    child:
      pipeline:
        - boavizta-cloud
      defaults:
        instance-type: r6g.medium
        provider: aws
      inputs:
        - timestamp: '2021-01-01T00:00:00Z'
          duration: 15 # Secs
          cpu/utilization: 34
```

You can run this by passing it to `ie`. Run impact using the following command run from the project root:

```sh
npm i -g @grnsft/if
npm i -g @grnsft/if-unofficial-plugins
ie --manifest ./examples/manifests/test/boavizta-cloud.yml --output ./examples/outputs/boavizta-cloud.yml
```
