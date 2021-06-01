import { Card, CardContent, Typography } from '@material-ui/core'
import React from 'react'
import ReactJson from 'react-json-view'

type StatePanelProps = {
  state: { [p: string]: unknown }
}

export function StatePanel({ state }: StatePanelProps): JSX.Element {
  return (
    <div>
      <Typography variant="h4" component="h4" className="sub-header" gutterBottom>
        Resulting Fish-State:
      </Typography>
      <Card>
        <CardContent>
          <br />
          <ReactJson src={state} />
        </CardContent>
      </Card>
    </div>
  )
}
