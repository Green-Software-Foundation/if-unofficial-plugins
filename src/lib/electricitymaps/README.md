# Electricity Maps Grid Emissions

> [!NOTE]
> `Electricity-Maps` is a community model, not part of the IF standard library. This means the IF core team are not closely monitoring these models to keep them up to date. You should do your own research before implementing them!

## Introduction

Electricity Maps provides real-time electricity data for more than 160 regions worldwide. It empowers users to be more carbon-aware by measuring their emissions with greater accuracy. The API provides access to hourly flow-traced carbon intensity data historically, in real-time, and forecasted for the next 24 hours.

The proprietary flow-tracing algorithm follows a peer-reviewed methodology to trace back all electricity flows and calculate the consumption grid mix adjusted for electricity imports and exports. This provides the most accurate calculation of emissions from electricity consumption.

[Read More...](https://www.electricitymaps.com/)


## Scope - LIST OF INPUTS

Electricity Maps gathers in a single API hourly carbon intensity of electricity consumed worldwide.

The model is based on Electricity Maps API historical data. It uses the following inputs:
* longitude: Location of the software system connected to a grid (latitude in decimal degrees, longitude in decimal degrees).
* latitude: Location of the software system connected to a grid (latitude in decimal degrees, longitude in decimal degrees).
* timestamp: Timestamp of the recorded event (2021-01-01T00:00:00Z) RFC3339
* duration: Duration of the recorded event in seconds (3600)


## Implementation

Limitations:
* A single event can last at most 10 days.
* The intensity or the emissions are aggregated over the duration of the event using hourly data from the API.

### Authentication


ElectricityMaps' API requires you to get a token before using it. You can request a free token here [ElectricityMaps' website](https://api-portal.electricitymaps.com/).

**Required Parameters:**
You should set the token in the environment variable `EMAPS_TOKEN` and in the configuration file.
```bash
# export EMAPS_TOKEN=your_token
```
* emaps_token: Token for using the ElectricityMaps API.
  * ENV_EMAPS_TOKEN - Enables the Impact framework to load the value from the environment variable.


### inputs

**Required Parameters:**
* timestamp: Timestamp of the recorded event (2021-01-01T00:00:00Z) RFC3339
* longitude: Longitude of the software system connected to a grid (12.5683).
* latitude: Latitude of the software system connected to a grid (55.6761).
* duration: Duration of the recorded event in seconds (3600)
* (optional) power_consumption: If available to you, you can provide the average power consumption in kWh for the duration of the event. This will allow the model to calulate the total emissions for the event. If not provided, the model will calculate the average carbon intensity of the grid for the duration of the event.

## Usage
### In Typescript
Set up the environment variable before running the code.
```bash
# export EMAPS_TOKEN=your_token
```

```typescript
const grid_model = await new ElectricityMapsModel().configure('electricitymaps');
const inputs = [
  {
    timestamp: '2024-03-18T01:36:00Z',
    longitude: 12.5683,
    latitude: 55.6761,
    duration: 3600,
  },
];
const outputs = grid_model.execute(inputs);
```

### IMPL Usage
#### Configuration
First you need to set the token in the environment variable `EMAPS_TOKEN` and in the configuration file.
```bash
# export EMAPS_TOKEN=your_token
```

```yaml
config:
  token: ENV_EMAPS_TOKEN
inputs:
  - timestamp: '2024-03-18T01:36:00Z'
    longitude: 12.5683
    latitude: 55.6761
    duration: 3600
```



## Example IMPL

```yaml
name: electricitymaps-demo
description: example usage of electricitymaps model
tags:
initialize:
  models:
    - name: electricitymaps
      model: ElectricityMapsCarbonIntensityModel
      path: '@grnsft/if-unofficial-models'
graph:
  children:
    child:
      pipeline:
        - electricitymaps
      inputs:
        - timestamp: '2024-03-18T01:36:00Z'
          longitude: 12.5683
          latitude: 55.6761
          duration: 3600
        - timestamp: '2024-03-18T01:36:00Z'
          longitude: 12.5683
          latitude: 55.6761
          duration: 3600
          power_consumption: 100
```

### Output
The model returns the average carbon intensity of the grid for the duration of the event. If the power consumption is provided, the model will also return the total emissions for the event.

```json
[
  {
    "carbon_intensity": 0.3,
    "unit": "kgCO2eq/kWh",
  },
  {
    "carbon_intensity": 0.3,
    "unit": "kgCO2eq",
  }
]
```