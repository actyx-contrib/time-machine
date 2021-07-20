/**
 * @jest-environment jsdom
 */
import React from 'react'
import { App } from '../../src/time-machine/App'
import { fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mkTestFish } from './test-fish/test-fish'
import { Pond } from '@actyx/pond'
import { addEventsToTestPond } from './pond-utils'
import mockedSlider, { SliderUtil } from './material-ui-utils'

// Inject testing pond into the application
const mockPond = getTestPondWithTestFishEvents()
jest.mock('@actyx-contrib/react-pond', () => ({
  usePond: () => {
    return mockPond
  },
}))

//Inject testing fish into the application
const mockFish = mkTestFish('test-fish_1')
jest.mock('../../src/time-machine/fishes', () => ({
  fishes: () => {
    return [mockFish]
  },
}))

test('Application successfully loads and shows event sources for the imported test-fish', async () => {
  render(<App />)

  //Application has loaded (received response from the pond)
  expect(await screen.findByText('Actyx Time Machine')).toBeInTheDocument()

  //Test-Fish was imported and tags are correct
  expect(await screen.findByText("'test-fish' & 'test-fish:test-fish_1'")).toBeInTheDocument()

  //Events that match the tags of the fish were found and a source slider is rendered
  const sourceSliderContainer = await screen.findByTestId('source-slider-container')
  const sourceSlider = await within(sourceSliderContainer).findByRole('slider')
  expect(sourceSlider).toBeInTheDocument()

  //Correct amount of events was determined
  expect(
    await within(sourceSliderContainer).findByText('(0/2)', { exact: false }),
  ).toBeInTheDocument()

  //Amount of selected events has changed
  SliderUtil.setValue(sourceSlider, 2, 0, 2)
  expect(
    await within(sourceSliderContainer).findByText('(2/2)', { exact: false }),
  ).toBeInTheDocument()
})

function getTestPondWithTestFishEvents(): Pond {
  const testPond = Pond.test()
  const eventPayloads = [{ eventType: 'stateOneToTwo' }, { eventType: 'stateTwoToThree' }]
  const tags = ['test-fish', 'test-fish:test-fish_1']
  addEventsToTestPond(eventPayloads, 0, 0, tags, 'stream_0', testPond)
  return testPond
}
