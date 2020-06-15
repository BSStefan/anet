import { forward, toPoint } from "mgrs"

export function parseCoordinate(latLng) {
  const value = parseFloat(latLng)
  if (!value && value !== 0) {
    return null
  }

  /*
   * We use 5 decimal point (~110cm) precision because MGRS has
   * a minimum of 1 meter precision.
   * Please see;
   * https://stackoverflow.com/a/16743805/1209097
   * https://en.wikipedia.org/wiki/Military_Grid_Reference_System
   *
   * Additionally, coordinates must be truncated instead of rounding when changing
   * precision level in order to aviod inconsistencies during (MGRS <--> Lat/Lon) conversion.
   */
  const precision = 5
  return Math.trunc(value * 10 ** precision) / 10 ** precision
}

export function convertLatLngToMGRS(lat, lng) {
  const parsedLat = parseCoordinate(lat)
  const parsedLng = parseCoordinate(lng)

  let mgrs = ""
  try {
    if ((parsedLat || parsedLat === 0) && (parsedLng || parsedLng === 0)) {
      mgrs = forward([parsedLng, parsedLat])
    }
  } catch (e) {
    mgrs = ""
  }
  return mgrs
}

export function convertMGRSToLatLng(mgrs) {
  let latLng
  try {
    // toPoint returns an array of [lon, lat]
    latLng = mgrs ? toPoint(mgrs) : ["", ""]
  } catch (e) {
    latLng = ["", ""]
  }
  return [parseCoordinate(latLng[1]), parseCoordinate(latLng[0])]
}
