import * as FieldHelper from "components/FieldHelper"
import { Field } from "formik"
import { Location } from "models"
import PropTypes from "prop-types"
import React from "react"
import { Button, Col, ControlLabel, FormGroup } from "react-bootstrap"
import REMOVE_ICON from "resources/delete.png"

export const GEO_LOCATION_DISPLAY_TYPE = {
  FORM_FIELD: "FORM_FIELD",
  GENERIC: "GENERIC"
}

const GeoLocation = ({
  lat,
  lng,
  setFieldTouched,
  setValues,
  isSubmitting,
  editable,
  displayType
}) => {
  if (!editable) {
    const humanValue = (
      <>
        <span>{Location.parseCoordinate(lat) || "?"}</span>
        <span>,&nbsp;</span>
        <span>{Location.parseCoordinate(lng) || "?"}</span>
      </>
    )

    if (displayType === GEO_LOCATION_DISPLAY_TYPE.FORM_FIELD) {
      return (
        <Field
          name="location"
          label="Latitude, Longitude"
          component={FieldHelper.ReadonlyField}
          humanValue={humanValue}
        />
      )
    }

    return humanValue
  }

  const setTouched = touched => {
    setFieldTouched("lat", touched, false)
    setFieldTouched("lng", touched, false)
  }

  return (
    <FormGroup style={{ marginBottom: 0 }}>
      <Col sm={2} componentClass={ControlLabel} htmlFor="lat">
        Latitude, Longitude
      </Col>

      <Col sm={7}>
        <Col sm={3} style={{ marginRight: "8px" }}>
          <Field
            name="lat"
            component={FieldHelper.InputFieldNoLabel}
            onBlur={() => {
              setTouched(true)
              setValues({
                lat: Location.parseCoordinate(lat),
                lng: Location.parseCoordinate(lng)
              })
            }}
          />
        </Col>
        <Col sm={3}>
          <Field
            name="lng"
            component={FieldHelper.InputFieldNoLabel}
            onBlur={() => {
              setTouched(true)
              setValues({
                lat: Location.parseCoordinate(lat),
                lng: Location.parseCoordinate(lng)
              })
            }}
          />
        </Col>
        {(lat || lng) && (
          <Col sm={1}>
            <Button
              style={{ width: "auto", margin: "8px 0 0 0", padding: "0" }}
              bsStyle="link"
              bsSize="sm"
              onClick={() => {
                setTouched(false) // prevent validation since lat, lng can be null together
                setValues({ lat: null, lng: null })
              }}
              disabled={isSubmitting}
            >
              <img src={REMOVE_ICON} height={14} alt="Clear Location" />
            </Button>
          </Col>
        )}
      </Col>
    </FormGroup>
  )
}

function fnRequiredWhenEditable(props, propName, componentName) {
  if (props.editable === true && typeof props[propName] !== "function") {
    return new Error(
      `Invalid prop '${propName}' is supplied to ${componentName}. '${propName}' isRequired when ${componentName} is editable and '${propName}' must be a function!`
    )
  }
}

GeoLocation.propTypes = {
  lat: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  lng: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  setFieldTouched: fnRequiredWhenEditable,
  setValues: fnRequiredWhenEditable,
  isSubmitting: PropTypes.bool,
  editable: PropTypes.bool,
  displayType: PropTypes.oneOf([
    GEO_LOCATION_DISPLAY_TYPE.FORM_FIELD,
    GEO_LOCATION_DISPLAY_TYPE.GENERIC
  ])
}

GeoLocation.defaultProps = {
  lat: null,
  lng: null,
  isSubmitting: false,
  editable: false,
  displayType: GEO_LOCATION_DISPLAY_TYPE.GENERIC
}

export default GeoLocation
