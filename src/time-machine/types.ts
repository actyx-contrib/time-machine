import { OffsetMap } from '@actyx/pond'

/**
 * This type is identical to a normal OffsetMap but is used
 * to clarify that the offsets in this special offset map
 * are to be used differently than the actual offsets in Actyx.
 * While an actual offset describes how many events were emitted
 * previously on one particular stream regardless of their tags,
 * a tagged offset only counts the events that match a particular
 * set of tags.
 *
 * So if there's 100 emitted events on one particular stream,
 * from which only 5 match the defined set of tags,
 * the tagged offset would be '4' and the actual offset would be '99'.
 * (since all offsets have a default value of -1 and start counting at 0)
 *
 * As this type only exists to avoid confusion,
 * it won't store the tags it's referring to by itself. These have
 * to be stored and handled by yourself.
 */
export type TaggedOffsetMap = OffsetMap
