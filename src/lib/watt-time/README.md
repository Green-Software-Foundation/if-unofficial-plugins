# WattTime Grid Emissions Model

> [!NOTE] > `Watt-time` is a community model, not part of the IF standard library. This means the IF core team are not closely monitoring these models to keep them up to date. You should do your own research before implementing them!

## Introduction

WattTime technology—based on real-time grid data, cutting-edge algorithms, and machine learning—provides first-of-its-kind insight into your local electricity grid’s marginal emissions rate. [Read More...](https://www.watttime.org/api-documentation/#introduction)

## Scope

WattTime Model provides a way to calculate emissions for a given time in a specific location.

The model is based on the WattTime API. The model uses the following inputs:

- location: Location of the software system (latitude in decimal degrees, longitude in decimal degrees). "latitude,longitude"
- timestamp: Timestamp of the recorded event (2021-01-01T00:00:00Z) RFC3339
- duration: Duration of the recorded event in seconds (3600)

## Implementation

Limitations:

- Set of inputs are to be within 32 days of each other.
- Emissions are aggregated for every 5 minutes regardless of the granularity of the inputs.

### Authentication

WattTime API requires activation of subscription before usage. Please refer to the [WattTime website](https://www.watttime.org/get-the-data/data-plans/) for more information.

**Required Parameters:**

```
# example environment variable config , prefix the environment variables with "ENV" to load them inside the model.
# export WATT_TIME_USERNAME=test1
# export WATT_TIME_PASSWORD=test2
```

- username: Username for the WattTime API
  - ENV_WATT_TIME_USERNAME - specifying this value enables the Impact to load the value from the environment variable `WATT_TIME_USERNAME`
- password: Password for the WattTime API
  - ENV_WATT_TIME_PASSWORD - specifying this value enables the Impact to load the value from the environment variable `WATT_TIME_PASSWORD`

### inputs

**Required Parameters:**

- timestamp: Timestamp of the recorded event (2021-01-01T00:00:00Z) RFC3339
- location: Location of the software system (latitude in decimal degrees, longitude in decimal degrees). "latitude,longitude"
- duration: Duration of the recorded event in seconds (3600)

### Typescript Usage

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
    location: '43.22,-80.22',
    duration: 3600,
  },
];
const results = env_model.calculateEmissions(inputs);
```

### IMPL Usage

#### Environment Variable based configuration for IMPL

```yaml
# environment variable config , prefix the environment variables with "ENV" to load them inside the model.
# export WATT_TIME_USERNAME=test1
# export WATT_TIME_PASSWORD=test2
config:
  username: ENV_WATT_TIME_USERNAME
  password: ENV_WATT_TIME_PASSWORD
inputs:
  - timestamp: 2021-01-01T00:00:00Z
    location: '43.22,-80.21'
    duration: 3600
```

#### Static configuration for IMPL

```yaml
config:
  username: username
  password: password
inputs:
  - timestamp: 2021-01-01T00:00:00Z
    location: '43.22,-80.22'
    duration: 3600
```

## Example impl

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
          location: 37.7749,-122.4194
```

You can run this by passing it to `impact-engine`. Run impact using the following command run from the project root:

```sh
npm i -g @grnsft/if
npm i -g @grnsft/if-unofficial-models
impact-engine --impl ./examples/impls/test/watt-time.yml --ompl ./examples/ompls/watt-time.yml
```

## Position and effects in the impl:

- Technically, WattTime model sets (or overwrites any preconfigured value of) the _grid-carbon-intensity_ attribute.
- As such, it should be positioned before the _sci-o_ model, if such a model is used.
