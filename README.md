# Actyx Time Machine

## Setup

* Clone this repository (verify that you have cloned the desired branch!)

* Copy any sources you need to create your fishes into the Actyx Time Machine project. You may add additional dependencies if your your fishes require them.

* Execute `npm install` to install all needed dependencies.

* Create a TypeScript file which exports your fishes as a default export like this:


```typescript
import { Fish } from '@actyx/pond'
import { mkTestFish } from './test/time-machine/test-fish/test-fish'

export default function (): Fish<any, any>[] {
  return [mkTestFish('name_1'), mkTestFish('name_2')]
}
```

* Edit the `package.json` file of the time machine so that the config entry `fishesfile` points towards your newly created file.
```json
"config": {
    "fishesfile": "./your-file.ts"
  },
```

## Usage

Execute `npm run start`

You should now be able to access the Actyx Time Machine at `http://localhost:1234/`


