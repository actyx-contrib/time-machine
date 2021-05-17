const { writeFileSync } = require('fs')
const { join, relative, normalize, sep, posix } = require('path')
const { execSync } = require('child_process')

const buildFishFile = (timeMachinePath, userFishPath, fishFactoryCall) => {
  console.log('⚙️ Generating fishes.ts')

  const normalizedTimeMachinePath = normalize(timeMachinePath)

  const fishesTSImportPath = './' + relative(normalizedTimeMachinePath, userFishPath)
  const [fishFactoryFunction] = fishFactoryCall.split(/[.(]/)
  const script = `import { Fish } from '@actyx/pond'

import { ${fishFactoryFunction} } from '${fishesTSImportPath.split(sep).join(posix.sep)}'

export default function fishes(): Fish<any, any>[] {
    return [
        ${fishFactoryCall} 
    ]
}
`

  try {
    writeFileSync(join(normalizedTimeMachinePath, 'fishes.ts'), script)
  } catch (error) {
    console.error(`❌ Could not write fishes.ts: ${error}`)
  }
  console.log('✔️ Successfully generated fishes.ts')
}

const runParcelPackaging = (timeMachinePath) => {
  console.log('⚙️ Bundling and Running time-machine')
  const normalizedTimeMachinePath = normalize(timeMachinePath)
  const indexHTMLPath = join(normalizedTimeMachinePath, 'index.html')
  const webrootPath = join(normalizedTimeMachinePath, 'webroot')

  execSync(`npx parcel ${indexHTMLPath} --out-dir ${webrootPath}`, {
    stdio: 'inherit',
  })
}

module.exports = { buildFishFile, runParcelPackaging }
