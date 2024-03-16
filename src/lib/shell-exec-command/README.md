# ExecShellCommand

> [!NOTE] > `ShellExecCommand` is a community plugin and not part of the IF standard library. This means the IF core team are not closely monitoring these plugins to keep them up to date. You should do your own research before implementing them!

The `ShellExecCommand` plugin allows you to run shell commands from within your manifest file. This can be useful for running scripts or other commands that are not natively supported by IF.

# Parameters

## config

- `command`: The shell command to be executed.

## observations

No input values.

## Returns

- `stdout`: The standard output of the command if it exited with successfully.
-
In case of exit codes other than 0, nothing is written to input and a log message with the error is written to the console.

## Manifest

The following is an example of how `ShellExecCommand` can be invoked using a manifest.

```yaml
name: exec-shell-command-demo
description: example manifest invoking exec-shell-command
tags:
initialize:
  outputs:
    - yaml
  plugins:
    exec-command:
      method: ShellExecCommand
      path: '@grnsft/if-unofficial-plugins'
tree:
  children:
    child:
      pipeline:
        - exec-command
      config:
        exec-command:
          command: 'echo "Hello, World!"'
      inputs:
        - timestamp: 2024-02-25T00:00
          duration: 1
```

This will produce an output like this:

```yaml
name: exec-shell-command-demo
description: example manifest invoking exec-shell-command
tags:
initialize:
  outputs:
    - yaml
  plugins:
    exec-command:
      method: ShellExecCommand
      path: '@grnsft/if-unofficial-plugins'
tree:
  children:
    child:
      pipeline:
        - exec-command
      config:
        exec-command:
          command: 'echo "Hello, World!"'
      inputs:
        - timestamp: 2024-02-25T00:00
          duration: 1
      outputs:
        - timestamp: 2024-02-25T00:00
          duration: 1
          stdout: Hello, World!
```
