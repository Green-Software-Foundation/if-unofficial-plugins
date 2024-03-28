# Timer

> [!NOTE] > `TimerStart` and `TimerStop` are community plugins, not part of the IF standard library. This means the IF core team are not closely monitoring these plugins to keep them up to date. You should do your own research before implementing them!

The `TimerStart` and `TimerStop` plugins are used to measure the time between two points in a pipeline. `TimerStart` is used to start the timer, and `TimerStop` is used to stop the timer and calculate the duration. The `TimerStart` plugin has no input parameters, and the `TimerStop` plugin has a single input parameter, `resets`, which is an array of booleans indicating whether the time should be reset. A reset replaces the `timestamp` with the start time measured by `TimerStart` and the `duration` with the difference between the time measured by `TimerStop` and `TimerStart`.

# Parameters

## observations

### `TimerStart`

- Has no input parameters.

### `TimerStop`

- `resets`: An array of booleans indicating whether the time should be reset. The length of the array has to be identical to the number of invocations of `TimerStop`.
- `timer/start`: Usually set by a prior invocation of `TimerStart`. (But that is no requirement.)

## Returns

### `TimerStart`

- `timer/start`: Set to the time of invocation of `TimerStart`.

### `TimerStop`

If reset is true:
- `timestamp`: set to the value of `timer/start`.
- `duration`: Set to the difference: time of invocation of `TimerStop` - time of invocation of `TimerStart`.
- deletes `timer/start` if present.

If reset is false:
- `duration`: Set to: `duration` + time of invocation of `TimerStop` - time of invocation of `TimerStart`.
- deletes `timer/start` if present.

## Manifest

The following is an example of how `TimerStart` and `TimerStop` can be invoked using a manifest.

```yaml
name: timer-demo
description: example manifest invoking timer methods
tags:
initialize:
  outputs:
    - yaml
  plugins:
    timer-start:
      method: TimerStart
      path: '@grnsft/if-unofficial-plugins'
    timer-stop:
      method: TimerStop
      path: '@grnsft/if-unofficial-plugins'
    exec-command:
      method: ShellExecCommand
      path: '@grnsft/if-unofficial-plugins'
tree:
  children:
    child:
      pipeline:
        - timer-start
        - exec-command
        - timer-stop
      config:
        exec-command:
          command: sleep 10
      inputs:
        - timestamp: 2024-02-25T00:00 # some placeholder timestamp that will be substituted by timer-start
          duration: 1 # if reset = true this will be overwritten, otherwise it will be added to
          resets: [true]
```

This will produce an output like this:

```yaml
name: timer-demo
description: example manifest invoking timer methods
tags: null
initialize:
  plugins:
    timer-start:
      path: '@grnsft/if-unofficial-plugins'
      method: TimerStart
    timer-stop:
      path: '@grnsft/if-unofficial-plugins'
      method: TimerStop
    exec-command:
      path: '@grnsft/if-unofficial-plugins'
      method: ExecShellCommand
  outputs:
    - yaml
tree:
  children:
    child:
      pipeline:
        - timer-start
        - exec-command
        - timer-stop
      config:
        exec-command:
          command: sleep 10
      inputs:
        - timestamp: 2024-02-25T00:00
          duration: 1
          resets:
            - true
      outputs:
        - timestamp: '2024-03-16T00:06:54.994Z'
          duration: 10.02
          resets: []
          stdout: ''
```
