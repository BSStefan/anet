import { resetPagination, SEARCH_OBJECT_LABELS, setSearchQuery } from "actions"
import autobind from "autobind-decorator"
import AdvancedSearch from "components/AdvancedSearch"
import { routerRelatedPropTypes } from "components/Page"
import { SearchDescription } from "components/SearchFilters"
import PropTypes from "prop-types"
import React, { Component } from "react"
import { Button, Form, FormControl, InputGroup } from "react-bootstrap"
import { connect } from "react-redux"
import { withRouter } from "react-router-dom"
import SEARCH_ICON from "resources/search-alt.png"

class SearchBar extends Component {
  static propTypes = {
    setSearchQuery: PropTypes.func.isRequired,
    onSearchGoToSearchPage: PropTypes.bool,
    query: PropTypes.shape({
      text: PropTypes.string,
      filters: PropTypes.any,
      objectType: PropTypes.string
    }),
    searchObjectTypes: PropTypes.array,
    resetPagination: PropTypes.func,
    ...routerRelatedPropTypes
  }

  advancedSearchLink = React.createRef()

  constructor(props) {
    super(props)
    this.state = {
      searchTerms: props.query.text,
      showAdvancedSearch: false
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.query.text !== this.props.query.text) {
      this.setState({ searchTerms: this.props.query.text })
    }
  }

  render() {
    const placeholder = this.props.query.objectType
      ? "Filter " + SEARCH_OBJECT_LABELS[this.props.query.objectType]
      : "Search for " +
        this.props.searchObjectTypes
          .map(type => SEARCH_OBJECT_LABELS[type])
          .join(", ")
    return (
      <div>
        <Form onSubmit={this.onSubmit}>
          <InputGroup>
            <FormControl
              value={this.state.searchTerms}
              placeholder={placeholder}
              onChange={this.onChange}
              id="searchBarInput"
            />
            {!this.state.showAdvancedSearch && (
              <InputGroup.Button>
                <Button onClick={this.onSubmit} id="searchBarSubmit">
                  <img src={SEARCH_ICON} height={16} alt="Search" />
                </Button>
              </InputGroup.Button>
            )}
          </InputGroup>
        </Form>

        <div
          className="add-search-filter"
          ref={this.advancedSearchLink}
          onClick={() =>
            this.setState({
              showAdvancedSearch: !this.state.showAdvancedSearch
            })
          }
        >
          <SearchDescription query={this.props.query} showPlaceholders />
        </div>
        {this.state.showAdvancedSearch && (
          <AdvancedSearch
            onSearch={this.runAdvancedSearch}
            onCancel={() => this.setState({ showAdvancedSearch: false })}
            text={this.state.searchTerms}
          />
        )}
      </div>
    )
  }

  @autobind
  onChange(event) {
    this.setState({ searchTerms: event.target.value })
  }

  @autobind
  onSubmit(event) {
    if (!this.state.showAdvancedSearch) {
      // We only update the Redux state on submit
      this.props.resetPagination()
      this.props.setSearchQuery({ text: this.state.searchTerms })
      if (this.props.onSearchGoToSearchPage) {
        this.props.history.push("/search")
      }
    }
    event.preventDefault()
    event.stopPropagation()
  }

  @autobind
  runAdvancedSearch() {
    this.setState({ showAdvancedSearch: false })
  }
}

const mapStateToProps = (state, ownProps) => ({
  query: state.searchQuery,
  onSearchGoToSearchPage: state.searchProps.onSearchGoToSearchPage,
  searchObjectTypes: state.searchProps.searchObjectTypes
})

const mapDispatchToProps = (dispatch, ownProps) => ({
  setSearchQuery: searchTerms => dispatch(setSearchQuery(searchTerms)),
  resetPagination: () => dispatch(resetPagination())
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(SearchBar))
