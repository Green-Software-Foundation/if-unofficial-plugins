# WattTime Grid Emissions plugin

> [!NOTE] > `Watt-time` is a community plugin, not part of the IF standard library. This means the IF core team are not closely monitoring these plugins to keep them up to date. You should do your own research before implementing them!

## Introduction

WattTime technology—based on real-time grid data, cutting-edge algorithms, and machine learning—provides first-of-its-kind insight into your local electricity grid’s marginal emissions rate. [Read More...](https://www.watttime.org/api-documentation/#introduction)

## Scope

WattTime plugin provides a way to calculate emissions for a given time in a specific geolocation.

The plugin is based on the WattTime API. The plugin uses the following inputs:

- `timestamp`: Timestamp of the recorded event (2021-01-01T00:00:00Z) RFC3339
- `duration`: Duration of the recorded event in seconds (3600)
- `geolocation`: Location of the software system (latitude in decimal degrees, longitude in decimal degrees). "latitude,longitude"
- `cloud/region-geolocation`: The same as `geolocation`, with calculations performed by the `cloud-metadata` plugin
- `cloud/region-wt-id`: Region abbreviation associated with location (e.g. 'CAISO_NORTH')
- `signal-type`: The signal type of selected region (optional) (e.g 'co2_moer')

Either `geolocation`,`cloud/region-wt-id` or `cloud/region-geolocation` should be provided.

## Implementation

Limitations:

- Set of inputs are to be within 32 days of each other.
- Emissions are aggregated for every 5 minutes regardless of the granularity of the inputs.

### Authentication

WattTime API requires activation of subscription before usage. Please refer to the [WattTime website](https://watttime.org/docs-dev/data-plans/) for more information.

Create a `.env` file in the IF project root directory. This is where you can store your WattTime authentication details. Your `.env` file should look as follows:

**Required Parameters:**

```txt
WATT_TIME_USERNAME: <your-username>
WATT_TIME_PASSWORD: <your-password>
```

**Optional Parameter:**

```txt
WATT_TIME_TOKEN: <your-token>
```

### Plugin global config

- `base-url`: The URL for the WattTime API endpoint.

### Inputs

**Required Parameters:**

- `timestamp`: Timestamp of the recorded event (2021-01-01T00:00:00Z) RFC3339
- `duration`: Duration of the recorded event in seconds (3600)
- `geolocation`: Location of the software system (latitude in decimal degrees, longitude in decimal degrees). "latitude,longitude"
- `cloud/region-geolocation`: The same as `geolocation`, with calculations performed by the `cloud-metadata` plugin
- `cloud/region-wt-id`: Region abbreviation associated with location (e.g. 'CAISO_NORTH')

Either `geolocation`,`cloud/region-wt-id` or `cloud/region-geolocation` should be provided.

### Typescript Usage

```typescript
// environment variable configuration
// export WATT_TIME_USERNAME=test1
// export WATT_TIME_PASSWORD=test2
// use environment variables to configure the plugin
const output = WattTimeGridEmissions();
const result = await output.execute([
  {
    timestamp: '2021-01-01T00:00:00Z',
    geolocation: '43.22,-80.22',
    duration: 3600,
  },
]);
```

### Manifest Usage

#### Input for manifest

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

You can run this by passing it to `ie`. Run impact using the following command run from the project root:

```sh
npm i -g @grnsft/if
npm i -g @grnsft/if-unofficial-plugins
ie --manifest ./examples/manifests/test/watt-time.yml --output ./examples/outputs/watt-time.yml
```

## Position and effects in the manifest:

- Technically, WattTime plugin sets (or overwrites any preconfigured value of) the `grid/carbon-intensity` attribute.
- As such, it should be positioned before the _sci-o_ plugin, if such a plugin is used.
