import { Tag } from '@actyx/pond'
import { exception } from 'console'
import { List } from 'immutable'
import { pickerFishName } from './picker-fish'

export type StatusType =
  | 'picking-up'
  | 'placing'
  | 'moving'
  | 'movement-queued'
  | 'transport-queued'
  | 'ready'

export type Direction = 'left' | 'right'

export type UndefinedState = {
  status: 'undefined'
}

export type DefaultState = {
  status: StatusType
  position: Direction
  target_position: Direction
  carrying: Boolean
}

export type PickerFishState = UndefinedState | DefaultState

export type SetStateEvent = {
  machineId: string
  eventType: 'setState'
  state: PickerFishState
}

export type SetStatusEvent = {
  machineId: string
  eventType: 'setStatus'
  status: StatusType
}

export type PickerMoveRequestEvent = {
  machineId: string
  eventType: 'pickerMoveRequest'
  direction: Direction
}

export type PickerTransportRequestEvent = {
  machineId: string
  eventType: 'pickerTransportRequest'
  direction: Direction
}

export type PickerFishEvent =
  | PickerMoveRequestEvent
  | PickerTransportRequestEvent
  | SetStateEvent
  | SetStatusEvent

export type PickerRegistryState = {
  machineIds: List<string>
}

export const PickerFishTag = (pickerFishName: string) => {
  return Tag<PickerFishEvent>(pickerFishName)
}
