/**
 * victory-native mock — inspectable stubs.
 *
 * `BestHoursChart` statically imports and renders victory on ALL platforms, so
 * the mock is on the render path. `VictoryBar` serializes its `data`/`fill`
 * inputs into a queryable attribute so DEEP tests can read the 24 data points
 * and the peak bar's fill.
 */
import React, { type ReactNode } from 'react'
import { View, type ViewProps } from 'react-native'

type ChartProps = { children?: ReactNode } & Record<string, unknown>

export function VictoryChart({ children, ...props }: ChartProps) {
  return <View {...(props as ViewProps)}>{children}</View>
}

export function VictoryAxis({ children, ...props }: ChartProps) {
  return <View {...(props as ViewProps)}>{children}</View>
}

export function VictoryBar({
  data,
  style,
  ...props
}: {
  data?: unknown
  style?: { data?: { fill?: unknown } }
} & Record<string, unknown>) {
  const fill = style?.data?.fill
  // Serialize inputs into a queryable attribute. RNW forwards `dataSet.*` to
  // `data-*` DOM attributes at runtime; its View type does not surface
  // `dataSet`, so the prop bag is cast for the stub.
  const viewProps = {
    testID: 'victory-bar',
    dataSet: {
      victoryBar: JSON.stringify({ data: data ?? null, fill: fill ?? null }),
    },
    ...props,
  }
  return <View {...(viewProps as ViewProps)} />
}

export function VictoryPie({ children, ...props }: ChartProps) {
  return <View testID="victory-pie" {...(props as ViewProps)}>{children}</View>
}

export function VictoryLine({ children, ...props }: ChartProps) {
  return <View {...(props as ViewProps)}>{children}</View>
}

export function VictoryArea({ children, ...props }: ChartProps) {
  return <View {...(props as ViewProps)}>{children}</View>
}

export function VictoryScatter({ children, ...props }: ChartProps) {
  return <View {...(props as ViewProps)}>{children}</View>
}

export const VictoryTheme = { material: {} }

export default {
  VictoryChart,
  VictoryAxis,
  VictoryBar,
  VictoryPie,
  VictoryLine,
  VictoryArea,
  VictoryScatter,
  VictoryTheme,
}
