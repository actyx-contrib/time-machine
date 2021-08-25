//https://stackoverflow.com/questions/58856094/testing-a-material-ui-slider-with-testing-library-react?noredirect=1&lq=1

import { fireEvent } from '@testing-library/react'

export class SliderUtil {
  private static height = 10

  // For simplicity pretend that slider's width is 100
  private static width = 100

  private static getBoundingClientRectMock() {
    return {
      bottom: SliderUtil.height,
      height: SliderUtil.height,
      left: 0,
      right: SliderUtil.width,
      top: 0,
      width: SliderUtil.width,
      x: 0,
      y: 0,
    } as DOMRect
  }

  static setValue(element: HTMLElement, value: number, min = 0, max = 100): void {
    const getBoundingClientRect = element.getBoundingClientRect
    element.getBoundingClientRect = SliderUtil.getBoundingClientRectMock
    fireEvent.mouseDown(element, {
      clientX: ((value - min) / (max - min)) * SliderUtil.width,
      clientY: SliderUtil.height,
    })
    element.getBoundingClientRect = getBoundingClientRect
  }
}
