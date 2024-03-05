# Electricity Maps Grid Emissions

> [!NOTE]
> `Electricity-Maps` is a community model, not part of the IF standard library. This means the IF core team are not closely monitoring these models to keep them up to date. You should do your own research before implementing them!

## Introduction

Electricity Maps provides real-time electricity data for more than 160 regions worldwide. We empower users to be more carbon-aware by measuring their emissions with greater accuracy. Our API provides access to hourly flow-traced carbon intensity data historically, in real-time, and forecasted for the next 24 hours. 

Our proprietary flow-tracing algorithm follows a peer-reviewed methodology to trace back all electricity flows and calculate the consumption grid mix adjusted for electricity imports and exports. This provides the most accurate calculation of emissions from electricity consumption.

[Read More...](https://www.electricitymaps.com/)


## Scope - UPDATE LIST OF INPUTS

Electricity Maps gathers in a single API hourly carbon intensity of electricity consumed worldwide. 

The model is based on Electricity Maps API historical data. It uses the following inputs:
* location: Location of the software system (latitude in decimal degrees, longitude in decimal degrees). "latitude,longitude" 
* timestamp: Timestamp of the recorded event (2021-01-01T00:00:00Z) RFC3339 
* duration: Duration of the recorded event in seconds (3600)


## Implementation - TO UPDATE

Limitations:
* Set of inputs are to be within 32 days of each other.
* Emissions are aggregated for every 5 minutes regardless of the granularity of the inputs.

### Authentication - TO UPDATE


WattTime API requires activation of subscription before usage. Please refer to the [WattTime website](https://www.watttime.org/get-the-data/data-plans/) for more information.

**Required Parameters:**
```
# example environment variable config , prefix the environment variables with "ENV" to load them inside the model.
# export WATT_TIME_USERNAME=test1
# export WATT_TIME_PASSWORD=test2
```
* username: Username for the WattTime API
  * ENV_WATT_TIME_USERNAME - specifying this value enables the Impact to load the value from the environment variable `WATT_TIME_USERNAME`
* password: Password for the WattTime API
  * ENV_WATT_TIME_PASSWORD - specifying this value enables the Impact to load the value from the environment variable `WATT_TIME_PASSWORD`


### inputs - TO UPDATE

**Required Parameters:**
* timestamp: Timestamp of the recorded event (2021-01-01T00:00:00Z) RFC3339
* location: Location of the software system (latitude in decimal degrees, longitude in decimal degrees). "latitude,longitude"
* duration: Duration of the recorded event in seconds (3600)

### Typescript Usage - TO UPDATE
```typescript
// environment variable configuration
// export WATT_TIME_USERNAME=test1
// export WATT_TIME_PASSWORD=test2
// use environment variables to configure the model
const env_model = await new WattTimeGridEmissions().configure('watt-time', {
  username: process.env.WATT_TIME_USERNAME,
  password: process.env.WATT_TIME_PASSWORD,
});
const inputs = [
  {
    timestamp: '2021-01-01T00:00:00Z',
    location: "43.22,-80.22",
    duration: 3600,
  },
];
const results = env_model.calculateEmissions(inputs);
```

### IMPL Usage - TO UPDATE
#### Environment Variable based configuration for IMPL - TO UPDATE
```yaml
# environment variable config , prefix the environment variables with "ENV" to load them inside the model.
# export WATT_TIME_USERNAME=test1
# export WATT_TIME_PASSWORD=test2
config:
  username: ENV_WATT_TIME_USERNAME
  password: ENV_WATT_TIME_PASSWORD
inputs:
  - timestamp: 2021-01-01T00:00:00Z
    location: "43.22,-80.21"
    duration: 3600
```
#### Static configuration for IMPL - TO UPDATE
```yaml
config:
  username: username
  password: password
inputs:
  - timestamp: 2021-01-01T00:00:00Z
    location: "43.22,-80.22"
    duration: 3600
```



## Example impl - TO UPDATE

```yaml
name: watt-time
description: simple demo invoking watt-time
tags:
initialize:
  models:
    - name: watt-time
      model: WattTimeGridEmissions
      path: '@grnsft/if-unofficial-models'
graph:
  children:
    child:
      pipeline:
        - watt-time
      config:
        watt-time:
          username: username
          password: password
      inputs:
        - timestamp: 2023-07-06T00:00
          duration: 3600
          thermal-design-power: 300
```
## Position and effects in the impl: - TO UPDATE
* Technically, WattTime model sets (or overwrites any preconfigured value of) the *grid-carbon-intensity* attribute.
* As such, it should be positioned before the *sci-o* model, if such a model is used.
