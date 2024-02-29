# WattTime Grid Emissions plugin

> [!NOTE] > `Watt-time` is a community plugin, not part of the IF standard library. This means the IF core team are not closely monitoring these plugins to keep them up to date. You should do your own research before implementing them!

## Introduction

WattTime technology—based on real-time grid data, cutting-edge algorithms, and machine learning—provides first-of-its-kind insight into your local electricity grid’s marginal emissions rate. [Read More...](https://www.watttime.org/api-documentation/#introduction)

## Scope

WattTime plugin provides a way to calculate emissions for a given time in a specific geolocation.

The plugin is based on the WattTime API. The plugin uses the following inputs:

- `geolocation`: Location of the software system (latitude in decimal degrees, longitude in decimal degrees). "latitude,longitude"
- `timestamp`: Timestamp of the recorded event (2021-01-01T00:00:00Z) RFC3339
- `duration`: Duration of the recorded event in seconds (3600)

## Implementation

Limitations:

- Set of inputs are to be within 32 days of each other.
- Emissions are aggregated for every 5 minutes regardless of the granularity of the inputs.

### Authentication

WattTime API requires activation of subscription before usage. Please refer to the [WattTime website](https://www.watttime.org/get-the-data/data-plans/) for more information.

**Required Parameters:**

```
# example environment variable config , prefix the environment variables with "ENV" to load them inside the plugin.
# export WATT_TIME_USERNAME=test1
# export WATT_TIME_PASSWORD=test2
```

- username: Username for the WattTime API
  - ENV_WATT_TIME_USERNAME - specifying this value enables the Impact to load the value from the environment variable `WATT_TIME_USERNAME`
- password: Password for the WattTime API
  - ENV_WATT_TIME_PASSWORD - specifying this value enables the Impact to load the value from the environment variable `WATT_TIME_PASSWORD`

### inputs

**Required Parameters:**

- `timestamp`: Timestamp of the recorded event (2021-01-01T00:00:00Z) RFC3339
- `geolocation`: Location of the software system (latitude in decimal degrees, longitude in decimal degrees). "latitude,longitude"
- `duration`: Duration of the recorded event in seconds (3600)

### Typescript Usage

```typescript
// environment variable configuration
// export WATT_TIME_USERNAME=test1
// export WATT_TIME_PASSWORD=test2
// use environment variables to configure the plugin
const output = WattTimeGridEmissions({
  username: process.env.WATT_TIME_USERNAME,
  password: process.env.WATT_TIME_PASSWORD,
});
const result = await output.execute([
  {
    timestamp: '2021-01-01T00:00:00Z',
    geolocation: '43.22,-80.22',
    duration: 3600,
  },
]);
```

### manifest Usage

#### Environment Variable based configuration for manifest

```yaml
# environment variable config , prefix the environment variables with "ENV" to load them inside the plugin.
# export WATT_TIME_USERNAME=test1
# export WATT_TIME_PASSWORD=test2
global-config:
  username: ENV_WATT_TIME_USERNAME
  password: ENV_WATT_TIME_PASSWORD
```

#### Static configuration for manifest

```yaml
inputs:
  - timestamp: 2021-01-01T00:00:00Z
    geolocation: '43.22,-80.22'
    duration: 3600
```

## Example manifest

```yaml
name: watt-time
description: simple demo invoking watt-time
tags:
initialize:
  plugins:
    watt-time:
      method: WattTimeGridEmissions
      path: '@grnsft/if-unofficial-plugins'
      global-config:
        username: username
        password: password
tree:
  children:
    child:
      pipeline:
        - watt-time
      inputs:
        - timestamp: 2023-07-06T00:00
          duration: 3600
          geolocation: 37.7749,-122.4194
```

You can run this by passing it to `if`. Run impact using the following command run from the project root:

```sh
npm i -g @grnsft/if
npm i -g @grnsft/if-unofficial-plugins
if --manifest ./examples/manifests/test/watt-time.yml --output ./examples/outputs/watt-time.yml
```

## Position and effects in the manifest:

- Technically, WattTime plugin sets (or overwrites any preconfigured value of) the `grid/carbon-intensity` attribute.
- As such, it should be positioned before the _sci-o_ plugin, if such a plugin is used.
