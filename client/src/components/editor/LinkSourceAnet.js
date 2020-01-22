import React, { Component } from "react"
import PropTypes from "prop-types"

import { Button, Modal } from "react-bootstrap"

import "./LinkSource.css"

import AdvancedSingleSelect from "components/advancedSelectWidget/AdvancedSingleSelect"
import REPORTS_ICON from "resources/reports.png"
import TASKS_ICON from "resources/tasks.png"
import PEOPLE_ICON from "resources/people.png"
import ORGANIZATIONS_ICON from "resources/organizations.png"
import LOCATIONS_ICON from "resources/locations.png"
import POSITIONS_ICON from "resources/positions.png"
import * as Models from "models"
import {
  ReportDetailedOverlayRow,
  OrganizationOverlayRow,
  TaskSimpleOverlayRow,
  PersonDetailedOverlayRow,
  PositionOverlayRow,
  LocationOverlayRow
} from "components/advancedSelectWidget/AdvancedSelectOverlayRow"

import ButtonToggleGroup from "components/ButtonToggleGroup"
import { ENTITY_TYPES } from "utils_links"
import pluralize from "pluralize"
import createEntity from "./utils/createEntity"

const entityFilters = {
  allEntities: {
    label: "All entities",
    queryVars: {}
  }
}

const peopleFilters = {
  allEntities: {
    label: "All",
    queryVars: { matchPositionName: true }
  },
  activeAdvisors: {
    label: "All advisors",
    queryVars: { role: Models.Person.ROLE.ADVISOR, matchPositionName: true }
  },
  activePrincipals: {
    label: "All principals",
    queryVars: { role: Models.Person.ROLE.PRINCIPAL }
  }
}

const widgetPropsReport = {
  objectType: Models.Report,
  overlayRenderRow: ReportDetailedOverlayRow,
  overlayColumns: ["Goal", "Author", "Updated"],
  filterDefs: entityFilters,
  queryParams: {},
  fields: Models.Report.autocompleteQuery,
  addon: REPORTS_ICON
}

const widgetPropsPeople = {
  objectType: Models.Person,
  overlayRenderRow: PersonDetailedOverlayRow,
  overlayColumns: ["Name", "Position", "Location", "Organization"],
  filterDefs: peopleFilters,
  queryParams: {},
  fields: Models.Person.autocompleteQuery,
  addon: PEOPLE_ICON
}

const widgetPropsOrganization = {
  objectType: Models.Organization,
  overlayRenderRow: OrganizationOverlayRow,
  overlayColumns: ["Name"],
  filterDefs: entityFilters,
  queryParams: {},
  fields: Models.Organization.autocompleteQuery,
  addon: ORGANIZATIONS_ICON
}

const widgetPropsPosition = {
  objectType: Models.Position,
  overlayRenderRow: PositionOverlayRow,
  overlayColumns: ["Position", "Organization", "Current Occupant"],
  filterDefs: entityFilters,
  queryParams: {},
  fields: Models.Position.autocompleteQuery,
  addon: POSITIONS_ICON
}

const widgetPropsLocation = {
  objectType: Models.Location,
  overlayRenderRow: LocationOverlayRow,
  overlayColumns: ["Name"],
  filterDefs: entityFilters,
  queryParams: { status: Models.Location.STATUS.ACTIVE },
  fields: Models.Location.autocompleteQuery,
  addon: LOCATIONS_ICON
}

const widgetPropsTask = {
  objectType: Models.Task,
  overlayRenderRow: TaskSimpleOverlayRow,
  overlayColumns: ["Name"],
  filterDefs: entityFilters,
  queryParams: { status: Models.Task.STATUS.ACTIVE },
  fields: Models.Task.autocompleteQuery,
  addon: TASKS_ICON
}

const widgetTypeMapping = {
  [ENTITY_TYPES.REPORT]: widgetPropsReport,
  [ENTITY_TYPES.PERSON]: widgetPropsPeople,
  [ENTITY_TYPES.ORGANIZATION]: widgetPropsOrganization,
  [ENTITY_TYPES.POSITION]: widgetPropsPosition,
  [ENTITY_TYPES.LOCATION]: widgetPropsLocation,
  [ENTITY_TYPES.TASK]: widgetPropsTask
}

class LinkSourceAnet extends Component {
  constructor(props) {
    super(props)

    this.state = {
      objectType: ENTITY_TYPES.REPORT,
      advancedSelectProps: widgetPropsReport
    }

    this.child = React.createRef()
  }

  onConfirm = value => {
    const { editorState, entityType, onComplete } = this.props

    // Retrieve entity URL and label
    const ModelClass = Models[this.state.objectType]
    const modelInstance = new ModelClass(value)
    const entityLabel = modelInstance.toString()
    const entityUrl = ModelClass.pathFor(modelInstance)

    const nextState = createEntity(
      editorState,
      entityType.type,
      {
        url: entityUrl
      },
      entityLabel,
      "IMMUTABLE"
    )

    onComplete(nextState)
  }

  onRequestClose = () => {
    const { onClose } = this.props
    onClose()
  }

  onAfterOpen = () => {
    const input = this.inputRef

    if (input) {
      input.focus()
      input.select()
    }
  }

  changeObjectType = objectType => {
    if (this.state.objectType === objectType) {
      // Skip unnecessary update
      return
    }

    this.setState({
      objectType: objectType,
      advancedSelectProps: widgetTypeMapping[objectType]
    })

    // Filter and type changed, need to update search results
    this.child.current.refreshSearch()
  }

  render() {
    return (
      <Modal
        show
        aria-labelledby="Link chooser"
        onHide={this.onRequestClose}
        onEntered={this.onAfterOpen}
      >
        <Modal.Header closeButton>
          <Modal.Title>Link to ANET entity</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <ButtonToggleGroup
            value={this.state.objectType}
            onChange={this.changeObjectType}
          >
            {Object.values(ENTITY_TYPES).map(entityType => {
              const entityName =
                entityType === "anetLocation" ? "location" : entityType
              const capitalized =
                entityName[0].toUpperCase() + entityName.slice(1)
              return (
                <Button key={entityType} value={entityType}>
                  {pluralize(capitalized)}
                </Button>
              )
            })}
          </ButtonToggleGroup>
        </Modal.Body>

        <Modal.Footer>
          <AdvancedSingleSelect
            ref={this.child}
            fieldName="entitySelect"
            fieldLabel="Search in ANET:"
            placeholder={"Search " + this.state.objectType.toLowerCase()}
            value={{}}
            showEmbedded
            overlayColumns={this.state.advancedSelectProps.overlayColumns}
            overlayRenderRow={this.state.advancedSelectProps.overlayRenderRow}
            filterDefs={this.state.advancedSelectProps.filterDefs}
            onChange={value => this.onConfirm(value)}
            objectType={this.state.advancedSelectProps.objectType}
            queryParams={this.state.advancedSelectProps.queryParams}
            fields={this.state.advancedSelectProps.fields}
            addon={this.state.advancedSelectProps.addon}
          />
        </Modal.Footer>
      </Modal>
    )
  }
}

LinkSourceAnet.propTypes = {
  editorState: PropTypes.object.isRequired,
  onComplete: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  entityType: PropTypes.object.isRequired
}

export default LinkSourceAnet
