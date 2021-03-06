/**
 * Copyright (c) 2017, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import {statement} from './../configs/designer-defaults';
import {lifeLine} from './../configs/designer-defaults';
import ASTNode from '../ast/node';
import ActionBox from './action-box';
import DragDropManager from '../tool-palette/drag-drop-manager';
import SimpleBBox from './../ast/simple-bounding-box';
import * as DesignerDefaults from './../configs/designer-defaults';
import MessageManager from './../visitors/message-manager';
import BallerinaASTFactory from './../ast/ballerina-ast-factory';
import './statement-decorator.css';
import select2 from 'select2';
import TransformRender from '../../ballerina/components/transform-render';
import ActiveArbiter from './active-arbiter';
import ImageUtil from './image-util';

const text_offset = 50;

class TransformStatementDecorator extends React.Component {

    constructor(props, context) {
        super(props, context);
        const {dragDropManager} = context;
        this.startDropZones = this.startDropZones.bind(this);
        this.stopDragZones = this.stopDragZones.bind(this);
        this.state = {
		    innerDropZoneActivated: false,
	        innerDropZoneDropNotAllowed: false,
	        innerDropZoneExist: false,
            active: 'hidden'
        };
    }

    componentDidMount() {
        const { dragDropManager } = this.context;
        dragDropManager.on('drag-start', this.startDropZones);
        dragDropManager.on('drag-stop', this.stopDragZones);
    }

    componentWillUnmount() {
        const { dragDropManager } = this.context;
        dragDropManager.off('drag-start', this.startDropZones);
        dragDropManager.off('drag-stop', this.stopDragZones);
    }

    startDropZones() {
        this.setState({innerDropZoneExist: true});
    }

    	stopDragZones() {
        this.setState({innerDropZoneExist: false});
    }

    onDelete() {
        this.props.model.remove();
    }

    	onJumptoCodeLine() {
    			const {viewState: {fullExpression}} = this.props;
    			const {renderingContext: {ballerinaFileEditor}} = this.context;

    			const container = ballerinaFileEditor._container;
    			$(container).find('.view-source-btn').trigger('click');
    			ballerinaFileEditor.getSourceView().jumpToLine({expression: fullExpression});
    	}

    	renderBreakpointIndicator() {
    			const breakpointSize = 14;
    			const pointX = this.statementBox.x + this.statementBox.w - breakpointSize/2;
    			const pointY = this.statementBox.y - breakpointSize/2;
    			return (
    					<Breakpoint
    							x={pointX}
    							y={pointY}
    							size={breakpointSize}
    							isBreakpoint={this.props.model.isBreakpoint}
    							onClick = { () => this.onBreakpointClick() }
    					/>
    			);
    	}

    	onBreakpointClick() {
    			const { model } = this.props;
    			const { isBreakpoint = false } = model;
    			if(model.isBreakpoint) {
    					model.removeBreakpoint();
    			} else {
    					model.addBreakpoint();
    			}
    	}

    onExpand() {
        self = this;
        this._package = this.context.renderingContext.getPackagedScopedEnvironment().getCurrentPackage();
        var sourceId = 'sourceStructs' + this.props.model.id;
        var targetId = 'targetStructs' + this.props.model.id;

        var sourceContent = $('<div class="leftType">' +
              '<div class="source-view">' +
              '<select id="' + sourceId + '" class="type-mapper-combo">' +
              '<option value="-1">--Select--</option>' +
              '</select>' +
              '</div></div>');

        var targetContent = $('<div class="rightType">' +
              '<div class="target-view">' +
              '<select id="' + targetId + '" class="type-mapper-combo">' +
              '<option value="-1">--Select--</option>' +
              '</select>' +
              '</div></div>');

        var transformNameText = $('<p class="transform-header-text "><i class="transform-header-icon fw fw-type-converter fw-inverse"></i>Transform</p>');
        var transformHeader = $('<div id ="transformHeader" class ="transform-header"></div>');
        var transformMenuDiv = $('<div id ="transformContextMenu" class ="transformContextMenu"></div>');

        var transformOverlayContent =  $('<div id = "transformOverlay-content" class="transformOverlay-content clearfix">'+
                                                   ' <span class="close-transform">&times;</span>'+
                                              '    </div>');

        var transformOverlay = $( '<div id="transformOverlay" class="transformOverlay">'+
                                     '  </div>' );

        transformOverlayContent.append(transformHeader);
        transformHeader.append(transformNameText);
        transformOverlayContent.append(sourceContent);
        transformOverlayContent.append(targetContent);
        transformOverlay.append(transformOverlayContent);
        transformOverlayContent.append(transformMenuDiv);
        $('#tab-content-wrapper').append(transformOverlay);

        this.transformOverlayDiv = document.getElementById('transformOverlay');
		  this.transformOverlayContentDiv = document.getElementById('transformOverlay-content');

		  this.transformOverlayContentDiv.addEventListener('mouseover', e => {
			  this.onTransformDropZoneActivate(e);
		  });

		  this.transformOverlayContentDiv.addEventListener('mouseout', e => {
			  this.onTransformDropZoneDeactivate(e);
		  });

        var span = document.getElementsByClassName('close-transform')[0];

        this.predefinedStructs = [];
        var transformIndex = this.props.model.parent.getIndexOfChild(this.props.model);
        _.forEach(this.props.model.parent.getVariableDefinitionStatements(), variableDefStmt => {
            var currentIndex = this.props.model.parent.getIndexOfChild(variableDefStmt);
            var structInfo = variableDefStmt.getLeftExpression().split(' ');
               //Checks struct defined before the transform statement
            if(currentIndex < transformIndex) {
                _.forEach(this._package.getStructDefinitions(), predefinedStruct => {
                    if (structInfo[0] ==  predefinedStruct.getStructName()) {
                        var struct = self.createType(structInfo[1], predefinedStruct);
                        self.loadSchemaToComboBox(sourceId, struct.name);
                        self.loadSchemaToComboBox(targetId, struct.name);
                    }
                });
            }
        });
        $('.type-mapper-combo').select2();

        $('#' + sourceId).on('select2:selecting', function (e) {
            var currentSelection = e.params.args.data.id;
            var previousSelection = $('#' + sourceId).val();
            if (currentSelection == -1) {
                self.mapper.removeType(previousSelection);
                self.props.model.children = [];
            } else if (currentSelection != $('#' + targetId).val()) {
                self.mapper.removeType(previousSelection);
                self.setSource(currentSelection, self.predefinedStructs);
                var inputDef = BallerinaASTFactory
                                        .createVariableReferenceExpression({variableName: currentSelection});
                self.props.model.setInput([inputDef]);
                self.props.model.children = [];
            } else {
                return false;
            }
        });

        $('#' + targetId).on('select2:selecting', function (e) {
            var currentSelection = e.params.args.data.id;
            var previousSelection = $('#' + targetId).val();
            if (currentSelection == -1) {
                self.mapper.removeType(previousSelection);
                self.props.model.children = [];
            } else if (currentSelection != $('#' + sourceId).val()) {
                self.mapper.removeType(previousSelection);
                self.setTarget(currentSelection, self.predefinedStructs);
                var outDef = BallerinaASTFactory
                                        .createVariableReferenceExpression({variableName: currentSelection});
                self.props.model.setOutput([outDef]);
                self.props.model.children = [];
            } else {
                return false;
            }
        });

        $(window).on('resize', function(){
            self.mapper.reposition(self.mapper);
        });

        span.onclick = function() {
            document.getElementById('transformOverlay').style.display = 'none';
            $(transformOverlay).remove();
        };


        var onConnectionCallback = function(connection) {
            var sourceStruct = _.find(self.predefinedStructs, { name:connection.sourceStruct});
            var targetStruct = _.find(self.predefinedStructs, { name:connection.targetStruct});
            let sourceExpression = self.getStructAccessNode(connection.targetStruct, connection.targetProperty);
            let targetExpression = self.getStructAccessNode(connection.sourceStruct, connection.sourceProperty);

            if (!_.isUndefined(sourceStruct) && !_.isUndefined(targetStruct)) {
                    //Connection is from source struct to target struct.
                let assignmentStmt = BallerinaASTFactory.createAssignmentStatement();
                let leftOperand = BallerinaASTFactory.createLeftOperandExpression();
                leftOperand.addChild(sourceExpression);
                let rightOperand = BallerinaASTFactory.createRightOperandExpression();
                rightOperand.addChild(targetExpression);
                assignmentStmt.addChild(leftOperand);
                assignmentStmt.addChild(rightOperand);
                self.props.model.addChild(assignmentStmt);
                return assignmentStmt.id;
            } else if (!_.isUndefined(sourceStruct) && _.isUndefined(targetStruct)) {
                    // Connection source is not a struct and target is a struct.
                    // Source could be a function node.
                let assignmentStmt = self.findExistingAssignmentStatement(connection.targetStruct);
                assignmentStmt.getChildren()[0].addChild(targetExpression);
                return assignmentStmt.id;
            } else if (_.isUndefined(sourceStruct) && !_.isUndefined(targetStruct)) {
                    // Connection target is not a struct and source is a struct.
                    // Target could be a function node.
                let assignmentStmt = self.findExistingAssignmentStatement(connection.sourceStruct);
                assignmentStmt.getChildren()[1].getChildren()[0].addChild(sourceExpression);
                return assignmentStmt.id;
            } else {
                    // Connection source and target are not structs
                    // Source and target could be function nodes.
                log.warn('multiple intermediate functions are not yet supported in design view');
            }
        };

        var onDisconnectionCallback = function(connection) {
            var con =  _.find(self.props.model.children, { id:connection.id});
            self.props.model.removeChild(con);
        };

        this.mapper = new TransformRender(onConnectionCallback, onDisconnectionCallback);
        this.transformOverlayDiv.style.display = 'block';

        if(self.props.model.getInput() != null && self.props.model.getInput().length > 0) {
            var sourceType = self.props.model.getInput()[0].getExpression();
            $('#' + sourceId).val(sourceType).trigger('change');
            self.setSource(sourceType, self.predefinedStructs);
        }

        if(self.props.model.getOutput() != null && self.props.model.getOutput().length > 0) {
            var targetType = self.props.model.getOutput()[0].getExpression();
            $('#' + targetId).val(targetType).trigger('change');
            self.setTarget(targetType, self.predefinedStructs);
        }

        _.forEach(this.props.model.getChildren(), statement => {
            this.createConnection(statement);
        });

        this.props.model.on('child-added', node => {
            if (BallerinaASTFactory.isAssignmentStatement(node) &&
					BallerinaASTFactory.isFunctionInvocationExpression(node.getChildren()[1].getChildren()[0])) {
                let functionInvocationExpression = node.getChildren()[1].getChildren()[0];
                let funPackage = this.context.renderingContext.packagedScopedEnvironemnt.getPackageByName(
						functionInvocationExpression.getFullPackageName());
                let func = funPackage.getFunctionDefinitionByName(functionInvocationExpression.getFunctionName());
                this.mapper.addFunction(func, node, node.getParent().removeChild.bind(node.getParent()));
            }
        });
    }

    createConnection(statement){
        if (BallerinaASTFactory.isAssignmentStatement(statement)){
            let leftExpression = statement.getChildren()[0].getChildren()[0];
            let rightExpression = statement.getChildren()[1].getChildren()[0];

            if (BallerinaASTFactory.isFieldAccessExpression(rightExpression)) {
                let con = {};
                con.id = statement.id;
                con.sourceStruct = rightExpression.getChildren()[0].getVariableName();
                var complexSourceProp = this.createComplexProp(con.sourceStruct,
                                           rightExpression.getChildren()[1].getChildren());
                con.sourceType = complexSourceProp.types.reverse();
                con.sourceProperty = complexSourceProp.names.reverse();

                con.targetStruct = leftExpression.getChildren()[0].getVariableName();
                var complexTargetProp = this.createComplexProp(con.targetStruct,
                                          leftExpression.getChildren()[1].getChildren());
                con.targetType = complexTargetProp.types.reverse();
                con.targetProperty = complexTargetProp.names.reverse();
                con.isComplexMapping = false;

                self.mapper.addConnection(con);

            } else if (BallerinaASTFactory.isFunctionInvocationExpression(rightExpression)){
                let funPackage = this.context.renderingContext.packagedScopedEnvironemnt.getPackageByName(
				rightExpression.getFullPackageName());
                let func = funPackage.getFunctionDefinitionByName(rightExpression.getFunctionName());
                this.mapper.addFunction(func, statement, statement.getParent().removeChild.bind(statement.getParent()));

                _.forEach(rightExpression.getParams(), (parameter, i) => {
                    // draw source struct to function connection
                    let conLeft = {};
                    conLeft.id = leftExpression.id;
                    conLeft.sourceStruct = rightExpression.getChildren()[0].getChildren()[0].getVariableName();
                    var complexSourceProp = this.createComplexProp(conLeft.sourceStruct,
                                        rightExpression.getChildren()[0].getChildren()[1].getChildren());
                    conLeft.sourceType = complexSourceProp.types.reverse();
                    conLeft.sourceProperty = complexSourceProp.names.reverse();

                    conLeft.targetFunction = true;
                    conLeft.targetStruct = func.meta.packageName + '-' + func.getName();
                    conLeft.targetId = rightExpression.getID();
                    conLeft.targetProperty = [func.getParameters()[i].name];
                    conLeft.targetType = [func.getParameters()[i].type];

                    self.mapper.addConnection(conLeft);

                    // draw function to target struct connection
                    let conRight = {};
                    conRight.id = rightExpression.id;
                    conRight.sourceFunction = true;
                    conRight.sourceStruct = func.meta.packageName + '-' + func.getName();
                    conRight.sourceId = rightExpression.getID();
                    conRight.sourceProperty = [func.getParameters()[i].name];
                    conRight.sourceType = [func.getParameters()[i].type];

                    conRight.targetStruct = leftExpression.getChildren()[0].getVariableName();
                    var complexTargetProp = this.createComplexProp(conRight.targetStruct,
                                          leftExpression.getChildren()[1].getChildren());
                    conRight.targetType = complexTargetProp.types.reverse();
                    conRight.targetProperty = complexTargetProp.names.reverse();
                    conRight.isComplexMapping = false;
                    self.mapper.addConnection(conRight);
                });
            }
        } else {
            log.error('invalid statement type in transform statement');
        }
    }

    findExistingAssignmentStatement(id){
        return _.find(self.props.model.getChildren(), function(child) {
            let exp = child.getChildren()[1].getChildren()[0];
            return (BallerinaASTFactory.isFunctionInvocationExpression(exp)) && (_.endsWith(id, exp.getID()));
        });
    }

    createComplexProp(typeName, children)
    {
        var prop = {};
        prop.names = [];
        prop.types = [];

        if (children.length == 1) {
            var propName = children[0].getBasicLiteralValue();
            var struct = _.find(self.predefinedStructs, { name:typeName});
            var propType =  _.find(struct.properties, { name:propName}).type;
            prop.types.push(propType);
            prop.names.push(propName);
        } else {
            var propName = children[0].getBasicLiteralValue();
            var struct = _.find(self.predefinedStructs, { name:typeName});
            var propType =  _.find(struct.properties, { name:propName}).type;
            prop = self.createComplexProp(propName, children[1].getChildren());
            prop.types.push(propType);
            prop.names.push(propName);
        }

        return prop;
    }
    createType(name, predefinedStruct) {
        var struct = {};
        struct.name = name;
        struct.properties = [];

        _.forEach(predefinedStruct.getVariableDefinitionStatements(), stmt => {
            var property = {};
            var structPopInfo = stmt.getLeftExpression().split(' ');
            property.name  = structPopInfo[1];
            property.type  = structPopInfo[0];

            var innerStruct = _.find(self._package.getStructDefinitions(), { _structName:property.type});
            if (innerStruct != null) {
                property.innerType = self.createType(property.name, innerStruct);
            }

            struct.properties.push(property);
        });
        self.predefinedStructs.push(struct);
        return struct;
    }

    render() {
    		const { viewState, expression ,model} = this.props;
    		let bBox = viewState.bBox;
    		let innerZoneHeight = viewState.components['drop-zone'].h;

    		// calculate the bBox for the statement
    		this.statementBox = {};
    		this.statementBox.h = bBox.h - innerZoneHeight;
    		this.statementBox.y = bBox.y + innerZoneHeight;
    		this.statementBox.w = bBox.w;
    		this.statementBox.x = bBox.x;
    		// we need to draw a drop box above and a statement box
    		const text_x = bBox.x + (bBox.w / 2);
    		const text_y = this.statementBox.y + (this.statementBox.h / 2);
        const expand_button_x = bBox.x + (bBox.w / 2) + 40;
        const expand_button_y = this.statementBox.y + (this.statementBox.h / 2) - 10;
    		const drop_zone_x = bBox.x + (bBox.w - lifeLine.width)/2;
    		const innerDropZoneActivated = this.state.innerDropZoneActivated;
    		const innerDropZoneDropNotAllowed = this.state.innerDropZoneDropNotAllowed;
    		const dropZoneClassName = ((!innerDropZoneActivated) ? 'inner-drop-zone' : 'inner-drop-zone active')
    											+ ((innerDropZoneDropNotAllowed) ? ' block' : '');

    		const actionBbox = new SimpleBBox();
        const fill = this.state.innerDropZoneExist ? {} : {fill:'none'};
        const iconSize = 14;
    		actionBbox.w = DesignerDefaults.actionBox.width;
    		actionBbox.h = DesignerDefaults.actionBox.height;
    		actionBbox.x = bBox.x + ( bBox.w - actionBbox.w) / 2;
    		actionBbox.y = bBox.y + bBox.h + DesignerDefaults.actionBox.padding.top;
    		let statementRectClass = 'transform-statement-rect';
    		if(model.isDebugHit) {
    				statementRectClass = `${statementRectClass} debug-hit`;
    		}

    		return (
           <g className="statement"
               onMouseOut={ this.setActionVisibility.bind(this, false) }
               onMouseOver={ this.setActionVisibility.bind(this, true)}>
    						<rect x={drop_zone_x} y={bBox.y} width={lifeLine.width} height={innerZoneHeight}
    			                className={dropZoneClassName} {...fill}
    						 		onMouseOver={(e) => this.onDropZoneActivate(e)}
    								onMouseOut={(e) => this.onDropZoneDeactivate(e)}/>
    						<rect x={bBox.x} y={this.statementBox.y} width={bBox.w} height={this.statementBox.h} className={statementRectClass}
    							  onClick={(e) => this.onExpand()} />
    						<g className="statement-body">
    							<text x={text_x} y={text_y} className="transform-action" onClick={(e) =>this.onExpand()}>{expression}</text>
    							 <image className="transform-action-icon" x={expand_button_x} y={expand_button_y} width={ iconSize } height={ iconSize } onClick={(e) =>this.onExpand()} xlinkHref={ ImageUtil.getSVGIconString('expand')}/>
    						</g>
						<ActionBox
                            bBox={ actionBbox }
                            show={ this.state.active }
                            onDelete={ () => this.onDelete() }
                            onJumptoCodeLine={ () => this.onJumptoCodeLine() }
						/>
						{		model.isBreakpoint &&
								this.renderBreakpointIndicator()
						}
    				{this.props.children}
    				</g>);
    	}

    setActionVisibility (show) {
        if (!this.context.dragDropManager.isOnDrag()) {
            if (show) {
                this.context.activeArbiter.readyToActivate(this);
            } else {
                this.context.activeArbiter.readyToDeactivate(this);
            }
        }
    }

    onTransformDropZoneActivate (e) {
        this.transformOverlayContentDiv = document.getElementById('transformOverlay-content');
        const dragDropManager = this.context.dragDropManager,
            dropTarget = this.props.model,
            model = this.props.model;
        if (dragDropManager.isOnDrag()) {
            if (_.isEqual(dragDropManager.getActivatedDropTarget(), dropTarget)){
                return;
            }
            dragDropManager.setActivatedDropTarget(dropTarget,
				(nodeBeingDragged) => {
					// This drop zone is for assignment statements only.
    return model.getFactory().isAssignmentStatement(nodeBeingDragged);
},
				() => {
    return dropTarget.getChildren().length;
});
        }
        e.stopPropagation();
    }

    onTransformDropZoneDeactivate (e) {
        this.transformOverlayContentDiv = document.getElementById('transformOverlay-content');
        const dragDropManager = this.context.dragDropManager,
            dropTarget = this.props.model.getParent();
        if(dragDropManager.isOnDrag()){
            if(_.isEqual(dragDropManager.getActivatedDropTarget(), dropTarget)){
                dragDropManager.clearActivatedDropTarget();
                this.setState({innerDropZoneActivated: false, innerDropZoneDropNotAllowed: false});
            }
        }
        e.stopPropagation();
    }
    onDropZoneActivate (e) {
        const dragDropManager = this.context.dragDropManager,
            dropTarget = this.props.model.getParent(),
            model = this.props.model;
        if(dragDropManager.isOnDrag()) {
            if(_.isEqual(dragDropManager.getActivatedDropTarget(), dropTarget)){
                return;
            }
            dragDropManager.setActivatedDropTarget(dropTarget,
							(nodeBeingDragged) => {
									// IMPORTANT: override node's default validation logic
									// This drop zone is for statements only.
									// Statements should only be allowed here.
    return model.getFactory().isStatement(nodeBeingDragged);
},
							() => {
    return dropTarget.getIndexOfChild(model);
}
					);
            this.setState({innerDropZoneActivated: true,
                innerDropZoneDropNotAllowed: !dragDropManager.isAtValidDropTarget()
            });
            dragDropManager.once('drop-target-changed', function(){
                this.setState({innerDropZoneActivated: false, innerDropZoneDropNotAllowed: false});
            }, this);
        }
        e.stopPropagation();
    }

    onDropZoneDeactivate (e) {
        const dragDropManager = this.context.dragDropManager,
			  dropTarget = this.props.model.getParent();
        if(dragDropManager.isOnDrag()){
            if(_.isEqual(dragDropManager.getActivatedDropTarget(), dropTarget)){
                dragDropManager.clearActivatedDropTarget();
                this.setState({innerDropZoneActivated: false, innerDropZoneDropNotAllowed: false});
            }
        }
        e.stopPropagation();
    }

    onArrowStartPointMouseOver (e) {
    		e.target.style.fill = '#444';
    		e.target.style.fillOpacity = 0.5;
    		e.target.style.cursor = 'url(images/BlackHandwriting.cur), pointer';
    	}

    	onArrowStartPointMouseOut (e) {
    		e.target.style.fill = '#444';
    		e.target.style.fillOpacity = 0;
    	}

    	onMouseDown (e) {
    		const messageManager = this.context.messageManager;
    		const model = this.props.model;
    		const bBox = model.getViewState().bBox;
    		const statement_h = this.statementBox.h;
    		const messageStartX = bBox.x +  bBox.w;
    		const messageStartY = this.statementBox.y +  statement_h/2;
    		let actionInvocation;
    		if (ASTFactory.isAssignmentStatement(model)) {
    			actionInvocation = model.getChildren()[1].getChildren()[0];
    		} else if (ASTFactory.isVariableDefinitionStatement(model)) {
    			actionInvocation = model.getChildren()[1];
    		}
    		messageManager.setSource(actionInvocation);
    		messageManager.setIsOnDrag(true);
    		messageManager.setMessageStart(messageStartX, messageStartY);

    		messageManager.setTargetValidationCallback(function (destination) {
    			return actionInvocation.messageDrawTargetAllowed(destination);
    		});

    		messageManager.startDrawMessage(function (source, destination) {
    			source.setAttribute('_connector', destination);
    		});
    	}

    	onMouseUp (e) {
    		const messageManager = this.context.messageManager;
    		messageManager.reset();
    	}

    	openExpressionEditor(e){
    		let options = this.props.editorOptions;
    		let packageScope = this.context.renderingContext.packagedScopedEnvironemnt;
    		if(options){
    			new ExpressionEditor( this.statementBox , this.context.container ,
    				(text) => this.onUpdate(text), options , packageScope );
    		}
    	}

    	onUpdate(text){
    	}

    loadSchemaToComboBox(comboBoxId, name) {
        $('#' + comboBoxId).append('<option value="' + name + '">' + name + '</option>');
    }


    createAccessNode(name, property) {
        var structExpression = BallerinaASTFactory.createFieldAccessExpression();
        var structPropertyHolder = BallerinaASTFactory.createFieldAccessExpression();
        var structProperty = BallerinaASTFactory.createBasicLiteralExpression({basicLiteralType:'string',
            basicLiteralValue:property});
        var structName =  BallerinaASTFactory.createVariableReferenceExpression();

        structName.setVariableName(name);
        structExpression.addChild(structName);
        structPropertyHolder.addChild(structProperty);
        structExpression.addChild(structPropertyHolder);

        return structExpression;
    }

    getStructAccessNode(name, property) {
        var structExpressions = [];

        _.forEach(property, prop => {
            structExpressions.push(self.createAccessNode(name, prop));
        });

        for (var i = structExpressions.length - 1; i > 0 ; i--) {
            structExpressions[i-1].children[1].addChild(structExpressions[i].children[1]);
        }
        return structExpressions[0];
    }

    setSource(currentSelection, predefinedStructs) {
        var sourceSelection =  _.find(predefinedStructs, { name:currentSelection});
        self.mapper.addSourceType(sourceSelection);
    }

    setTarget(currentSelection, predefinedStructs) {
        var targetSelection = _.find(predefinedStructs, { name: currentSelection});
        self.mapper.addTargetType(targetSelection);
    }

}

TransformStatementDecorator.propTypes = {
    bBox: PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
        w: PropTypes.number.isRequired,
        h: PropTypes.number.isRequired,
    }),
    model: PropTypes.instanceOf(ASTNode).isRequired,
    expression: PropTypes.string.isRequired,
};

TransformStatementDecorator.contextTypes = {
	 dragDropManager: PropTypes.instanceOf(DragDropManager).isRequired,
	 container: PropTypes.instanceOf(Object).isRequired,
	 renderingContext: PropTypes.instanceOf(Object).isRequired,
	 activeArbiter: PropTypes.instanceOf(ActiveArbiter).isRequired
};

export default TransformStatementDecorator;
