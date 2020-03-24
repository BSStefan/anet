import { Icon } from "@blueprintjs/core"
import { IconNames } from "@blueprintjs/icons"
import { CanvasWidget, SelectionBoxLayerFactory } from "@projectstorm/react-canvas-core"
import { DefaultDiagramState, DiagramEngine, DiagramModel, LinkLayerFactory, LinkModel, NodeLayerFactory, NodeModel, PortModelAlignment } from "@projectstorm/react-diagrams-core"
import { DefaultLabelFactory } from "@projectstorm/react-diagrams-defaults"
import { PathFindingLinkFactory } from "@projectstorm/react-diagrams-routing"
import { Settings } from "api"
import MultiTypeAdvancedSelectComponent from "components/advancedSelectWidget/MultiTypeAdvancedSelectComponent"
import { mapPageDispatchersToProps } from "components/Page"
import FileSaver from "file-saver"
import _forEach from "lodash/forEach"
import * as Models from "models"
import PropTypes from "prop-types"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { Badge, Button, Modal } from "react-bootstrap"
import { connect } from "react-redux"
import { useParams } from "react-router-dom"
import DOWNLOAD_ICON from "resources/download.png"
import "./BoardDashboard.css"
import { DiagramLinkFactory, DiagramNodeFactory, DiagramNodeModel, DiagramPortModel, SimplePortFactory } from "./DiagramNode"

const createEngine = options => {
  const engine = new DiagramEngine({})
  engine.getLayerFactories().registerFactory(new NodeLayerFactory())
  engine.getLayerFactories().registerFactory(new LinkLayerFactory())
  engine.getLayerFactories().registerFactory(new SelectionBoxLayerFactory())

  engine.getLabelFactories().registerFactory(new DefaultLabelFactory())
  engine.getNodeFactories().registerFactory(new DiagramNodeFactory())
  engine.getLinkFactories().registerFactory(new DiagramLinkFactory())
  engine.getLinkFactories().registerFactory(new PathFindingLinkFactory())
  engine
    .getPortFactories()
    .registerFactory(
      new SimplePortFactory(
        "anet",
        config => new DiagramPortModel(PortModelAlignment.LEFT)
      )
    )

  engine.getStateMachine().pushState(new DefaultDiagramState())
  return engine
}

const PrototypeNode = ({ name, model, onClick }) => (
  <Badge style={{ margin: 10, background: "white", color: "#106ba3" }}>
    <div
      draggable
      onClick={onClick}
      onDragStart={event => {
        event.dataTransfer.setData(
          "storm-diagram-node",
          JSON.stringify({ anetObjectType: model.constructor.resourceName })
        )
      }}
    >
      <img
        src={model.iconUrl()}
        alt=""
        style={{
          marginLeft: 5,
          marginRight: 5,
          height: "2em",
          pointerEvents: "none"
        }}
      />
      {name}
    </div>
  </Badge>
)

PrototypeNode.propTypes = {
  name: PropTypes.string,
  model: PropTypes.object,
  onClick: PropTypes.func
}

const BoardDashboard = () => {
  const { dashboard } = useParams()
  const dashboardSettings = Settings.dashboards.find(o => o.label === dashboard)
  const [dropEvent, setDropEvent] = useState(null)
  const engineRef = useRef(createEngine())
  const [model, setModel] = useState(null)
  const [edit, setEdit] = useState(false)
  const [editedNode, setEditedNode] = useState(null)
  const [, updateState] = React.useState()
  const forceUpdate = useCallback(() => updateState({}), [])

  useEffect(() => {
    setModel(new DiagramModel())
  }, [])

  useEffect(() => {
    engineRef.current.setModel(model)
  }, [model])

  useEffect(() => {
    model && model.setLocked(!edit)
  }, [model, edit])

  useEffect(() => {
    async function fetchData() {
      await fetch(dashboardSettings.data)
        .then(response => response.json())
        .then(data => {
          const model = new DiagramModel()
          model.deserializeModel(data, engineRef.current)
          setModel(model)
        })
    }
    fetchData()
  }, [dashboardSettings.data])

  useEffect(() => {
    if (dropEvent) {
      const { data, point } = dropEvent
      const node = new DiagramNodeModel(data)

      node.setPosition(point)
      engineRef.current.getModel().addNode(node)
      setDropEvent(null)
      setEditedNode(node)
    }
  }, [model, dropEvent])

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        height: "100%"
      }}
    >
      <div
        style={{
          position: "relative",
          flexGrow: 1
        }}
        onDrop={event => {
          event.persist()
          const data = JSON.parse(
            event.dataTransfer.getData("storm-diagram-node")
          )
          const point = engineRef.current.getRelativeMousePoint(event)
          setDropEvent({ data, point })
        }}
        onDragOver={event => {
          event.preventDefault()
        }}
      >
        {engineRef.current.getModel() && (
          <CanvasWidget
            engine={engineRef.current}
            className="diagram-container"
          />
        )}
      </div>
      <div style={{ flexGrow: 0, display: "flex", flexDirection: "column" }}>
        <Button onClick={() => setEdit(!edit)}>{edit ? (<Icon icon={IconNames.DOUBLE_CHEVRON_RIGHT} />) : "Edit"}</Button>

        {edit && (
          <>
            {Object.values(Models).map(Model => {
              const instance = new Model()
              const modelName = instance.constructor.resourceName
              return (instance.iconUrl() && <PrototypeNode
                  key={`palette-${modelName}`}
                  model={instance}
                  name={modelName}
                  onClick={event => {
                    const data = { anetObjectType: modelName }
                    const point = {x:150, y:150}
                    setDropEvent({ data, point })
                  }}
                />)
            })}

            <Button
              onClick={() => {
                const blob = new Blob([JSON.stringify(model.serialize())], {
                  type: "application/json;charset=utf-8"
                })
                FileSaver.saveAs(blob, "BoardDashboard.json")
              }}
            >
              <img src={DOWNLOAD_ICON} height={16} alt="Export json" />
            </Button>
          </>
        )}
      </div>
      <Modal show={editedNode !== null} onHide={() => setEditedNode(null)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit diagram node</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <MultiTypeAdvancedSelectComponent
            onConfirm={(value, objectType) => {
              editedNode.options.anetObject = value
              editedNode.options.anetObjectType = objectType
            }}
            objectType={editedNode?.options.anetObjectType}
          />
        </Modal.Body>
      </Modal>
    </div>
  )
}

export default connect(null, mapPageDispatchersToProps)(BoardDashboard)
