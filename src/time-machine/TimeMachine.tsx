import React, { useState } from 'react'
import { OffsetMap, Reduce, Tags } from '@actyx/pond'
import { usePond } from '@actyx-contrib/react-pond'

const defaultOnEvent = `(state, event, metadata) => {
  return state
}`

export const TimeMachine = (): JSX.Element => {
  const [tags, setTags] = React.useState('error')
  const [initState, setInitState] = React.useState('{"id": 1}')
  const [onEventFunction, setOnEventFunction] = React.useState(defaultOnEvent)

  const [upperBound, setUpperBound] = useState<OffsetMap>()
  const [startTime, setStartTime] = useState<number>()
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [selectedEventOffsetMap, setSelectedEventOffsetMap] = useState<OffsetMap>({})

  const [twinState, setTwinState] = useState({})

  const pond = usePond()
  React.useEffect(() => {
    const refresh = setInterval(() => {
      pond.events().currentOffsets().then(setUpperBound)
    }, 10000)
    return () => {
      clearInterval(refresh)
    }
  }, [])

  const onEventFn = React.useCallback(
    (state, event, meta): Reduce<unknown, unknown> => {
      try {
        return new Function(
          '__inState__',
          '__inEvent__',
          '__inMetadata__',
          `try{ return (${onEventFunction})(__inState__, __inEvent__, __inMetadata__) } catch {return __inState__}`,
        )(state, event, meta)
      } catch (error) {
        console.log(error)
        return state
      }
    },
    [onEventFunction],
  )

  React.useEffect(() => {
    if (!selectedEventOffsetMap) {
      return
    }
    pond.events().queryKnownRangeChunked(
      {
        upperBound: selectedEventOffsetMap,
        order: 'Asc',
        query: Tags(...(tags || 'unknown').split(' ')),
      },
      5000,
      ({ events }) => {
        setTwinState(
          events.reduce(
            (state, { payload, meta }) => onEventFn(state, payload, meta),
            JSON.parse(initState),
          ),
        )
      },
    )
  }, [selectedEventOffsetMap])

  if (!upperBound) {
    return <div>loading...</div>
  }

  return (
    <div>
      <div style={{ flex: 1 }}>
        <h1>Actyx Time Machine</h1>
      </div>
      <div style={{ flex: 1 }}>
        <div>
          <div>
            <span>Where:</span>
            <input
              style={{ width: 350 }}
              value={tags}
              type="text"
              onChange={({ target }) => setTags(target.value)}
            />
          </div>
          <div>
            <span>Initial State:</span>
            <textarea
              style={{ width: 350 }}
              value={initState}
              onChange={({ target }) => setInitState(target.value)}
            />
          </div>
          <div>
            <span>onEvent function:</span>
            <textarea
              style={{ width: 350 }}
              value={onEventFunction}
              onChange={({ target }) => setOnEventFunction(target.value)}
            />
          </div>
        </div>
        <div>fishState: {JSON.stringify(twinState)}</div>
      </div>
      <div>
        {Object.entries(upperBound).map(([sid, events]) => {
          const value = selectedEventOffsetMap[sid] || 0
          return (
            <div key={sid} style={{ display: 'flex' }}>
              <span style={{ width: 170 }}>
                {sid} ({value}/{events})
              </span>
              <div className="slidecontainer">
                <input
                  style={{ width: 350 }}
                  type="range"
                  min="1"
                  max={events}
                  value={value}
                  className="slider"
                  id="myRange"
                  onChange={({ target }) =>
                    setSelectedEventOffsetMap({
                      ...selectedEventOffsetMap,
                      [sid]: +target.value,
                    })
                  }
                />
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <div style={{ display: 'flex' }}>
          <span style={{ width: 170 }}>Time Machine {new Date(currentTime).toLocaleString()}</span>
          <div className="slidecontainer">
            <input
              style={{ width: 350 }}
              type="range"
              min={startTime || 0}
              max={Date.now()}
              value={currentTime}
              className="slider"
              id="myRange"
              onChange={({ target }) => setCurrentTime(+target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
