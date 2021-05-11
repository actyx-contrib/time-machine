import { Fish } from '@actyx/pond'
import { mkOvenFish } from './fish/oven-fish/oven-fish'

export default function fishes(): Fish<any, any>[] {
  return [mkOvenFish('test')]
}
