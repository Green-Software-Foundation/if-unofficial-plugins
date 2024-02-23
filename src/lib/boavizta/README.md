# Boavizta

> [!NOTE]
> Boavizta is a community plugin, not part of the IF standard library. This means the IF core team are not closely monitoring these plugins to keep them up to date. You should do your own research before implementing them!

[Boavizta](https://boavizta.org/) is an environmental impact calculator that exposes an API we use in IEF to retrieve energy and embodied carbon estimates.

## Implementation

Boavizta exposes a [REST API](https://doc.api.boavizta.org/). If the `boavizta` plugin is included in an IEF pipeline, IEF sends API requests to Boavizta. The request payload is generated from input data provided to IEF in an `manifest` file.

## Parameters

### Plugin config

- `allocation`: manufacturing impacts can be reported with two allocation strategies: `TOTAL` is the total impact without adjusting for usage. `LINEAR` distrbutes the impact linearly over the lifespan of a device. See [Boavizta docs](https://doc.api.boavizta.org/Explanations/manufacture_methodology/#hover-a-specific-duration-allocation-linear) for more info.
- `cpu/name`: the name of the physical processor being used
- `cpu/number-cores`: number of physical cores on a CPU
- `verbose`: determines how much information the API response contains (optional)
- `cpu/expected-lifespan`: the lifespan of the component, in seconds
- `country`: the country used to lookup grid carbon intensity, e.g. "USA" (optional - falls back to Boavizta default)

### Observations

- `cpu/utilization`: percentage CPU utilization for a given observation

## Returns

- `carbon-embodied`: carbon emitted in manufacturing the device, in gCO2eq
- `energy-cpu`: energy used by CPU in kWh

## Usage

To run the `boavista-cpu` plugin an instance of `BoaviztaCpuImpact` must be created and its `execute()` method called, passing `duration`,`cpu/utilization`,`timestamp` arguments.

This is how you could run the plugin in Typescript:

```typescript
import {BoaviztaCpuImpact} from '@grnsft/if-unofficial-plugins';

async function runBoavizta() {
  const output = BoaviztaCpuImpact({});
  const usage = await output.calculate([
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

  console.log(usage);
}

runBoavizta();
```

## Example `manifest`

In IEF plugins are expected to be invoked from an `manifest` file. This is a yaml containing the plugin configuration and inputs. The following `manifest` initializes and runs the `boavizta-cpu` plugin:

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

You can run this by passing it to `if`. Run impact using the following command run from the project root:

```sh
npm i -g @grnsft/if
npm i -g @grnsft/if-unofficial-plugins
if --manifest ./examples/manifests/test/boavizta.yml --output ./examples/outputs/boavizta.yml
```
