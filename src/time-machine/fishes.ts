import { Fish } from '@actyx/pond'
import { mkOvenFish } from './fish/oven-fish/oven-fish'
import { mkPickerFish } from './fish/picker-fish/picker-fish'

const defaultFishName = 'default'

export default function fishes(): Fish<any, any>[] {
  return [mkOvenFish(defaultFishName), mkPickerFish(defaultFishName)]
}
