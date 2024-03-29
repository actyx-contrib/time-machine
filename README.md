# IMPORTANT NOTICE

**This repository has been archived and is no longer maintained. You are welcome to copy the code into your own projects and continue using it at your own discretion and risk.**

# Actyx Time Machine

## About

Actyx Time Machine is a graphical tool which aims to help developers troubleshoot their twins/fishes. It simulates the events that have occurred up to a selected point in time and applies them to a user-supplied twin/fish. More precisely, the selected events are given into the `onEvent`-Function of the twin/fish and the resulting state is calculated. This can help you with determining which event has led to an invalid or unexpected twin-/fish-state.

![Screenshot](https://i.imgur.com/6nt7Cu9.png)

## Prerequisites

- You need to have access to the TypeScript source files of your twins/fishes.
- The events you want to apply to the twin/fish must be present on your local instance of ActyxOS.

## Setup

- Clone this repository

- Copy any sources you need to build your fishes into the Actyx Time Machine project. You may add additional dependencies if your fishes require them.

- Execute `npm install` to install all needed dependencies.

- Create a TypeScript file which exports your fishes as a default export. An example for this can be taken from `example-fishes.ts`:

```typescript
import { Fish } from '@actyx/pond'
import { mkTestFish } from './test/time-machine/test-fish/test-fish'

export default function (): Fish<any, any>[] {
  return [mkTestFish('name_1'), mkTestFish('name_2')]
}
```

In your case, you would replace `mkTestFish('name_1')` with the constructor of your own fish. This file will later make your fishes available to the Actyx Time Machine. You may freely choose a name and a location to store the file.

- Edit the `package.json` file of the time machine so that the config entry `fishesfile` points towards your newly created file.

```json
"config": {
    "fishesFile": "./your-file.ts",
  },
```

## Usage

Execute `npm run start`

You should now be able to access the Actyx Time Machine at `http://localhost:1234/`

## Known issues

- The sliders for selecting the events also count events that do not match the chosen tags. This results in a higher number of shown events than relevant to the selected fish. Will be fixed once Actyx Query Language is integrated into this project.

- The forward and backward buttons for selecting the events may show unexpected behavior when sync is enabled. This is related to events having a different ordering when sorted by clock-timestamp compared to when sorted by lamport-timestamp. Will also be fixed once Actyx Query Language is integrated into this project.
