import { resetPagination, SEARCH_OBJECT_LABELS, setSearchQuery } from "actions"
import ButtonToggleGroup from "components/ButtonToggleGroup"
import searchFilters, {
  POSTITION_ORGANIZATION_FILTER_KEY,
  POSTITION_POSITION_TYPE_FILTER_KEY
} from "components/SearchFilters"
import { Form, Formik } from "formik"
import _cloneDeep from "lodash/cloneDeep"
import { Organization, Position } from "models"
import PropTypes from "prop-types"
import React, { useState } from "react"
import {
  Button,
  Col,
  ControlLabel,
  DropdownButton,
  FormControl,
  FormGroup,
  MenuItem,
  Row
} from "react-bootstrap"
import { connect } from "react-redux"
import { useHistory } from "react-router-dom"
import REMOVE_ICON from "resources/delete.png"

function updateOrganizationFilterState(organizationFilter, positionType) {
  if (organizationFilter) {
    if (positionType === Position.TYPE.PRINCIPAL) {
      organizationFilter.setState({
        queryParams: { type: Organization.TYPE.PRINCIPAL_ORG }
      })
    } else if (positionType === Position.TYPE.ADVISOR) {
      organizationFilter.setState({
        queryParams: { type: Organization.TYPE.ADVISOR_ORG }
      })
    } else {
      organizationFilter.setState({ queryParams: {} })
    }
  }
}

const AdvancedSearch = props => {
  const { query, text } = props
  const history = useHistory()
  const [objectType, setObjectType] = useState(query.objectType)
  const [filters, setFilters] = useState(
    query.filters ? query.filters.slice() : []
  )
  const [positionTypeFilter, setPositionTypeFilter] = useState(null)
  const [organizationFilter, setOrganizationFilter] = useState(null)

  const ALL_FILTERS = searchFilters.searchFilters(
    changePositionTypeFilter,
    changeOrganizationFilter
  )
  // console.log("RENDER AdvancedSearch", objectType, text, filters)
  const filterDefs = objectType ? ALL_FILTERS[objectType].filters : {}
  const existingKeys = filters.map(f => f.key)
  const moreFiltersAvailable =
    existingKeys.length < Object.keys(filterDefs).length
  return (
    <Formik>
      {() => (
        <div className="advanced-search form-horizontal">
          <Form onSubmit={onSubmit}>
            <FormGroup>
              <Col xs={11}>
                <ButtonToggleGroup
                  value={objectType}
                  onChange={changeObjectType}
                >
                  {Object.keys(ALL_FILTERS).map(
                    type =>
                      props.searchObjectTypes.indexOf(type) !== -1 && (
                        <Button key={type} value={type}>
                          {SEARCH_OBJECT_LABELS[type]}
                        </Button>
                      )
                  )}
                </ButtonToggleGroup>
              </Col>
              <Col xs={1}>
                <Button bsStyle="link" onClick={clearObjectType}>
                  <img src={REMOVE_ICON} height={14} alt="Clear type" />
                </Button>
              </Col>
            </FormGroup>

            <FormControl defaultValue={text} className="hidden" />

            {filters.map(
              filter =>
                filterDefs[filter.key] && (
                  <SearchFilter
                    key={filter.key}
                    filter={filter}
                    onRemove={removeFilter}
                    element={filterDefs[filter.key]}
                    organizationFilter={organizationFilter}
                  />
                )
            )}

            <Row>
              <Col xs={6} xsOffset={3}>
                {!objectType ? (
                  "To add filters, first pick a type above"
                ) : !moreFiltersAvailable ? (
                  "No additional filters available"
                ) : (
                  <DropdownButton
                    bsStyle="link"
                    title="+ Add another filter"
                    onSelect={addFilter}
                    id="addFilterDropdown"
                  >
                    {Object.keys(filterDefs).map(filterKey => (
                      <MenuItem
                        disabled={existingKeys.indexOf(filterKey) > -1}
                        eventKey={filterKey}
                        key={filterKey}
                      >
                        {filterKey}
                      </MenuItem>
                    ))}
                  </DropdownButton>
                )}
              </Col>
            </Row>

            <Row>
              <div className="pull-right">
                <Button onClick={props.onCancel} style={{ marginRight: 20 }}>
                  Cancel
                </Button>
                <Button
                  bsStyle="primary"
                  type="submit"
                  onClick={onSubmit}
                  style={{ marginRight: 20 }}
                >
                  Search
                </Button>
              </div>
            </Row>
          </Form>
        </div>
      )}
    </Formik>
  )

  function changePositionTypeFilter(positionTypeFilter) {
    updateOrganizationFilter(positionTypeFilter, organizationFilter)
    setPositionTypeFilter(positionTypeFilter)
  }

  function changeOrganizationFilter(organizationFilter) {
    updateOrganizationFilter(positionTypeFilter, organizationFilter)
    setOrganizationFilter(organizationFilter)
  }

  function updateOrganizationFilter(positionTypeFilter, organizationFilter) {
    const positionType = positionTypeFilter
      ? positionTypeFilter.state.value.value
      : ""
    updateOrganizationFilterState(organizationFilter, positionType)
  }

  function changeObjectType(objectType) {
    setObjectType(objectType)
    setFilters([])
  }

  function clearObjectType() {
    changeObjectType("")
  }

  function addFilter(filterKey) {
    if (filterKey) {
      const newFilters = filters.slice()
      newFilters.push({ key: filterKey })
      setFilters(newFilters)
    }
  }

  function removeFilter(filter) {
    const newFilters = filters.slice()
    newFilters.splice(newFilters.indexOf(filter), 1)
    setFilters(newFilters)

    if (filter.key === POSTITION_ORGANIZATION_FILTER_KEY) {
      changeOrganizationFilter(null)
    } else if (filter.key === POSTITION_POSITION_TYPE_FILTER_KEY) {
      changePositionTypeFilter(null)
    }
  }

  function onSubmit(event) {
    if (typeof props.onSearch === "function") {
      props.onSearch()
    }
    // We only update the Redux state on submit
    props.resetPagination()
    props.setSearchQuery({
      objectType,
      filters,
      text
    })
    if (props.onSearchGoToSearchPage) {
      history.push({
        pathname: "/search"
      })
    }
    event.preventDefault()
    event.stopPropagation()
  }
}

const mapStateToProps = (state, ownProps) => {
  return {
    query: _cloneDeep(state.searchQuery),
    onSearchGoToSearchPage: state.searchProps.onSearchGoToSearchPage,
    searchObjectTypes: state.searchProps.searchObjectTypes
  }
}

AdvancedSearch.propTypes = {
  onSearch: PropTypes.func,
  onCancel: PropTypes.func,
  setSearchQuery: PropTypes.func.isRequired,
  resetPagination: PropTypes.func.isRequired,
  query: PropTypes.shape({
    text: PropTypes.string,
    filters: PropTypes.any,
    objectType: PropTypes.string
  }),
  onSearchGoToSearchPage: PropTypes.bool,
  searchObjectTypes: PropTypes.array,
  text: PropTypes.string
}

const mapDispatchToProps = (dispatch, ownProps) => ({
  setSearchQuery: advancedSearchQuery =>
    dispatch(setSearchQuery(advancedSearchQuery)),
  resetPagination: () => dispatch(resetPagination())
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AdvancedSearch)

const SearchFilter = props => {
  const { onRemove, filter, element } = props
  const label = filter.key
  const ChildComponent = element.component

  return (
    <FormGroup>
      <Col xs={1} sm={2}>
        <ControlLabel>{label}</ControlLabel>
      </Col>
      <Col xs={10} sm={9}>
        <ChildComponent
          value={filter.value || ""}
          onChange={onChange}
          {...element.props}
        />
      </Col>
      <Col xs={1} sm={1}>
        <Button bsStyle="link" onClick={() => onRemove(filter)}>
          <img src={REMOVE_ICON} height={14} alt="Remove this filter" />
        </Button>
      </Col>
    </FormGroup>
  )

  function onChange(value) {
    filter.value = value

    if (filter.key === POSTITION_POSITION_TYPE_FILTER_KEY) {
      updateOrganizationFilterState(
        props.organizationFilter,
        filter.value.value || ""
      )
    }
  }
}

SearchFilter.propTypes = {
  onRemove: PropTypes.func,
  filter: PropTypes.object,
  organizationFilter: PropTypes.object,
  element: PropTypes.shape({
    component: PropTypes.func.isRequired,
    props: PropTypes.object
  })
}
