import { Card, CardContent, Typography } from '@material-ui/core'
import React from 'react'
import ReactJson from 'react-json-view'

type EventPanelProps = {
  event: { [p: string]: unknown }
}

export function EventPanel({ event }: EventPanelProps): JSX.Element {
  return (
    <div>
      <Typography variant="h4" component="h4" className="sub-header" gutterBottom>
        Last applied event:
      </Typography>
      <Card>
        <CardContent>
          <ReactJson src={event} />
        </CardContent>
      </Card>
    </div>
  )
}
