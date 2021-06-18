import { Card, CardContent, Typography } from '@material-ui/core'
import { DiffEditor } from '@monaco-editor/react'
import React from 'react'

type StatePanelProps = {
  currentState: { [p: string]: unknown }
  previousState: { [p: string]: unknown }
}

export function StatePanel({ currentState, previousState }: StatePanelProps): JSX.Element {
  return (
    <div>
      <Typography variant="h4" component="h4" className="sub-header" gutterBottom>
        Resulting Fish-State:
      </Typography>
      <Card>
        <CardContent>
          <DiffEditor
            height="35vh"
            options={{ readOnly: true }}
            original={JSON.stringify(previousState)}
            modified={JSON.stringify(currentState)}
            language="JSON"
          />
        </CardContent>
      </Card>
    </div>
  )
}
