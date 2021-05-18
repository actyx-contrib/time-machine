/* eslint-disable @typescript-eslint/no-var-requires */
const { existsSync, readdirSync } = require('fs')
const { join } = require('path')
const { copySync } = require('fs-extra')

function isEmpty(path) {
  return readdirSync(path).length === 0
}

const copyTimeMachineSources = (userTimeMachinePath) => {
  const pathToIndexJS = require.resolve('actyx-time-machine')
  const pathToTimeMachineSources = join(pathToIndexJS, '..', 'src', 'time-machine')

  if (!existsSync(userTimeMachinePath) || isEmpty(userTimeMachinePath)) {
    console.log(`⚙️ Copying time-machine sources to ${userTimeMachinePath}`)
    try {
      copySync(pathToTimeMachineSources, userTimeMachinePath)
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
