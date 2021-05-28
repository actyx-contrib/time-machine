import { Card, CardContent, Grid, Typography } from '@material-ui/core'
import React from 'react'
import Editor from '@monaco-editor/react'

type StatePanelProps = {
  functionCode: string
}

export function OnEventFunctionPanel({ functionCode }: StatePanelProps): JSX.Element {
  return (
    <div>
      <Grid item xs={12}>
        <Typography>onEvent function:</Typography>
      </Grid>
      <br />
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Editor
              height="20vh"
              options={{ readOnly: true }}
              defaultLanguage="javascript"
              defaultValue={functionCode}
            />
          </CardContent>
        </Card>
      </Grid>
    </div>
  )
}
