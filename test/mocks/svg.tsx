/**
 * react-native-svg mock — View-based stubs.
 *
 * Each SVG primitive renders children and forwards testID so LineChart's web
 * branch and ring components mount and remain queryable.
 */
import React, { type ReactNode } from 'react'
import { View } from 'react-native'

type Props = { children?: ReactNode; [k: string]: unknown }

function svgStub(displayName: string) {
  const Stub = ({ children, ...props }: Props) => <View {...props}>{children}</View>
  Stub.displayName = displayName
  return Stub
}

export const Svg = svgStub('Svg')
export const Path = svgStub('Path')
export const Circle = svgStub('Circle')
export const Rect = svgStub('Rect')
export const G = svgStub('G')
export const Defs = svgStub('Defs')
export const LinearGradient = svgStub('LinearGradient')
export const Stop = svgStub('Stop')
export const Line = svgStub('Line')
export const Text = svgStub('SvgText')
export const Polyline = svgStub('Polyline')
export const Polygon = svgStub('Polygon')

export default Svg
