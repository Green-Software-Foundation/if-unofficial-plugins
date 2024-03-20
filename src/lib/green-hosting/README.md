# Green Hosting

> [!NOTE] > `Green-Hosting` ([Green Web Foundation](https://www.thegreenwebfoundation.org/tools/green-web-dataset/)) is a community plugin, not part of the IF standard library. This means the IF core team are not closely monitoring these plugins to keep them up to date. You should do your own research before implementing them!

# Parameters

## observations

- `url`: the url of web page that is checked for green hosting.

## Returns

- `green-hosting`: boolean indicating whether a web page is hosted green or not according to the Green Web Foundation's database (API endpoint: https://api.thegreenwebfoundation.org/greencheck/{url})

## IMPL

The following is an example of how `GreenHosting` can be invoked using a manifest.

```yaml
name: green-hosting-demo
description: example manifest invoking green-hosting method
tags:
initialize:
  models:
    "green-hosting":
      method: GreenHostingModel
      path: '@grnsft/if-unofficial-plugins'
tree:
  children:
    child:
      pipeline:
        - green-hosting
      config:
      inputs:
        - timestamp: 2024-02-25T00:00
          duration: 1
          url: www.thegreenwebfoundation.org
```


