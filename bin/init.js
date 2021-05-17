const { existsSync, readdirSync, copyFileSync } = require('fs')
const { join } = require('path')
const { copySync } = require('fs-extra')
const { execSync } = require('child_process')

function isEmpty(path) {
  return readdirSync(path).length === 0
}

const copyTimeMachineSources = (timeMachinePath) => {
  const pathToIndexJS = require.resolve('actyx-time-machine')
  const pathToModule = join(pathToIndexJS, '..')

  if (!existsSync(timeMachinePath) || isEmpty(timeMachinePath)) {
    console.log(`⚙️ Copying time-machine sources to ${timeMachinePath}`)
    try {
      copySync(pathToModule, timeMachinePath)
    } catch (error) {
      console.error(`❌ An error occured while copying sources: ${error}`)
      return
    }
    console.log('✔️ Successfully copied sources.')
  } else {
    console.error('❌ Could not initialize. Path is a not an empty folder!')
  }
}

module.exports = { copyTimeMachineSources }
