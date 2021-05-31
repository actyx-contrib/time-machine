import { Slider, Typography, Grid } from '@material-ui/core'
import React, { useState } from 'react'

type SourceSliderProps = {
  sid: string
  numberOfSelectedEvents: number
  numberOfAllEvents: number
  disabled: boolean
  onEventsChanged: (events: number) => void
}

export function SourceSlider({
  sid,
  numberOfSelectedEvents,
  numberOfAllEvents,
  disabled,
  onEventsChanged,
}: SourceSliderProps): JSX.Element {
  const [sliderValue, setSliderValue] = useState<number>(numberOfSelectedEvents)

  return (
    <Grid key={sid} container spacing={1}>
      <Grid item xs={2}>
        <Typography>
          {sid} <br />({numberOfSelectedEvents}/{numberOfAllEvents})
        </Typography>
      </Grid>
      <Grid item xs={10}>
        <Slider
          style={{ maxWidth: 350 }}
          value={sliderValue}
          min={0}
          max={numberOfAllEvents}
          disabled={disabled}
          onChange={(_event, value) => {
            setSliderValue(+value)
          }}
          onChangeCommitted={(_event, value) => {
            onEventsChanged(+value)
          }}
          aria-labelledby="continuous-slider"
        />
      </Grid>
    </Grid>
  )
}
