import { Typography, CircularProgress, Grid } from '@material-ui/core'
import React from 'react'

export function ActyxLoadingView(): JSX.Element {
  return (
    <div style={{ margin: '30px 20px' }}>
      <Grid container spacing={3}>
        <Grid item>
          <Typography variant="h4" component="h4" gutterBottom>
            Waiting for ActyxOS
          </Typography>
        </Grid>
        <Grid item>
          <CircularProgress />
        </Grid>
      </Grid>
    </div>
  )
}
