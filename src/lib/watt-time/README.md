# WattTime Grid Emissions Plugin

> [!NOTE] >
> `Watt-time` is a community plugin and not a part of the IF standard library. As a result, the IF core team does not closely monitor these plugins for updates. It is recommended to conduct your own research before implementing them.

## Introduction

WattTime technology—based on real-time grid data, cutting-edge algorithms, and machine learning—provides first-of-its-kind insight into your local electricity grid’s marginal emissions rate. [Read More...](https://www.watttime.org/api-documentation/#introduction)

## Overview

The `WattTimeGridEmissions` plugin is designed to compute the average carbon emissions of a power grid over a specified duration. It leverages data from the WattTime API to furnish carbon intensity information for precise locations and timeframes. This plugin proves beneficial for applications requiring carbon footprint monitoring or optimization, such as energy management systems or environmental impact assessments. The plugin supports only v3 version of the WattTime API. The API returns data in `lbs/MWh`, which the plugin converts to `Kg/MWh` (g/KWh) by dividing by `0.453592`.

### Authentication

WattTime API requires activation of subscription before usage. Please refer to the [WattTime website](https://watttime.org/docs-dev/data-plans/) for more information.

## Prerequisites

Before utilizing this plugin, ensure the following prerequisites are fulfilled:

1. **Environment Variables**: The plugin requires environment variables `WATT_TIME_USERNAME` and `WATT_TIME_PASSWORD` to be set. These credentials are utilized for authentication with the WattTime API.

**Required Parameters:**

```txt
WATT_TIME_USERNAME: <your-username>
WATT_TIME_PASSWORD: <your-password>
```

**Optional Parameter:**

```txt
WATT_TIME_TOKEN: <your-token>
```

2. **Dependencies**: Confirm the installation of all required dependencies, including `luxon` and `zod`. These dependencies are imperative for date-time manipulation and input validation, respectively.

## Usage

To employ the `WattTimeGridEmissions` plugin, adhere to these steps:

1. **Initialize Plugin**: Import the `WattTimeGridEmissions` function and initialize it with optional global configuration parameters.

2. **Execute Plugin**: Invoke the `execute` method of the initialized plugin instance with an array of input parameters. Each input parameter should include a `timestamp`, `duration`, and either `geolocation`, `cloud/region-wt-id`, or `cloud/region-geolocation` information.

3. **Result**: The plugin will return an array of plugin parameters enriched with the calculated average carbon intensity (`grid/carbon-intensity`) for each input.

## Input Parameters

The plugin expects the following input parameters:

- `timestamp`: A string representing the start time of the query period.
- `duration`: A number indicating the duration of the query period in seconds.
- `geolocation`: A string representing the latitude and longitude of the location in the format `latitude,longitude`. Alternatively, this information can be provided through `cloud/region-geolocation` or `cloud/region-wt-id` parameters.
- `cloud/region-geolocation`: Similar to `geolocation`, with calculations performed by the `cloud-metadata` plugin.
- `cloud/region-wt-id`: A string representing the region abbreviation associated with the location (e.g., 'CAISO_NORTH').
- `signal-type`: A string representing the signal type of the selected region (optional) (e.g., 'co2_moer').

## Output

The plugin enriches each input parameter with the average carbon intensity (`grid/carbon-intensity`) calculated over the specified duration.

## Error Handling

The plugin conducts input validation using the `zod` library and may throw errors if the provided parameters are invalid or if there are authentication or data retrieval issues with the WattTime API.

## Plugin Algorithm

1. **Initialization**: Authenticate with the WattTime API using the provided credentials. If the `token` is not provided in the environment variables, it uses `username` and `password`, otherwise, it throws an error. To authenticate users, the plugin utilizes the `https://api.watttime.org/login` URL.

2. **Execution**:

   - Iterate through each input.

     - If `cloud/region-wt-id is provided`, the plugin sets it to `region`, renames `signal-type` to `signal_type`, and sends a request to `https://api.watttime.org/v3/forecast/historical` endpoint with calculated `start` and `end` time as well. If the `signal_type` is not provided, the plugin requests `https://api.watttime.org/v3/my-access` to obtain access to the account and takes the first signal type from there.
     - If `geolocation` is provided, the plugin converts it to a `latitude` and `longitude` pair, renames `signal-type` to `signal_type`, and sends a request to `https://api.watttime.org/v3/region-from-loc` to retrieve the `region`. Then the `https://api.watttime.org/v3/forecast/historical` endpoint is called with `region`, `signal_type`, calculated `start` and `end` time from `timestamp` and `duration`.

   - Validate input parameters. If `cloud/region-geolocation` is provided, the `geolocation` is overridden. If `cloud/region-wt-id` is provided, it takes precedence over the `geolocation`.

   - Retrieve WattTime data for the specified duration. The WattTime API adds aggregated emissions for every 5 minutes. To address this limitation, the plugin sets the previous emission's value if the specified `duration` is less than 5 minutes.

   - Calculate average emissions based on retrieved data. The WattTime API returns full data for the entire duration; the plugin checks if the data's period time is within the specified input range and collects data in `kgMWh`.

3. **Output**: Return results with the average grid emissions for each input.

### TypeScript Usage

```ts
// Initialize the plugin
const plugin = WattTimeGridEmissions();

// Execute the plugin with input parameters
const inputs = [
  {
    timestamp: '2024-03-26T12:00:000Z',
    duration: 3600, // 1 hour
    geolocation: '36.7783,-119.417931', // San Francisco, CA
  },
  // Add more input parameters as needed
];
const result = await plugin.execute(inputs);

console.log(result);
```

### Manifest Usage

#### Input

```yaml
name: watt-time
description: simple demo invoking watt-time
tags:
initialize:
  plugins:
    watt-time:
      method: WattTimeGridEmissions
      path: '@grnsft/if-unofficial-plugins'
  outputs:
    - yaml
tree:
  children:
    child:
      pipeline:
        - watt-time
      inputs:
        - timestamp: '2024-03-05T00:00:00.000Z'
          duration: 3600
          geolocation: 36.7783,-119.417931
```

#### Output

```yaml
name: watt-time
description: simple demo invoking watt-time
tags: null
initialize:
  plugins:
    watt-time:
      path: '@grnsft/if-unofficial-plugins'
      method: WattTimeGridEmissions
  outputs:
    - yaml
tree:
  children:
    child:
      pipeline:
        - watt-time
      inputs:
        - timestamp: '2024-03-05T00:00:00.000Z'
          duration: 3600
          geolocation: 36.7783,-119.417931
      outputs:
        - timestamp: '2024-03-05T00:00:00.000Z'
          duration: 3600
          geolocation: 36.7783,-119.417931
          grid/carbon-intensity: 287.7032521512652
```

You can execute this by passing it to `ie`. Run the impact using the following command from the project root:

```sh
npm i -g @grnsft/if
npm i -g @grnsft/if-unofficial-plugins
ie --manifest ./examples/manifests/test/watt-time.yml --output ./examples/outputs/watt-time.yml
```
