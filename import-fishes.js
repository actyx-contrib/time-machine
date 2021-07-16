/* eslint-disable @typescript-eslint/no-var-requires */

const yargs = require('yargs')
const { join, relative, sep, posix } = require('path')
const { writeFileSync, existsSync } = require('fs')

// Get arguments from console
const args = yargs.option('path', {
  type: 'string',
  demandOption: 'false',
  default: process.env.npm_package_config_fishesfile,
  describe: 'Path to the .ts file which holds your fishes as a default export',
}).argv

console.log(`🔹 Path parameter: ${args.path}`)
// Validate argument path
try {
  if (!existsSync(args.path)) {
    console.error(`❌ Error opening file: Path does not exist`)
    return
  }
} catch (error) {
  console.error(`❌ Error opening file: ${error}`)
  return
}

// Generate fishes.ts which will be imported by the time-machine

console.log('⚙️ Generating fishes.ts')
const timeMachinePath = __dirname
const srcPath = join(timeMachinePath, 'src', 'time-machine')
const userFishFilePath = './' + relative(srcPath, args.path).split(sep).join(posix.sep)
const userFishImportPath = userFishFilePath.split('.').slice(0, -1).join('.')

const script = `import { Fish } from '@actyx/pond'

import Fishes from '${userFishImportPath}'

export function fishes(): Fish<any, any>[] {
    return Fishes()
}
`

try {
  writeFileSync(join(srcPath, 'fishes.ts'), script)
} catch (error) {
  console.error(`❌ Could not write fishes.ts: ${error}`)
  return
}

console.log('✔️ Successfully generated fishes.ts')
