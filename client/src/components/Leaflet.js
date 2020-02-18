import { Settings } from "api"
import { Control, CRS, Icon, Map, Marker, TileLayer } from "leaflet"
import {
  EsriProvider,
  GeoSearchControl,
  OpenStreetMapProvider
} from "leaflet-geosearch"
import "leaflet-geosearch/assets/css/leaflet.css"
import { GestureHandling } from "leaflet-gesture-handling"
import "leaflet-gesture-handling/dist/leaflet-gesture-handling.css"
import { MarkerClusterGroup } from "leaflet.markercluster"
import "leaflet.markercluster/dist/MarkerCluster.css"
import "leaflet.markercluster/dist/MarkerCluster.Default.css"
import "leaflet/dist/leaflet.css"
import _isEqualWith from "lodash/isEqualWith"
import _sortBy from "lodash/sortBy"
import { Location } from "models"
import PropTypes from "prop-types"
import React, { useCallback, useEffect, useRef, useState } from "react"
import MARKER_ICON_2X from "resources/leaflet/marker-icon-2x.png"
import MARKER_ICON from "resources/leaflet/marker-icon.png"
import MARKER_SHADOW from "resources/leaflet/marker-shadow.png"
import utils from "utils"

const css = {
  zIndex: 1
}

class CustomUrlEsriProvider extends EsriProvider {
  constructor(options = {}) {
    super(options)
  }

  endpoint({ query, protocol } = {}) {
    const { params } = this.options
    const paramString = this.getParamString({
      ...params,
      f: "json",
      text: query
    })
    return `${protocol}//${this.options.url}?${paramString}`
  }
}

const geoSearcherProviders = {
  ESRI: () => {
    return new CustomUrlEsriProvider({
      url: Settings.imagery.geoSearcher.url,
      params: { maxLocations: 10 }
    })
  },
  OSM: () => {
    return new OpenStreetMapProvider()
  }
}

const searchProvider =
  Settings.imagery.geoSearcher &&
  geoSearcherProviders[Settings.imagery.geoSearcher.provider]()

const icon = new Icon({
  iconUrl: MARKER_ICON,
  iconRetinaUrl: MARKER_ICON_2X,
  shadowUrl: MARKER_SHADOW,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
})

const addLayers = (map, layerControl) => {
  let defaultLayer = null
  Settings.imagery.baseLayers.forEach(layerConfig => {
    let layer = null
    if (layerConfig.type === "wms") {
      layer = new TileLayer.WMS(layerConfig.url, layerConfig.options)
    } else if (layerConfig.type === "osm" || layerConfig.type === "tile") {
      layer = new TileLayer(layerConfig.url, layerConfig.options)
    }
    if (layer) {
      layerControl.addBaseLayer(layer, layerConfig.name)
    }
    if (layerConfig.default) {
      defaultLayer = layer
    }
  })
  if (defaultLayer) {
    map.addLayer(defaultLayer)
  }
}

const Leaflet = ({
  width,
  height,
  marginBottom,
  markers,
  mapId: initialMapId
}) => {
  const mapId = "map-" + (initialMapId || "default")
  const style = Object.assign({}, css, {
    width: width,
    height: height,
    marginBottom: marginBottom
  })

  const latestMarkers = useRef(markers)
  const markersIdsUnchanged = _isEqualWith(
    _sortBy(latestMarkers.current.map(m => m.id)),
    _sortBy(markers.map(m => m.id)),
    utils.treatFunctionsAsEqual
  )

  const latestWidth = useRef(width)
  const widthPropUnchanged = latestWidth.current === width

  const latestHeight = useRef(height)
  const heightPropUnchanged = latestHeight.current === height

  const [map, setMap] = useState(null)
  const [markerLayer, setMarkerLayer] = useState(null)
  const [doInitializeMarkerLayer, setDoInitializeMarkerLayer] = useState(false)

  const updateMarkerLayer = useCallback(
    (markersToAdd, markersToRemove) => {
      const markers = markersToAdd || []
      markersToRemove = markersToRemove || []
      const newMarkers = []
      markers.forEach(m => {
        const latLng = Location.hasCoordinates(m)
          ? [m.lat, m.lng]
          : map.getCenter()
        const marker = new Marker(latLng, {
          icon: icon,
          draggable: m.draggable || false,
          autoPan: m.autoPan || false,
          id: m.id
        })
        if (m.name) {
          marker.bindPopup(m.name)
        }
        if (m.onMove) {
          marker.on("move", event => m.onMove(event, map))
        }
        newMarkers.push(marker)
        markerLayer.addLayer(marker)
      })

      markersToRemove.forEach(m => {
        const ml = markerLayer.getLayers().find(ml => ml.options.id === m.id)
        markerLayer.removeLayer(ml)
      })

      if (newMarkers.length > 0) {
        if (markerLayer.getBounds() && markerLayer.getBounds().isValid()) {
          map.fitBounds(markerLayer.getBounds(), { maxZoom: 15 })
        }
      }
    },
    [map, markerLayer]
  )

  useEffect(() => {
    Map.addInitHook("addHandler", "gestureHandling", GestureHandling)
    const mapOptions = Object.assign(
      { zoomControl: true, gestureHandling: true },
      Settings.imagery.mapOptions.leafletOptions,
      Settings.imagery.mapOptions.crs && {
        crs: CRS[Settings.imagery.mapOptions.crs]
      }
    )
    const newMap = new Map(mapId, mapOptions).setView(
      Settings.imagery.mapOptions.homeView.location,
      Settings.imagery.mapOptions.homeView.zoomLevel
    )
    if (searchProvider) {
      new GeoSearchControl({ provider: searchProvider }).addTo(newMap)
    }
    const layerControl = new Control.Layers({}, {}, { collapsed: false })
    layerControl.addTo(newMap)
    addLayers(newMap, layerControl)

    setMap(newMap)

    const newMarkerLayer = new MarkerClusterGroup().addTo(newMap)
    setMarkerLayer(newMarkerLayer)

    setDoInitializeMarkerLayer(true)
  }, [mapId])

  useEffect(() => {
    if (doInitializeMarkerLayer) {
      updateMarkerLayer(markers)
      setDoInitializeMarkerLayer(false)
    }
  }, [
    setDoInitializeMarkerLayer,
    markers,
    updateMarkerLayer,
    doInitializeMarkerLayer
  ])

  useEffect(() => {
    // Update markerLayer when the markerIds changed
    if (!markersIdsUnchanged) {
      const markersToAdd = markers.filter(
        m => latestMarkers.findIndex(pm => pm.id === m.id) === -1
      )
      const markersToRemove = latestMarkers.filter(
        pm => markers.findIndex(m => m.id === pm.id) === -1
      )
      updateMarkerLayer(markersToAdd, markersToRemove)
    }
  }, [markers, markersIdsUnchanged, updateMarkerLayer])

  useEffect(() => {
    if (map && !(widthPropUnchanged && heightPropUnchanged)) {
      map.invalidateSize()
      latestWidth.current = width
      latestHeight.current = height
    }
  }, [
    height,
    heightPropUnchanged,
    map,
    markerLayer,
    markers,
    width,
    widthPropUnchanged
  ])

  return <div id={mapId} style={style} />
}
Leaflet.propTypes = {
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  marginBottom: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  markers: PropTypes.array,
  mapId: PropTypes.string // pass this when you have more than one map on a page
}
Leaflet.defaultProps = {
  width: "100%",
  height: "500px",
  marginBottom: "18px"
}

export default Leaflet
