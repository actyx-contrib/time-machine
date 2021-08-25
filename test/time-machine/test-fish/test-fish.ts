import { Fish, FishId, Reduce, Tags } from '@actyx/pond'
import { TestFishState, TestFishEvent, TestFishTag } from './types'

export const testFishName = 'test-fish'

const onEvent: Reduce<TestFishState, TestFishEvent> = (state, event) => {
  switch (event.eventType) {
    case 'stateOneToTwo':
      if (state.status === 'one') {
        return {
          status: 'two',
        }
      }
      return state

    case 'stateTwoToThree':
      if (state.status === 'two') {
        return {
          status: 'three',
        }
      }
      return state

    case 'stateThreeToOne':
      if (state.status === 'three') {
        return {
          status: 'one',
        }
      }
      return state

    default:
      return state
  }
}

export const mkTestFishTag = (fishId: string): Tags<TestFishEvent> =>
  TestFishTag(testFishName).withId(fishId)

export const mkTestFish = (fishId: string): Fish<TestFishState, TestFishEvent> => ({
  fishId: FishId.of(testFishName, fishId, 1),
  where: mkTestFishTag(fishId),
  initialState: {
    status: 'one',
  },
  onEvent,
})
