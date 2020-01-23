import { SEARCH_OBJECT_LABELS, SEARCH_OBJECT_TYPES } from "actions"
import { Settings } from "api"
import AdvancedSelectFilter from "components/advancedSearch/AdvancedSelectFilter"
import CheckboxSearchFilter from "components/advancedSearch/CheckboxSearchFilter"
import DateRangeSearch from "components/advancedSearch/DateRangeSearch"
import OrganizationFilter from "components/advancedSearch/OrganizationFilter"
import PositionTypeSearchFilter from "components/advancedSearch/PositionTypeSearchFilter"
import ReportStateSearch from "components/advancedSearch/ReportStateSearch"
import SelectSearchFilter from "components/advancedSearch/SelectSearchFilter"
import TextInputFilter from "components/advancedSearch/TextInputFilter"
import {
  LocationOverlayRow,
  PersonDetailedOverlayRow,
  PositionOverlayRow,
  TagOverlayRow,
  TaskSimpleOverlayRow
} from "components/advancedSelectWidget/AdvancedSelectOverlayRow"
import _isEmpty from "lodash/isEmpty"
import {
  Location,
  Organization,
  Person,
  Position,
  Report,
  Tag,
  Task
} from "models"
import PropTypes from "prop-types"
import React from "react"
import LOCATIONS_ICON from "resources/locations.png"
import PEOPLE_ICON from "resources/people.png"
import POSITIONS_ICON from "resources/positions.png"
import TASKS_ICON from "resources/tasks.png"

export const SearchQueryPropType = PropTypes.shape({
  text: PropTypes.string,
  filters: PropTypes.any,
  objectType: PropTypes.string
})

export const getSearchQuery = searchQuery => {
  const query = {}
  if (!_isEmpty(searchQuery.text)) {
    query.text = searchQuery.text
  }
  if (searchQuery.filters) {
    searchQuery.filters.forEach(filter => {
      if (filter.value) {
        if (filter.value.toQuery) {
          const toQuery =
            typeof filter.value.toQuery === "function"
              ? filter.value.toQuery()
              : filter.value.toQuery
          Object.assign(query, toQuery)
        } else {
          query[filter.key] = filter.value
        }
      }
    })
  }
  return query
}

export const POSTITION_POSITION_TYPE_FILTER_KEY = "Position Type"
export const POSTITION_ORGANIZATION_FILTER_KEY = "Organization"

const taskFilters = () => {
  const taskFiltersObj = {
    Organization: {
      component: OrganizationFilter,
      props: {
        queryKey: "responsibleOrgUuid",
        queryIncludeChildOrgsKey: "includeChildrenOrgs"
      }
    },
    Status: {
      component: SelectSearchFilter,
      props: {
        queryKey: "status",
        values: [Task.STATUS.ACTIVE, Task.STATUS.INACTIVE],
        labels: ["Active", "Inactive"]
      }
    }
  }
  const projectedCompletion = Settings.fields.task.projectedCompletion
  if (projectedCompletion) {
    taskFiltersObj[projectedCompletion.label] = {
      component: DateRangeSearch,
      props: {
        queryKey: "projectedCompletion"
      }
    }
  }
  const plannedCompletion = Settings.fields.task.plannedCompletion
  if (plannedCompletion) {
    taskFiltersObj[plannedCompletion.label] = {
      component: DateRangeSearch,
      props: {
        queryKey: "plannedCompletion"
      }
    }
  }
  const customEnum1 = Settings.fields.task.customFieldEnum1
  if (customEnum1) {
    taskFiltersObj[customEnum1.label] = {
      component: SelectSearchFilter,
      props: {
        queryKey: "projectStatus",
        values: Object.keys(customEnum1.enum),
        labels: Object.values(customEnum1.enum).map(o => o.label)
      }
    }
  }
  const customField = Settings.fields.task.customField
  if (customField) {
    taskFiltersObj[customField.label] = {
      component: TextInputFilter,
      props: {
        queryKey: "customField"
      }
    }
  }

  return taskFiltersObj
}

const advancedSelectFilterPersonProps = {
  overlayColumns: ["Name", "Position", "Location", "Organization"],
  overlayRenderRow: PersonDetailedOverlayRow,
  objectType: Person,
  valueKey: "name",
  fields: Person.autocompleteQuery,
  addon: PEOPLE_ICON
}
const advancedSelectFilterPositionProps = {
  overlayColumns: ["Position", "Organization", "Current Occupant"],
  overlayRenderRow: PositionOverlayRow,
  objectType: Position,
  valueKey: "name",
  fields: Position.autocompleteQuery,
  addon: POSITIONS_ICON
}
const advancedSelectFilterLocationProps = {
  overlayColumns: ["Name"],
  overlayRenderRow: LocationOverlayRow,
  objectType: Location,
  valueKey: "name",
  fields: Location.autocompleteQuery,
  addon: LOCATIONS_ICON
}
const advancedSelectFilterTaskProps = {
  overlayColumns: ["Name"],
  overlayRenderRow: TaskSimpleOverlayRow,
  objectType: Task,
  valueKey: "shortName",
  fields: Task.autocompleteQuery,
  addon: TASKS_ICON
}

const searchFilters = function(positionTypeFilterRef, organizationFilterRef) {
  const filters = {}
  const authorWidgetFilters = {
    all: {
      label: "All",
      queryVars: { role: Person.ROLE.ADVISOR }
    }
  }
  const attendeeWidgetFilters = {
    all: {
      label: "All",
      queryVars: {}
    }
  }
  const pendingApprovalOfWidgetFilters = authorWidgetFilters
  const authorPositionWidgetFilters = {
    all: {
      label: "All",
      queryVars: {
        type: [
          Position.TYPE.ADVISOR,
          Position.TYPE.SUPER_USER,
          Position.TYPE.ADMINISTRATOR
        ]
      }
    }
  }
  const attendeePositionWidgetFilters = {
    all: {
      label: "All",
      queryVars: {}
    }
  }
  const locationWidgetFilters = {
    all: {
      label: "All",
      queryVars: {}
    }
  }

  const taskWidgetFilters = {
    all: {
      label: "All",
      queryVars: {}
    }
  }

  const tagWidgetFilters = {
    all: {
      label: "All",
      queryVars: {}
    }
  }

  filters[SEARCH_OBJECT_TYPES.REPORTS] = {
    filters: {
      Author: {
        component: AdvancedSelectFilter,
        props: Object.assign({}, advancedSelectFilterPersonProps, {
          filterDefs: authorWidgetFilters,
          placeholder: "Filter reports by author...",
          queryKey: "authorUuid"
        })
      },
      Attendee: {
        component: AdvancedSelectFilter,
        props: Object.assign({}, advancedSelectFilterPersonProps, {
          filterDefs: attendeeWidgetFilters,
          placeholder: "Filter reports by attendee...",
          queryKey: "attendeeUuid"
        })
      },
      "Pending Approval Of": {
        component: AdvancedSelectFilter,
        props: Object.assign({}, advancedSelectFilterPersonProps, {
          filterDefs: pendingApprovalOfWidgetFilters,
          placeholder: "Filter reports pending approval of...",
          queryKey: "pendingApprovalOf"
        })
      },
      "Author Position": {
        component: AdvancedSelectFilter,
        props: Object.assign({}, advancedSelectFilterPositionProps, {
          filterDefs: authorPositionWidgetFilters,
          placeholder: "Filter reports by author position...",
          queryKey: "authorPositionUuid"
        })
      },
      "Attendee Position": {
        component: AdvancedSelectFilter,
        props: Object.assign({}, advancedSelectFilterPositionProps, {
          filterDefs: attendeePositionWidgetFilters,
          placeholder: "Filter reports by attendee position...",
          queryKey: "attendeePositionUuid"
        })
      },
      Organization: {
        component: OrganizationFilter,
        props: {
          queryKey: "orgUuid",
          queryIncludeChildOrgsKey: "includeOrgChildren"
        }
      },
      "Engagement Date": {
        component: DateRangeSearch,
        props: {
          queryKey: "engagementDate"
        }
      },
      "Release Date": {
        component: DateRangeSearch,
        props: {
          queryKey: "releasedAt"
        }
      },
      "Creation Date": {
        component: DateRangeSearch,
        props: {
          queryKey: "createdAt"
        }
      },
      "Update Date": {
        component: DateRangeSearch,
        props: {
          queryKey: "updatedAt"
        }
      },
      Location: {
        component: AdvancedSelectFilter,
        props: Object.assign({}, advancedSelectFilterLocationProps, {
          filterDefs: locationWidgetFilters,
          placeholder: "Filter reports by location...",
          queryKey: "locationUuid"
        })
      },
      State: {
        component: ReportStateSearch,
        props: {
          queryKey: "state"
        }
      },
      "Engagement Status": {
        component: SelectSearchFilter,
        props: {
          queryKey: "engagementStatus",
          values: [
            Report.ENGAGEMENT_STATUS.HAPPENED,
            Report.ENGAGEMENT_STATUS.FUTURE,
            Report.ENGAGEMENT_STATUS.CANCELLED
          ]
        }
      },
      [Settings.fields.report.atmosphere]: {
        component: SelectSearchFilter,
        props: {
          queryKey: "atmosphere",
          values: ["POSITIVE", "NEUTRAL", "NEGATIVE"]
        }
      },
      Tag: {
        component: AdvancedSelectFilter,
        props: {
          overlayColumns: ["Name"],
          overlayRenderRow: TagOverlayRow,
          objectType: Tag,
          valueKey: "name",
          fields: Tag.autocompleteQuery,
          filterDefs: tagWidgetFilters,
          placeholder: "Filter reports by tag...",
          queryKey: "tagUuid"
        }
      },
      "Sensitive Info": {
        component: CheckboxSearchFilter,
        props: {
          queryKey: "sensitiveInfo"
        }
      }
    }
  }

  const taskShortLabel = Settings.fields.task.shortLabel
  filters[SEARCH_OBJECT_TYPES.REPORTS].filters[taskShortLabel] = {
    component: AdvancedSelectFilter,
    props: Object.assign({}, advancedSelectFilterTaskProps, {
      filterDefs: taskWidgetFilters,
      placeholder: `Filter reports by ${taskShortLabel}...`,
      queryKey: "taskUuid"
    })
  }

  const countries = Settings.fields.advisor.person.countries || [] // TODO: make search also work with principal countries
  const ranks = (Settings.fields.person.ranks || []).map(f => f.value)
  filters[SEARCH_OBJECT_TYPES.PEOPLE] = {
    filters: {
      Organization: {
        component: OrganizationFilter,
        props: {
          queryKey: "orgUuid",
          queryIncludeChildOrgsKey: "includeChildOrgs"
        }
      },
      Role: {
        component: SelectSearchFilter,
        props: {
          queryKey: "role",
          values: [Person.ROLE.ADVISOR, Person.ROLE.PRINCIPAL],
          labels: [
            Settings.fields.advisor.person.name,
            Settings.fields.principal.person.name
          ]
        }
      },
      Status: {
        component: SelectSearchFilter,
        props: {
          queryKey: "status",
          values: [
            Person.STATUS.ACTIVE,
            Person.STATUS.INACTIVE,
            Person.STATUS.NEW_USER
          ]
        }
      },
      Location: {
        component: AdvancedSelectFilter,
        props: Object.assign({}, advancedSelectFilterLocationProps, {
          filterDefs: locationWidgetFilters,
          placeholder: "Filter by location...",
          queryKey: "locationUuid"
        })
      },
      Rank: {
        component: SelectSearchFilter,
        props: {
          queryKey: "rank",
          values: ranks,
          labels: ranks
        }
      },
      Nationality: {
        component: SelectSearchFilter,
        props: {
          queryKey: "country",
          values: countries,
          labels: countries
        }
      },
      "Has Biography?": {
        component: SelectSearchFilter,
        props: {
          queryKey: "hasBiography",
          values: ["true", "false"],
          labels: ["Yes", "No"]
        }
      }
    }
  }

  filters[SEARCH_OBJECT_TYPES.ORGANIZATIONS] = {
    filters: {
      Status: {
        component: SelectSearchFilter,
        props: {
          queryKey: "status",
          values: [Organization.STATUS.ACTIVE, Organization.STATUS.INACTIVE]
        }
      },
      "Organization Type": {
        component: SelectSearchFilter,
        props: {
          queryKey: "type",
          values: [
            Organization.TYPE.ADVISOR_ORG,
            Organization.TYPE.PRINCIPAL_ORG
          ],
          labels: [
            Settings.fields.advisor.org.name,
            Settings.fields.principal.org.name
          ]
        }
      }
    }
  }

  filters[SEARCH_OBJECT_TYPES.POSITIONS] = {
    filters: {
      [POSTITION_POSITION_TYPE_FILTER_KEY]: {
        component: PositionTypeSearchFilter,
        props: {
          queryKey: "type",
          values: [Position.TYPE.ADVISOR, Position.TYPE.PRINCIPAL],
          labels: [
            Settings.fields.advisor.position.name,
            Settings.fields.principal.position.name
          ],
          ref: positionTypeFilterRef
        }
      },
      [POSTITION_ORGANIZATION_FILTER_KEY]: {
        component: OrganizationFilter,
        props: {
          queryKey: "organizationUuid",
          queryIncludeChildOrgsKey: "includeChildrenOrgs",
          ref: organizationFilterRef
        }
      },
      Status: {
        component: SelectSearchFilter,
        props: {
          queryKey: "status",
          values: [Position.STATUS.ACTIVE, Position.STATUS.INACTIVE]
        }
      },
      Location: {
        component: AdvancedSelectFilter,
        props: Object.assign({}, advancedSelectFilterLocationProps, {
          filterDefs: locationWidgetFilters,
          placeholder: "Filter by location...",
          queryKey: "locationUuid"
        })
      },
      "Is Filled?": {
        component: SelectSearchFilter,
        props: {
          queryKey: "isFilled",
          values: ["true", "false"],
          labels: ["Yes", "No"]
        }
      }
    }
  }

  filters[SEARCH_OBJECT_TYPES.LOCATIONS] = {
    filters: {
      Status: {
        component: SelectSearchFilter,
        props: {
          queryKey: "status",
          values: [Location.STATUS.ACTIVE, Location.STATUS.INACTIVE]
        }
      }
    }
  }

  // Task filters
  filters[SEARCH_OBJECT_TYPES.TASKS] = {
    filters: taskFilters()
  }

  return filters
}

// filters not being displayed in the advanced search but being used in the search
const extraFilters = function(positionTypeFilterRef, organizationFilterRef) {
  const filters = {}
  filters[SEARCH_OBJECT_TYPES.REPORTS] = [
    "includeEngagementDayOfWeek",
    "sortOrder"
  ]
  return filters
}

const SearchFilterDisplay = ({ filter, element, showSeparator }) => {
  const label = filter.key
  const ChildComponent = element.component
  const sep = showSeparator ? ", " : ""
  return (
    <>
      <b>{label}</b>:{" "}
      <em>
        <ChildComponent
          value={filter.value || ""}
          asFormField={false}
          {...element.props}
        />
      </em>
      {sep}
    </>
  )
}

SearchFilterDisplay.propTypes = {
  filter: PropTypes.object,
  element: PropTypes.shape({
    component: PropTypes.func.isRequired,
    props: PropTypes.object
  }),
  showSeparator: PropTypes.bool
}

export const SearchDescription = ({ searchQuery, showPlaceholders }) => {
  const allFilters = searchFilters()
  const filterDefs =
    searchQuery.objectType && SEARCH_OBJECT_TYPES[searchQuery.objectType]
      ? allFilters[SEARCH_OBJECT_TYPES[searchQuery.objectType]].filters
      : {}
  const filters = searchQuery.filters.filter(f => filterDefs[f.key])
  return (
    <span className="asLink">
      {searchQuery.objectType ? (
        <>
          <b>{SEARCH_OBJECT_LABELS[searchQuery.objectType]}</b>
          {filters.length > 0 ? (
            <>
              <> filtered on </>
              {filters.map(
                (filter, i) =>
                  filterDefs[filter.key] && (
                    <SearchFilterDisplay
                      key={filter.key}
                      filter={filter}
                      element={filterDefs[filter.key]}
                      showSeparator={i !== filters.length - 1}
                    />
                  )
              )}
            </>
          ) : (
            showPlaceholders && " - add filters"
          )}
        </>
      ) : (
        showPlaceholders && "Add filters"
      )}
    </span>
  )
}

SearchDescription.propTypes = {
  searchQuery: SearchQueryPropType,
  showPlaceholders: PropTypes.bool
}

export default { searchFilters, extraFilters }
