import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { Button, Col, Row, Table, Overlay, Popover } from 'react-bootstrap'
import { Classes, Icon } from '@blueprintjs/core'
import { IconNames } from '@blueprintjs/icons'
import classNames from 'classnames'

import {Person, Position} from 'models'
import LinkTo from 'components/LinkTo'
import UltimatePagination from 'components/UltimatePagination'

import { Field } from 'formik'
import { renderInputField } from 'components/FieldHelper'

import API from 'api'
import _cloneDeep from 'lodash/cloneDeep'
import _debounce from 'lodash/debounce'

import './AdvancedMultiSelect.css'

export default class AdvancedMultiSelect extends Component {
	static propTypes = {
		addFieldName: PropTypes.string.isRequired, // name of the autocomplete field
		addFieldLabel: PropTypes.string, // label of the autocomplete field
		selectedItems: PropTypes.array.isRequired,
		renderSelected: PropTypes.oneOfType([PropTypes.func, PropTypes.object]).isRequired, // how to render the selected items
		onChange: PropTypes.func.isRequired,
		filterDefs: PropTypes.object,
		renderExtraCol: PropTypes.bool, // set to false if you want this column completely removed
		addon: PropTypes.oneOfType([PropTypes.string, PropTypes.func, PropTypes.object]),

		//Required: ANET Object Type (Person, Report, etc) to search for.
		objectType: PropTypes.func.isRequired,
		//Optional: Parameters to pass to search function.
		queryParams: PropTypes.object,
		//Optional: GraphQL string of fields to return from search.
		fields: PropTypes.string,
		currentUser: PropTypes.instanceOf(Person),
		overlayComponent: PropTypes.oneOfType([PropTypes.string, PropTypes.func, PropTypes.object]),
	}

	static defaultProps = {
		addFieldLabel: 'Add item',
		filterDefs: {},
		renderExtraCol: true,
	}

	state = {
		searchTerms: '',
		filterType: Object.keys(this.props.filterDefs)[0], // per default use the first filter
		results: {},
		showOverlay: false,
		inputFocused: false,
	}

	handleInputFocus = () => {
		if (this.state.inputFocused === true) {
			return
		}
		this.setState({
			inputFocused: true,
			showOverlay: true,
		})
	}

	handleInputBlur = () => {
		this.setState({
			inputFocused: false,
		})
	}

	handleHideOverlay = () => {
		if (this.state.inputFocused) {
			return
		}
		this.setState({
			filterType: Object.keys(this.props.filterDefs)[0],
			results: {},
			showOverlay: false,
		})
	}

	render() {
		const { addFieldName, addFieldLabel, renderSelected, selectedItems, onAddItem, onRemoveItem, filterDefs, renderExtraCol, addon, ...autocompleteProps } = this.props
		const { results, filterType } = this.state
		const renderSelectedWithDelete = React.cloneElement(renderSelected, {onDelete: this.removeItem})
		const items = results && results[filterType] ? results[filterType].list : []
		return (
			<React.Fragment>
				<Field
					name={addFieldName}
					label={addFieldLabel}
					component={renderInputField}
					value={this.state.searchTerms}
					onChange={this.changeSearchTerms}
					onFocus={this.handleInputFocus}
					onBlur={this.handleInputBlur}
					innerRef={el => {this.overlayTarget = el}}
				/>
				<Overlay
					show={this.state.showOverlay}
					container={this.overlayContainer}
					target={this.overlayTarget}
					rootClose={true}
					onHide={this.handleHideOverlay}
					placement="bottom"
					animation={false}
					delayHide={200}
				>
					<Popover id={addFieldName} title={null} placement="bottom" style={{width: '100%', maxWidth: '100%'}}>
						<Row className="border-between">
							<Col sm={3}>
								<ul className="overlayFilters">
									{Object.keys(filterDefs).map(filterType =>
										!filterDefs[filterType].doNotDisplay && <li key={filterType} className={(this.state.filterType === filterType) ? 'active' : null}><Button bsStyle="link" onClick={() => this.changeFilterType(filterType)}>{filterDefs[filterType].label}</Button></li>
									)}
								</ul>
							</Col>
							<Col sm={9}>
								<header className="searchPagination">
									{this.paginationFor(this.state.filterType)}
								</header>
								<this.props.overlayComponent
									items={items}
									selectedItems={selectedItems}
									addItem={this.addItem}
									removeItem={this.removeItem}
								/>
								<footer className="searchPagination">
									{this.paginationFor(this.state.filterType)}
								</footer>
							</Col>
						</Row>
					</Popover>
				</Overlay>
				<Row>
					<Col sm={9} className="form-group" ref={el => {this.overlayContainer = el}} style={{position: 'relative'}} />
					<Col sm={3} />
				</Row>
				<Row>
					<Col sm={2} />
					<Col sm={7}>{renderSelectedWithDelete}</Col>
					<Col sm={3} />
				</Row>
			</React.Fragment>
		)
	}

	changeSearchTerms = (event) => {
		// Reset the results state when the search terms change
		this.setState({searchTerms: event.target.value, results: {}}, () => this.fetchResultsDebounced(0))
	}

	changeFilterType = (filterType) => {
		// When changing the filter type, only fetch the results if they were not fetched before
		this.setState({filterType}, () => (!this.state.results[filterType] ? this.fetchResults(0) : null))
	}

	_getSelectedItemsUuids = () => {
		const {selectedItems} = this.props
		if (Array.isArray(selectedItems)) {
			return selectedItems.map(object => object.uuid)
		}
		return []
	}

	fetchResults = (pageNum) => {
		const { filterType, results } = this.state
		if (pageNum === undefined) {
			pageNum = results && results[filterType] ? results[filterType].pageNum : 0
		}
		const filterDefs = this.props.filterDefs[filterType]
		const resourceName = this.props.objectType.resourceName
		const listName = filterDefs.listName || this.props.objectType.listName
		if (filterDefs.list) {
			// No need to fetch the data, it is already provided in the filter definition
			this.setState({
				results: {
					...results,
					[filterType]: {list: filterDefs.list, pageNum: pageNum, pageSize: 6, totalCount: filterDefs.list.length}
				}
			})
		}
		else if (filterDefs.searchQuery) {
			// GraphQL search type of query
			const graphQlQuery = listName + ' (query: $query) { '
				+ 'pageNum, pageSize, totalCount, list { ' + this.props.fields + '}'
				+ '}'
			const variableDef = '($query: ' + resourceName + 'SearchQueryInput)'
			let queryVars = {pageNum: pageNum, pageSize: 6}
			if (this.props.queryParams) {
				Object.assign(queryVars, this.props.queryParams)
			}
			if (filterDefs.queryVars) {
				Object.assign(queryVars, filterDefs.queryVars)
			}
			if (this.state.searchTerms) {
				Object.assign(queryVars, {text: this.state.searchTerms + "*"})
			}
			API.query(graphQlQuery, {query: queryVars}, variableDef).then(data => {
				this.setState({
					results: {
						...results,
						[filterType]: data[listName]
					}
				})
			})
		}
		else {
			// GraphQL query other than search type
			API.query(/* GraphQL */`
					` + listName + `(` + filterDefs.listArgs + `) {
				pageNum, pageSize, totalCount, list { ` + this.props.fields + ` }
					}`
			).then(data => {
				this.setState({
					results: {
						...results,
						[filterType]: data[listName]
					}
				})
			})
		}
	}

	fetchResultsDebounced = _debounce(this.fetchResults, 200)

	addItem = (newItem) => {
		if (!newItem || !newItem.uuid) {
			return
		}
		if (!this.props.selectedItems.find(obj => obj.uuid === newItem.uuid)) {
			const selectedItems = _cloneDeep(this.props.selectedItems)
			selectedItems.push(newItem)
			this.props.onChange(selectedItems)
		}
	}

	removeItem = (oldItem) => {
		if (this.props.selectedItems.find(obj => obj.uuid === oldItem.uuid)) {
			const selectedItems = _cloneDeep(this.props.selectedItems)
			const index = selectedItems.findIndex(item => item.uuid === oldItem.uuid)
			selectedItems.splice(index, 1)
			this.props.onChange(selectedItems)
		}
	}

	paginationFor = (filterType) => {
		const {results} = this.state
		const pageSize = results && results[filterType] ? results[filterType].pageSize : 6
		const pageNum = results && results[filterType] ? results[filterType].pageNum : 0
		const totalCount = results && results[filterType] ? results[filterType].totalCount : 0
		const numPages = (pageSize <= 0) ? 1 : Math.ceil(totalCount / pageSize)
		if (numPages <= 1) { return }
		return <UltimatePagination
			className="pull-right"
			currentPage={pageNum + 1}
			totalPages={numPages}
			boundaryPagesRange={1}
			siblingPagesRange={2}
			hideEllipsis={false}
			hidePreviousAndNextPageLinks={false}
			hideFirstAndLastPageLinks={true}
			onChange={(value) => this.goToPage(value - 1)}
		/>
	}

	goToPage = (pageNum) => {
		this.fetchResults(pageNum)
	}
}
