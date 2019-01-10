import PropTypes from 'prop-types'
import React, { Component } from 'react'

import { Button, Col, Row, Table, Overlay, Popover } from 'react-bootstrap'
import { Classes, Icon } from '@blueprintjs/core'
import { IconNames } from '@blueprintjs/icons'
import classNames from 'classnames'

import ButtonToggleGroup from 'components/ButtonToggleGroup'
import Checkbox from 'components/Checkbox'
import {Person, Position} from 'models'
import LinkTo from 'components/LinkTo'
import { Field } from 'formik'
import { renderInputField } from 'components/FieldHelper'
import API from 'api'
import _debounce from 'lodash/debounce'

const AttendeesTable = (props) => {
	const { attendees, selectedAttendees, addItem, removeItem } = props
	const selectedAttendeesUuids = selectedAttendees.map(a => a.uuid)
	return (
		<Table responsive hover striped className="people-search-results">
			<thead>
				<tr>
					<th />
					<th>Name</th>
					<th>Position</th>
					<th>Location</th>
					<th>Organization</th>
				</tr>
			</thead>
			<tbody>
				{Person.map(props.attendees, person => {
					const isSelected = selectedAttendeesUuids.includes(person.uuid)
					return <tr key={person.uuid}>
						<td>
							<button
								type="button"
								className={classNames(Classes.BUTTON)}
								title="Add attendee"
								onClick={() => addItem(person)}
							>
								<Icon icon={IconNames.ADD} />
							</button>
						</td>
						<td>
							<img src={person.iconUrl()} alt={person.role} height={20} className="person-icon" />
							<LinkTo person={person}/>
						</td>
						<td><LinkTo position={person.position} />{person.position && person.position.code ? `, ${person.position.code}`: ``}</td>
						<td><LinkTo whenUnspecified="" anetLocation={person.position && person.position.location} /></td>
						<td>{person.position && person.position.organization && <LinkTo organization={person.position.organization} />}</td>
					</tr>
				})}
			</tbody>
		</Table>
	)
}

export default class AttendeesMultiSelect extends Component {
	static propTypes = {
		addFieldName: PropTypes.string.isRequired, // name of the autocomplete field
		addFieldLabel: PropTypes.string, // label of the autocomplete field
		items: PropTypes.array.isRequired,
		renderSelected: PropTypes.oneOfType([PropTypes.func, PropTypes.object]).isRequired, // how to render the selected items
		onAddItem: PropTypes.func.isRequired,
		onRemoveItem: PropTypes.func,
		shortcutDefs: PropTypes.object,
		renderExtraCol: PropTypes.bool, // set to false if you want this column completely removed
		addon: PropTypes.oneOfType([PropTypes.string, PropTypes.func, PropTypes.object]),

		//Needed for the autocomplete widget
		//Required: ANET Object Type (Person, Report, etc) to search for.
		objectType: PropTypes.func.isRequired,
		//Optional: The property of the selected object to display.
		valueKey: PropTypes.string,
		//Optional: A function to render each item in the list of suggestions.
		template: PropTypes.func,
		//Optional: Parameters to pass to search function.
		queryParams: PropTypes.object,
		//Optional: GraphQL string of fields to return from search.
		fields: PropTypes.string,
		currentUser: PropTypes.instanceOf(Person),
	}

	static defaultProps = {
		addFieldLabel: 'Add item',
		shortcutDefs: {},
		renderExtraCol: true,
	}

	state = {
		searchTerms: '',
		shortcutKey: Object.keys(this.props.shortcutDefs)[0],
		suggestions: [],
		pageNum: 0,
		showOverlay: false,
		inputFocused: false,
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevProps.items !== this.props.items) {
			// Update the list of suggestions to consider the already selected items
			this.fetchSuggestions()
		}
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
			showOverlay: false
		})
	}

	render() {
		const {addFieldName, addFieldLabel, renderSelected, items, onAddItem, onRemoveItem, shortcutDefs, renderExtraCol, addon, ...autocompleteProps} = this.props
		const renderSelectedWithDelete = React.cloneElement(renderSelected, {onDelete: this.removeItem})
		return (
				<Field
					name={addFieldName}
					label={addFieldLabel}
					component={renderInputField}
					value={this.state.searchTerms}
					onChange={this.changeSearchTerms}
					onFocus={this.handleInputFocus}
					onBlur={this.handleInputBlur}
					innerRef={el => {this.overlayTarget = el}}
				>
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
						<Popover id={addFieldName} title={null} placement="bottom" style={{left: 0, width: '100%', maxWidth: '100%'}}>
							<Row>
								<Col sm={12}>
									<ButtonToggleGroup value={this.state.shortcutKey} onChange={this.changeShortcut} className="hide-for-print">
										{Object.keys(shortcutDefs).map(shortcutKey =>
											<Button key={shortcutKey} value={shortcutKey}>{shortcutDefs[shortcutKey].label}</Button>
										)}
									</ButtonToggleGroup>
									<AttendeesTable
										attendees={this.state.suggestions}
										selectedAttendees={items}
										addItem={this.addItem}
										removeItem={this.removeItem}
									/>
								</Col>
							</Row>
						</Popover>
					</Overlay>
					<div ref={el => {this.overlayContainer = el}} style={{position: 'relative'}} />
					{renderSelectedWithDelete}
				</Field>
		)
	}

	changeSearchTerms = (event) => {
		this.setState({searchTerms: event.target.value}, () => this.fetchSuggestionsDebounced())
	}

	changeShortcut = (shortcutKey) => {
		this.setState({shortcutKey}, () => this.fetchSuggestions())
	}

	_getSelectedItemsUuids = () => {
		const selectedItems = this.props.items
		if (Array.isArray(selectedItems)) {
			return selectedItems.map(object => object.uuid)
		}
		return []
	}

	filterSuggestions = (suggestions) => {
		const excludedUuids =  this._getSelectedItemsUuids()
		if (excludedUuids) {
			suggestions = suggestions.filter(suggestion => suggestion && suggestion.uuid && excludedUuids.indexOf(suggestion.uuid) === -1)
		}
		return suggestions
	}

	fetchSuggestions = () => {
		const {shortcutKey} = this.state
		const shortcutDefs = this.props.shortcutDefs[shortcutKey]
		const resourceName = this.props.objectType.resourceName
		const listName = shortcutDefs.listName || this.props.objectType.listName
		if (shortcutDefs.searchQuery) {
			// GraphQL search type of query
			let graphQlQuery = listName + ' (query: $query) { '
			+ 'list { ' + this.props.fields + '}'
			+ '}'
			const variableDef = '($query: ' + resourceName + 'SearchQueryInput)'
			let queryVars = {pageNum: 0, pageSize: 6}
			if (this.props.queryParams) {
				Object.assign(queryVars, this.props.queryParams)
			}
			if (shortcutDefs.queryVars) {
				Object.assign(queryVars, shortcutDefs.queryVars)
			}
			if (this.state.searchTerms) {
				Object.assign(queryVars, {text: this.state.searchTerms + "*"})
			}
			API.query(graphQlQuery, {query: queryVars}, variableDef).then(data => {
				this.setState({suggestions: this.filterSuggestions(data[listName].list)})
			})
		}
		else {
			API.query(/* GraphQL */`
					` + listName + `(` + shortcutDefs.listArgs + `) {
						list { ` + this.props.fields + ` }
					}`
			).then(data => {
				this.setState({suggestions: this.filterSuggestions(data[listName].list)})
			})
		}
	}

	fetchSuggestionsDebounced = _debounce(this.fetchSuggestions, 200)

	addItem = (newItem) => {
		if (!newItem || !newItem.uuid) {
			return
		}
		if (!this.props.items.find(obj => obj.uuid === newItem.uuid)) {
			this.props.onAddItem(newItem)
		}
	}

	removeItem = (oldItem) => {
		if (this.props.items.find(obj => obj.uuid === oldItem.uuid)) {
			this.props.onRemoveItem(oldItem)
		}
	}
}
