# Actyx Time Machine

## Option 1: (RECOMMENDED) Clone this project and copy your sources into it 

### Requirements

This option has no special requirements.

### Setup

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

### Usage

Execute `npm run start`

You should now be able to access the Actyx Time Machine at `http://localhost:1234/`

## Option 2: Using npm to install and run Actyx Time Machine inside your project

### Requirements

If your project contains a version of @actyx/pond it must be 2.5.0 or higher.

### Setup

Install the package inside your own Actyx project (that contains your fishes) as a dev dependency.
The package is not yet published to the npm registry so it must be installed using the tarball.

`npm install actyx-time-machine-0.2.0.tgz --save-dev`

### Usage

Copy the required files into your project using:
`npx timeMachine init --path ./time-machine`
You can choose any path you like to store the time-machine. You may add it to your .gitignore file.

Start the time machine with the fish you wish to test:

`npx timeMachine run --path ./time-machine --fishFile ./your-fishes/your-fish --fishConstructor "yourFishConstructor('fish-name')"`

--fishFile must be the file that contains the constructor (or constant) which you use to get your fish. Do not add the file extension (.ts)!

--fishConstructor must be the TypeScript call that you use to get your fish. E.g. `"of('fish-name')"`, `"mkYourFish('fish-name')"` or `"singletonFish"`.
Make sure it is surrounded by quotes.

The time-machine will then be built and run using your provided fish.

You should now be able to access the Time Machine at `http://localhost:1234/`

