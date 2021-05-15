const { writeFileSync } = require('fs')
const { join, relative, normalize, sep, posix } = require('path')
const { execSync } = require('child_process')

const buildFishFile = (timeMachinePath, fishPath, fishFactoryCall) => {
  console.log('⚙️ Generating fishes.ts')

  const normalizedTimeMachinePath = normalize(timeMachinePath)
  const fishesExportFolder = join(normalizedTimeMachinePath, 'src', 'time-machine')

  const fishesTSImportPath = './' + relative(fishesExportFolder, fishPath)
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
    writeFileSync(join(fishesExportFolder, 'fishes.ts'), script)
  } catch (error) {
    console.error(`❌ Could not write fishes.ts: ${error}`)
  }
  console.log('✔️ Successfully generated fishes.ts')
}

const runParcelPackaging = (timeMachinePath) => {
  console.log('⚙️ Bundling and Running time-machine')
  const normalizedTimeMachinePath = normalize(timeMachinePath)
  const indexHTMLPath = join(normalizedTimeMachinePath, 'src', 'time-machine', 'index.html')
  const webrootPath = join(normalizedTimeMachinePath, 'webroot')

  execSync(`npx parcel ${indexHTMLPath} --out-dir ${webrootPath}`, {
    stdio: 'inherit',
  })
}

module.exports = { buildFishFile, runParcelPackaging }
