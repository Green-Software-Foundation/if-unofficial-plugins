# MeasureWebpage

> [!NOTE] > `Lighthouse` (based on [Lighthouse](https://github.com/GoogleChrome/lighthouse)) is a community plugin, not part of the IF standard library. This means the IF core team are not closely monitoring these plugins to keep them up to date. You should do your own research before implementing them!

TODO...

# Parameters

## model config

## observations

- `url`: the URL of the webpage to measure (has to include the protocl type, like https://)
- `timestamp`: the timestamp is used to in the filepath to the lighthouse report. If `timer/start` is present (from `TimerStart` plugin), then that is used instead.

## Returns

TODO: outdated
- `network/data/bytes`: page weight in bytes
- `lighthouse-report`: file path to the full lighthouse report in html format

## Manifest

The following is an example of how `Lighthouse` can be invoked using a manifest.

```yaml
name: measure-webpage-demo
description: example manifest invoking Lighthouse method
tags:
initialize:
  models:
    - name: lighthouse
      method: Lighthouse
      path: '@grnsft/if-unofficial-plugins'
tree:
  children:
    child:
      pipeline:
        - lighthouse
      config:
      inputs:
        - timestamp: 2024-02-25T00:00
          duration: 1
          url: https://github.com/GoogleChrome/lighthouse
```


