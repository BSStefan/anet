import useSearchFilter from "components/advancedSearch/hooks"
import PropTypes from "prop-types"
import React from "react"
import { Checkbox, FormGroup } from "react-bootstrap"
import { deserializeSearchFilter } from "searchUtils"

const CheckboxFilter = props => {
  const { asFormField, queryKey } = props
  const defaultValue = { value: true }
  const toQuery = val => {
    return { [queryKey]: val.value }
  }
  const [value, setValue] = useSearchFilter(props, defaultValue, toQuery) // eslint-disable-line no-unused-vars

  const msg = "Authorized for me"
  return !asFormField ? (
    <>{msg}</>
  ) : (
    <FormGroup>
      <Checkbox readOnly checked={value.value}>
        {msg}
      </Checkbox>
    </FormGroup>
  )
}
CheckboxFilter.propTypes = {
  queryKey: PropTypes.string.isRequired,
  onChange: PropTypes.func, // eslint-disable-line react/no-unused-prop-types
  asFormField: PropTypes.bool
}
CheckboxFilter.defaultProps = {
  asFormField: true
}

export const deserializeCheckboxFilter = (props, query, key) => {
  return deserializeSearchFilter(props, query, key)
}

export default CheckboxFilter
