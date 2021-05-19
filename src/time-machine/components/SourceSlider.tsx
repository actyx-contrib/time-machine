import { Slider, Typography, Grid } from '@material-ui/core'
import React from 'react'

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
  return (
    <Grid key={sid} item container spacing={1} xs={12}>
      <Grid item xs={2}>
        <Typography style={{ width: 170 }}>
          {sid} <br />({numberOfSelectedEvents}/{numberOfAllEvents})
        </Typography>
      </Grid>
      <Grid item xs={2}>
        <Slider
          style={{ width: 350 }}
          value={numberOfSelectedEvents}
          min={0}
          max={numberOfAllEvents}
          disabled={disabled}
          onChange={(_event, value) => {
            onEventsChanged(+value)
          }}
          aria-labelledby="continuous-slider"
        />
      </Grid>
    </Grid>
  )
}
