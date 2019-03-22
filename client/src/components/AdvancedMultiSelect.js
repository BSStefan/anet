import React, { Component } from 'react'

import AdvancedSelect, {propTypes as advancedSelectPropTypes} from 'components/AdvancedSelect'
import _cloneDeep from 'lodash/cloneDeep'


export default class AdvancedMultiSelect extends Component {
	static propTypes = {
		...advancedSelectPropTypes
	}

	render() {
		return <AdvancedSelect {...this.props} handleAddItem={this.handleAddItem} handleRemoveItem={this.handleRemoveItem} />
	}

	handleAddItem = (newItem) => {
		if (!newItem || !newItem.uuid) {
			return
		}
		if (!this.props.selectedItems.find(obj => obj.uuid === newItem.uuid)) {
			const selectedItems = _cloneDeep(this.props.selectedItems)
			selectedItems.push(newItem)
			this.props.onChange(selectedItems)
		}
	}

	handleRemoveItem = (oldItem) => {
		if (this.props.selectedItems.find(obj => obj.uuid === oldItem.uuid)) {
			const selectedItems = _cloneDeep(this.props.selectedItems)
			const index = selectedItems.findIndex(item => item.uuid === oldItem.uuid)
			selectedItems.splice(index, 1)
			this.props.onChange(selectedItems)
		}
	}
}
