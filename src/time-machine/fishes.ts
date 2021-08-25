import { Fish } from '@actyx/pond'

import Fishes from './../../example-fishes'

export function fishes(): Fish<any, any>[] {
  return Fishes()
}
