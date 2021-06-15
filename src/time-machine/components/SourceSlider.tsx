import { Slider, Typography, Grid, Checkbox } from '@material-ui/core'
import React, { useState } from 'react'

type SourceSliderProps = {
  sid: string
  numberOfSelectedEvents: number
  numberOfAllEvents: number
  disabled: boolean
  syncSelected: boolean
  onEventsChanged: (events: number) => void
  onSyncCheckboxChanged: (checked: boolean) => void
}

export function SourceSlider({
  sid,
  numberOfSelectedEvents,
  numberOfAllEvents,
  disabled,
  onEventsChanged,
  onSyncCheckboxChanged,
  syncSelected,
}: SourceSliderProps): JSX.Element {
  const [sliderValue, setSliderValue] = useState<number>(numberOfSelectedEvents)

  React.useEffect(() => {
    setSliderValue(numberOfSelectedEvents)
  }, [numberOfSelectedEvents])

  return (
    <Grid key={sid} container spacing={1}>
      <Grid item xs={2}>
        <Typography>
          {sid} <br />({numberOfSelectedEvents}/{numberOfAllEvents})
        </Typography>
      </Grid>
      <Grid item xs={8}>
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
      <Grid>
        <Typography>Sync</Typography>
        <Checkbox
          checked={syncSelected}
          onChange={(event) => {
            onSyncCheckboxChanged(event.target.checked)
          }}
          disabled={disabled}
          color="primary"
          inputProps={{ 'aria-label': 'primary checkbox' }}
        />
      </Grid>
    </Grid>
  )
}
