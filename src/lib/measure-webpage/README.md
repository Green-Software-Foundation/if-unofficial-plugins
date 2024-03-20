# MeasureWebpage

> [!NOTE] > `MeasureWebpage` (based on [Puppeteer](https://github.com/puppeteer/puppeteer)) is a community plugin, not part of the IF standard library. This means the IF core team are not closely monitoring these plugins to keep them up to date. You should do your own research before implementing them!

The `MeasureWebpage` plugin measures the weight of a webpage in bytes and the weight of the resources categorized by type. It can also measure, within certain restrictions, the percentage of data that needs to be reloaded if the page is revisited. The plugin is build with Puppeteer.

# Parameters

## model config

- `mobileDevice:`: You can pick a mobile device to emulate. Must be one of puppeteer's known devices: https://pptr.dev/api/puppeteer.knowndevices
- `scrollToBottom`: If true, emulates a user scrolling to the bottom of the page (which loads all content that isn't loaded on initial load). If false, the page is not scrolled. Default is false.
- `switchOffJavaScript`: If true, JavaScript is disabled. If false, JavaScript is enabled. Default is false.
- `timeout`: Maximum wait time in milliseconds. Pass 0 to disable the timeout. https://pptr.dev/api/puppeteer.page.setdefaultnavigationtimeout
- `headers`:
  - `accept`: string https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept
  - `accept-encoding`: array of allowed encodings (a single encoding can also be passed as a string) https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding

## observations

- `url`: the URL of the webpage to measure (has to include the protocl type, like https://)

## Returns

- `network/data/bytes`: page weight in bytes
- `network/data/resources/bytes`: resources weights by category in bytes
- `dataReloadRatio`: the percentage of data that is downloaded by return visitors (can be fed into the CO2.JS plugin)
  if `options.dataReloadRatio` is already provided in input, the plugin won't calculate it

# Further Info

Cookies are not supported.
Device emulation only sets screen size and user agent. It does not throttle network speed or CPU to match device capabilities.

The measurement of `dataReloadRatio` is based on incomplete knowledge.

TODO: explain approach for calculation and its weaknesses (the ones I know of, dynamic content, timing, service workers)


## Manifest

The following is an example of how `MeasureWebpage` can be invoked using a manifest.

```yaml
name: measure-webpage-demo
description: example manifest invoking MeasureWebpage method
tags:
initialize:
  models:
    - name: measure-webpage
      method: MeasureWebpage
      path: '@grnsft/if-unofficial-plugins'
tree:
  children:
    child:
      pipeline:
        - measure-webpage
      config:
      inputs:
        - timestamp: 2024-02-25T00:00
          duration: 1
          url: https://github.com/puppeteer/puppeteer
```
