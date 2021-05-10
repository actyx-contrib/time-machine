import { Tag } from '@actyx/pond'
import { exception } from 'console'
import { List } from 'immutable'
import { ovenFishName } from './oven-fish'

export type StatusType = 'queued' | 'transporting-in' | 'transporting-out' | 'working' | 'ready'

export type UndefinedState = {
  status: 'undefined'
}

export type DefaultState = {
  status: StatusType
}

export type OvenFishState = UndefinedState | DefaultState

export type SetStateEvent = {
  machineId: string
  eventType: 'setState'
  state: OvenFishState
}

export type OvenStartRequestEvent = {
  machineId: string
  eventType: 'ovenStartRequest'
}

export type OvenFishEvent = OvenStartRequestEvent | SetStateEvent

export type OvenRegistryState = {
  machineIds: List<string>
}

export const OvenFishTag = (ovenFishName: string) => {
  return Tag<OvenFishEvent>(ovenFishName)
}
