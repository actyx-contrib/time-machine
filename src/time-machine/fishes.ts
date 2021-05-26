import { Fish } from '@actyx/pond'

import Fishes from './../../example-fishes'

export default function fishes(): Fish<any, any>[] {
    return Fishes()
}
