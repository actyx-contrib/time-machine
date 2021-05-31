import 'regenerator-runtime'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Pond } from '@actyx-contrib/react-pond'
import { App } from './App'
import { ActyxLoadingView } from './components/ActyxLoadingView'

const onError = () => {
  setTimeout(() => location.reload(), 2500)
}

ReactDOM.render(
  <Pond loadComponent={<ActyxLoadingView />} onError={onError}>
    <App />
  </Pond>,
  document.getElementById('root'),
)
