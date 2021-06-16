# Actyx Time Machine

## About

Actyx Time Machine is a graphical tool which aims to help developers troubleshoot their twins/fishes. It simulates the events that have occurred up to a selected point in time and applies them to a user-supplied twin/fish. More precisely, the selected events are given into the `onEvent`-Function of the twin/fish and the resulting state is calculated. This can help you with determining which event has led to an invalid or unexpected twin-/fish-state.

## Prerequisites

- You need to have access to the TypeScript source files of your twins/fishes.
- The events you want to apply to the twin/fish must be present on your local instance of ActyxOS.

## Setup

- Clone this repository (verify that you have cloned the desired branch!)

- Copy any sources you need to create your fishes into the Actyx Time Machine project. You may add additional dependencies if your your fishes require them.

- Execute `npm install` to install all needed dependencies.

- Create a TypeScript file which exports your fishes as a default export like this:

```typescript
import { Fish } from '@actyx/pond'
import { mkTestFish } from './test/time-machine/test-fish/test-fish'

export default function (): Fish<any, any>[] {
  return [mkTestFish('name_1'), mkTestFish('name_2')]
}
```

- Edit the `package.json` file of the time machine so that the config entry `fishesfile` points towards your newly created file. You may also edit the entry `pondurl`, if you want to connect to an ActyxOS instance that is not running on your localhost.

```json
"config": {
    "fishesfile": "./your-file.ts",
    "pondurl": "ws://localhost:4243/store_api"
  },
```

## Usage

Execute `npm run start`

You should now be able to access the Actyx Time Machine at `http://localhost:1234/`
