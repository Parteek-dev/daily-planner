# DEPENDENCIES.md

Version resolution log for the Daily Planner Expo SDK 52 project.
All versions are pinned exactly (no `^` or `~`) per Requirement 2.1.

---

## expo-doctor Flagged Resolutions

### `victory-native`

| Field            | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| Original version | `42.x` (latest at time of setup)                               |
| Resolved version | `36.9.2`                                                       |
| Reason           | `victory-native` v42+ requires `@shopify/react-native-skia >=2.6.0`. Expo SDK 52 ships Skia at `1.5.0` and that version cannot be upgraded without ejecting to a bare workflow. `victory-native` v36.x has no Skia peer dependency and is fully compatible with Expo SDK 52 managed workflow. |

### `firebase`

| Field            | Value                                                          |
| ---------------- | -------------------------------------------------------------- |
| Original version | `12.x` (latest at time of setup)                               |
| Resolved version | `10.14.1`                                                      |
| Reason           | Firebase JS SDK v12.x declares a peer dependency on `@react-native-async-storage/async-storage ^2.2.0 \|\| ^3.0.0`. Expo SDK 52 pins async-storage at `1.23.1`, which does not satisfy that range. Firebase v10.x is compatible with async-storage `1.x` and with the Expo SDK 52 compatibility matrix. `expo-doctor` excludes this package from the React Native Directory check (see `package.json` `expo.doctor.reactNativeDirectoryCheck.exclude`). |

---

## Library Selection Rationale

### `victory-native` (charting library)

**Selected version:** `36.9.2`

The web app used `recharts`, which depends on SVG APIs and React DOM — neither is available in React Native. Two candidates were evaluated as replacements (Requirement 2.3):

| Candidate                    | Expo SDK 52 compatible | Notes                                                                 |
| ---------------------------- | ---------------------- | --------------------------------------------------------------------- |
| `victory-native` v36.x       | ✅ Yes                  | No Skia peer dependency; works with `react-native-svg` which is already required by the project. Covers bar, line, area, and pie chart types needed by `BestHoursChart`, `LineChart`, `TopicBalance`, and `WeeklyReport`. |
| `victory-native` v42.x       | ❌ No                   | Requires `@shopify/react-native-skia >=2.6.0`; blocked by Expo SDK 52 Skia pin (see above). |
| `react-native-gifted-charts` | ✅ Yes                  | Compatible, but adds a second charting dependency with overlapping scope; `victory-native` v36.x already satisfies all chart requirements. |

**Decision:** `victory-native@36.9.2` — fully compatible, covers all required chart types, no additional native module dependencies beyond `react-native-svg`.

### `lucide-react-native` (icon library)

**Selected version:** `1.48.0`

The web app used `lucide-react`, which renders icons as HTML SVG elements and requires a React DOM environment (Requirement 2.4). It cannot be used in React Native.

| Candidate           | Expo SDK 52 compatible | Notes                                                                 |
| ------------------- | ---------------------- | --------------------------------------------------------------------- |
| `lucide-react`      | ❌ No                   | Produces `<svg>` DOM elements; crashes on native targets.             |
| `lucide-react-native`| ✅ Yes                 | Official React Native port of Lucide. Renders icons using `react-native-svg` (already a project dependency). Version `1.48.0` is compatible with `react-native-svg@15.x` and Expo SDK 52. Icon API is identical (`import { CheckCircle } from 'lucide-react-native'`), so component migration is a drop-in import path change with no API changes. |

**Decision:** `lucide-react-native@1.48.0` — the direct, officially-maintained replacement. All imports from `lucide-react` must be updated to `lucide-react-native` (verified in cleanup Task 38.3).

---

## Full Pinned Dependency Manifest

All versions listed here match `package.json` exactly at the time of Task 1.5 completion.

### Runtime Dependencies

| Package                                   | Pinned Version | Expo SDK 52 source     |
| ----------------------------------------- | -------------- | ---------------------- |
| `expo`                                    | `52.0.49`      | Expo SDK               |
| `react`                                   | `18.3.1`       | Expo SDK               |
| `react-native`                            | `0.76.9`       | Expo SDK               |
| `expo-router`                             | `4.0.22`       | `npx expo install`     |
| `expo-notifications`                      | `0.29.14`      | `npx expo install`     |
| `expo-av`                                 | `15.0.2`       | `npx expo install`     |
| `expo-document-picker`                    | `13.0.3`       | `npx expo install`     |
| `expo-sharing`                            | `13.0.1`       | `npx expo install`     |
| `expo-file-system`                        | `18.0.12`      | `npx expo install`     |
| `expo-speech`                             | `13.0.1`       | `npx expo install`     |
| `expo-constants`                          | `17.0.8`       | `npx expo install`     |
| `expo-linking`                            | `7.0.5`        | `npx expo install`     |
| `firebase`                                | `10.14.1`      | Manual (see above)     |
| `@react-native-async-storage/async-storage` | `1.23.1`     | `npx expo install`     |
| `react-native-gesture-handler`            | `2.20.2`       | `npx expo install`     |
| `react-native-reanimated`                 | `3.16.7`       | `npx expo install`     |
| `react-native-safe-area-context`          | `4.12.0`       | `npx expo install`     |
| `react-native-screens`                    | `4.4.0`        | `npx expo install`     |
| `react-native-svg`                        | `15.8.0`       | `npx expo install`     |
| `victory-native`                          | `36.9.2`       | Manual (see above)     |
| `lucide-react-native`                     | `1.48.0`       | Manual (see above)     |
| `react-native-draggable-flatlist`         | `4.0.3`        | Manual                 |
| `@shopify/react-native-skia`              | `1.5.0`        | Expo SDK (transitive)  |

---

## Notes

- `expo-av` and `firebase` are excluded from the `expo-doctor` React Native Directory check via the `expo.doctor.reactNativeDirectoryCheck.exclude` field in `package.json`. `expo-av` is an official Expo package that predates the RN Directory listing; `firebase` is a JS-only SDK that does not require a native module entry.
- `react-native-draggable-flatlist@4.0.3` has no expo-doctor entry; it was verified manually against `react-native@0.76.x` and `react-native-reanimated@3.x` peer dependency requirements.
- No dependency in this project requires `expo eject` or produces an `ios/` or `android/` native directory (Requirement 2.5). All native code is delivered through Expo's managed workflow prebuild.
