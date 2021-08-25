import { Tag } from '@actyx/pond'

export type StatusType = 'one' | 'two' | 'three'

export type TestFishState = {
  status: StatusType
}

export type StateOneToTwoEvent = {
  eventType: 'stateOneToTwo'
}

export type StateTwoToThreeEvent = {
  eventType: 'stateTwoToThree'
}

export type StateThreeToOneEvent = {
  eventType: 'stateThreeToOne'
}

export type TestFishEvent = StateOneToTwoEvent | StateTwoToThreeEvent | StateThreeToOneEvent

export const TestFishTag = (testFishName: string): Tag<TestFishEvent> => {
  return Tag<TestFishEvent>(testFishName)
}
