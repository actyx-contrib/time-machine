/**
 * @jest-environment jsdom
 */
import React from 'react'
import { App } from '../../src/time-machine/App'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { mkTestFish } from './test-fish/test-fish'
import { Pond } from '@actyx/pond'

// Inject testing pond into the application
const mockPond = Pond.test()
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

test('Application passes the loading phase and renders the actual UI', async () => {
  render(<App />)
  expect(await screen.findByText('Actyx Time Machine')).toBeInTheDocument()
})

test('Fish is correctly imported and selectable', async () => {
  render(<App />)
  expect(await screen.findByText("'test-fish' & 'test-fish:test-fish_1'")).toBeInTheDocument()
  //expect(await screen.findByText('test_fish_1')).toBeInTheDocument()
})
