# Actyx Time Machine

## Requirements

If your project contains a version of @actyx/pond it must be 2.5.0 or higher.

## Installation

Install the package inside your own Actyx project (that contains your fishes) as a dev dependency.
The package is not yet published to the npm registry so it must be installed using the tarball.

`npm install actyx-time-machine-1.0.0.tgz --save-dev`

## Usage

Copy the required files into your project using:
`npx timeMachine init --path ./time-machine`
You can choose any path you like to store the time-machine. You may add it to your .gitignore file.

Start the time machine with the fish you wish to test:

`npx timeMachine run --path ./time-machine --fishFile ./your-fishes/your-fish --fishConstructor "yourFishConstructor('fish-name')"`

--fishFile must be the file that contains the constructor (or constant) which you use to get your fish. Do not add the file extension (.ts)!

--fishConstructor must be the TypeScript call that you use to get your fish. E.g. `"of('fish-name')"`, `"mkYourFish('fish-name')"` or `"singletonFish"`.
Make sure it is surrounded by quotes.

The time-machine will then be build and run using your provided fish.
