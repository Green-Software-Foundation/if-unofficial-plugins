# CO2.JS

> [!NOTE] > `CO2.JS` ([thegreenwebfoundation/co2.js](https://github.com/thegreenwebfoundation/co2.js)) is a community model, not part of the IF standard library. This means the IF core team are not closely monitoring these models to keep them up to date. You should do your own research before implementing them!

# Parameters

## model config

- `type`: supported models by the library, `swd` or `1byte`

## observations

- `bytes`: the number of bytes transferred
- `green-web-host`: true if the website is hosted on a green web host, false otherwise
- `duration`: the amount of time the observation covers, in seconds
- `timestamp`: a timestamp for the observation
- `options`: **SWD Model Only** an object containing any Sustainable Web Design specific variables to the changed. All keys are optional.
  - `dataReloadRatio` - a value between 0 and 1 representing the percentage of data that is downloaded by return visitors. -`firstVisitPercentage` - a value between 0 and 1 representing the percentage of new visitors.
  - `returnVisitPercentage` - a value between 0 and 1 representing the percentage of returning visitors.
  - `gridIntensity` - an object that can contain the following optional keys:
    - `device`
    - `dataCenter`
    - `networks`

The value for `device`, `dataCenter`, or `networks` can be a number representing the carbon intensity for the given segment (in grams per kilowatt-hour). Or, an object, which contains a key of country and a value that is an Alpha-3 ISO country code.

## Returns

- `operational-carbon`: carbon emissions from the operation of the website, in grams of CO2e

# IF Implementation

IF utilizes the CO2JS Framework to calculate the carbon emissions of a website. The CO2JS Framework is a collection of models that calculate the carbon emissions of a website based on different parameters. IF installs the CO2js npm package from `@tgwf/co2js` and invokes its functions from a model plugin.

The CO2JS Framework is a community model, not part of the IF standard library. This means the IF core team are not closely monitoring these models to keep them up to date. You should do your own research before implementing them!

## Usage

In IEF the model is called from an `impl`. An `impl` is a `.yaml` file that contains configuration metadata and usage inputs. This is interpreted by the command line tool, `impact-engine`. There, the model's `configure` method is called first.

The model config should define a `type` supported by the CO2.JS library (either `swd` or `1byte`). These are different ways to calculate the operational carbon associated with a web application; `swd` is shorthand for 'sustainable web design' model and `1byte` refers to the OneByte mdoel. You can read about the details of these models and how they differ at the [Green Web Foundation website](https://developers.thegreenwebfoundation.org/co2js/explainer/methodologies-for-calculating-website-carbon/).

Each input is expected to contain `bytes`, `green-web-host`, `duration` and `timestamp` fields.

## IMPL

The following is an example of how CO2.JS can be invoked using an `impl`.

```yaml
name: co2js-demo
description: example impl invoking CO2.JS model
tags:
initialize:
  models:
    - name: co2js
      model: Co2jsModel
      path: '@grnsft/if-unofficial-models'
graph:
  children:
    child:
      pipeline:
        - co2js
      config:
        co2js:
          type: swd
      inputs:
        - timestamp: 2023-07-06T00:00 # [KEYWORD] [NO-SUBFIELDS] time when measurement occurred
          duration: 1
          bytes: 1000000
          green-web-host: true
          options:
            dataReloadRatio: 0.6,
            firstVisitPercentage: 0.9,
            returnVisitPercentage: 0.1,
            gridIntensity:
              device: 560.98
              dataCenter:
                country: 'TWN'
```

This impl is run using `impact-engine` using the following command, run from the project root:

```sh
npm i -g @grnsft/if
npm i -g @grnsft/if-unofficial-models
impact-engine --impl ./examples/impls/test/co2js-test.yml --ompl ./examples/ompls/co2js-test.yml
```

This yields a result that looks like the following (saved to `/ompls/co2js-test.yml`):

```yaml
name: co2js-demo
description: example impl invoking CO2.JS model
tags:
initialize:
  models:
    - name: co2js
      model: Co2jsModel
      path: '@grnsft/if-unofficial-models'
graph:
  children:
    child:
      pipeline:
        - co2js
      config:
        co2js:
          type: swd
      inputs:
        - timestamp: 2023-07-06T00:00
          duration: 1
          bytes: 1000000
          green-web-host: true
      outputs:
        - timestamp: 2023-07-06T00:00
          operational-carbon: 0.03
          duration: 1
          bytes: 1000000
          green-web-host: true
          options:
            dataReloadRatio: 0.6,
            firstVisitPercentage: 0.9,
            returnVisitPercentage: 0.1,
            gridIntensity:
              device: 560.98
              dataCenter:
                country: 'TWN'
```

## TypeScript

You can see example Typescript invocations for each model below.

### SWD

```typescript
import {Co2jsModel} from '@grnsft/if-unofficial-models';

const co2js = await new Co2jsModel().configure({
  type: 'swd',
});
const results = co2js.execute([
  {
    duration: 3600, // duration institute
    timestamp: '2021-01-01T00:00:00Z', // ISO8601 / RFC3339 timestamp
    bytes: 1000000, // bytes transferred
    'green-web-host': true, // true if the website is hosted on a green web host, false otherwise
    options: {
      // Optional
      dataReloadRatio: 0.6,
      firstVisitPercentage: 0.9,
      returnVisitPercentage: 0.1,
      gridIntensity: {
        device: 560.98,
        dataCenter: 50,
        networks: 437.66,
      },
    },
  },
]);
```

### 1byte

```typescript
import {Co2jsModel} from '@grnsft/if-unofficial-models';

const co2js = await new Co2jsModel().configure({
  type: '1byte',
});
const results = co2js.execute([
  {
    duration: 3600, // duration institute
    timestamp: '2021-01-01T00:00:00Z', // ISO8601 / RFC3339 timestamp
    bytes: 1000000, // bytes transferred
    'green-web-host': true, // true if the website is hosted on a green web host, false otherwise
  },
]);
```
