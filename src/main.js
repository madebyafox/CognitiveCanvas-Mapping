/* main.js */
var nodes = [];
var links = [];

var clientId, webstrateId, clicked_object, dragged_object = null;

var canvas = document.getElementById("canvas");
var radius = 40;
var height = 40;
var width = 40;
var defaultSize = null;
var defaultRadius = 20;
var defaultShape = "circle";
var defaultColor = "rgba(46, 127, 195, 0.1)";
var styleNode = null;

/* interact.js */
var mouseUp = 0;
var mouseDown = 0;
var delay = 300;
var mouseMoved = false;
var singleClickTimer, doubleClickDragTimer = null;

var hoveredEle = null;
var addWindowOpen = false;
var drawing_enabled = false;
var eraser_enabled = false;
var original_color = null;

// drag_line & source_node are stored as html element
var drag_line = null; 
var source_node = null;

var zoom = null;

var quickAddDist = 10 + MAX_RADIUS;

/**
canvas.addEventListener("mouseup", (e) => mouseUpListener(e));
canvas.addEventListener("mousedown", (e) => mouseDownListener(e));
canvas.addEventListener("contextmenu", (e) => rightClickListener(e));
canvas.addEventListener("mousemove", (e) => mouseMoveListener(e));
canvas.addEventListener("mouseover", (e) => mouseOverListener(e));
canvas.addEventListener("mouseout", (e) => mouseOutListener(e));
**/
window.addEventListener("keypress", (e) => keyPressListener(e));
window.addEventListener("keydown", (e) => keyDownListener(e));

function mouseUpListener(e) {
  if (drawing_enabled) return; 
    
  mouseUp++;

  if(mouseUp === 1 && dragged_object && !mouseMoved ){
    dragged_object = null;
  }

  if (mouseUp === 1 && mouseDown === 1) {
    singleClickTimer = setTimeout(() => {
      console.log("single click");
      $("#contextMenu").css({
        display: "none"
      });
      singleClickEvent(e);
    }, delay);
  }
  else if (mouseUp === 2 && mouseDown === 2 && !mouseMoved) {
    console.log("double click");
    doubleClickEvent(e);
  }
  else if (mouseUp === 2 && mouseDown === 2 && mouseMoved) {
    console.log("double click drag");
    selectLineDest(e);
  }
  else {
    resetState();
  }
}

function mouseDownListener(e) {
  if (drawing_enabled) return; 
    
  mouseDown++;
  e.preventDefault();

  if(temp_label_div){
    e.stopImmediatePropagation();
    handleClickDuringLabelInput();
    resetState();
    return;
  }

  if (mouseDown === 1) {
    dragStartPos = [e.screenX, e.screenY];
    clicked_object = $(e.target).hasClass("group") ? e.target : getParentMapElement(e.target);
  }
  else if (mouseDown === 2 && mouseUp === 1) {
    clearTimeout(singleClickTimer);
    var node = getParentMapElement(e.target);
    selectSrcNode(node);
    doubleClickDragTimer = setTimeout(() => {
      let className = node.getAttribute("class").split(" ")[0];
      if (className === "node") {
        revealDragLine();
      }
    }, delay);
  }
  else {
    resetState();
  }
}

function rightClickListener(e) {
  let className = e.target.getAttribute("class").split(" ")[0];

  if (className != "canvas") {
    e.preventDefault();
  }

  switch(className) {
    case "node-rep":
      break;
    case "link-rep":
      break;
    case "selection_area":
      break;
    default:
      break;
  }
  resetState();
}

function mouseMoveListener(e) {
  if (drawing_enabled) return; 
  
  var canvasMousePoint = eventToCanvasPoint(e);

  if (mouseDown > 0 && 
    Math.sqrt( Math.pow(e.screenX - dragStartPos[0],2) + Math.pow(e.screenY - dragStartPos[1], 2)) >= DRAG_TOLERANCE ) {
    mouseMoved = true;
  }
  if (mouseDown === 1 && mouseUp === 0) {
    if(dragged_object){
      var selection = d3.select(dragged_object);
      if(selection.classed("node")){
        //drawDragNode(e);
      }else if(selection.classed("group") ){
        moveGroup(selection.node(), e.pageX, e.pageY);
      }
    }else{
      if(clicked_object){
        selectDraggedObject(e);
      } else {
        console.log("drawing selection area");
        drawSelectionArea(canvasMousePoint);
      }
    }
  }
  else if (mouseDown === 2 && source_node) {
    drawDragLine(canvasMousePoint);
  }
}

function mouseOverListener(e) {
  if (drawing_enabled) return;

  if (e.target.tagName === "tspan") {
    return;
  }
  
  let className = e.target.getAttribute("class").split(" ")[0];
  
  switch(className) {
    case "node-rep":
      hoveredEle = e.target.parentElement.getAttribute("id");
      if (nodes.find(x => x.id === hoveredEle)){
        if (nodes.find(x => x.id === hoveredEle).content === "true"){
            previewContent(hoveredEle);
        }
      }
      break;
    case "label":
      hoveredEle = e.target.parentElement.getAttribute("id");
      if (nodes.find(x => x.id === hoveredEle)){
        if (nodes.find(x => x.id === hoveredEle).content === "true"){
            previewContent(hoveredEle);
        }
      }
      break;
    case "link-rep":
      hoveredEle = e.target.parentElement.getAttribute("id");
      if (links.find(x => x.id === hoveredEle)){
        if (links.find(x => x.id === hoveredEle).content === "true"){
          previewContent(hoveredEle);
        }
      }
      break;
    default:
      break;
  }
}

function mouseOutListener(e) {
  if (drawing_enabled) return;    

  if (e.target.tagName === "tspan") {
    return;
  }
  
  let className = e.target.getAttribute("class").split("-")[0];

  switch(className) {
    case "node":
      if (nodes.find(x => x.id === hoveredEle)) {
        if (nodes.find(x => x.id === hoveredEle).content){
          var elem = document.getElementById("previewing");
          if (elem) {
            elem.parentNode.removeChild(elem);
          }
        }
      }
      break;
    case "label":
      if (nodes.find(x => x.id === hoveredEle)) {
        if (nodes.find(x => x.id === hoveredEle).content){
          var elem = document.getElementById("previewing");
          if (elem) {
            elem.parentNode.removeChild(elem);
          }
        }
      }
      break;
    case "link":
      if (links.find(x => x.id === hoveredEle)) {
        if (links.find(x => x.id === hoveredEle).content){
          var elem = document.getElementById("previewing");
          if (elem) {
            elem.parentNode.removeChild(elem);
          }
        }
      }
      break;
    default:
      break;
  }
  hoveredEle = null;
}

function keyPressListener(e) {
  var key = e.key;

  switch(key) {
    case "1": // #1
      if (hoveredEle && !addWindowOpen) addEleContent(e);
      break;
    default:
      //Edit a node's label if one node is selected and an alphanumeric key is pressed
      if(!temp_label_div){
        //console.log("key press on node was triggered");
        e.preventDefault();
        var regExp = /^[A-Za-z0-9]+$/;
        var selectedNodes = d3.selectAll(".selected");
        if(key.match(regExp) && key.length === 1 && selectedNodes.size() === 1){
          addLabel(e.key, selectedNodes.node(), false);
        }
      }
      break;
  }
}

function keyDownListener(e){
  var key = e.key;
  console.log("keyDown: " + key);
  switch(key) {
    case "Enter":
    case "Tab": // Tab
      if (!temp_label_div) {
        e.preventDefault();
        quickAdd(key);
      }
      break;
    case "Backspace":
      if(!temp_label_div){
        e.preventDefault();
        e.stopImmediatePropagation();
        d3.selectAll(".node.selected").each(function(){removeNode(this)});
        d3.selectAll(".link.selected").each(function(){removeLink(this)});
        d3.selectAll(".map-image.selected").remove();
      }
      break;
    case "ArrowRight":
      selectNodeByDirection("right");
      break;
    case "ArrowLeft":
      selectNodeByDirection("left");
      break;
    case "ArrowUp":
      selectNodeByDirection("up");
      break;
    case "ArrowDown":
      selectNodeByDirection("down");
      break;
    default:
      break;
  }
}

/*
 * Single click interaction
 * - canvas: add a new node
 * - existing node:
 * - existing link:
 */
function singleClickEvent(e) {
  this.focus();

  let entity = e.target.getAttribute("class").split(" ")[0];

  if(selection_area){
    //console.log("single click while there is a selection area");
    createGroup();
  } else if(dragged_object){
    //console.log("single click while there is a dragged object");
  } else {
    let addedNode = null;
    //console.log("regular single click");
    switch(entity) {
      case "canvas":
        deselectAllObjects();
        break;
      case "node-rep":
      case "link-rep":
      case "label":
      case "label-line":
        console.log("node rep was clicked");
        var node = getParentMapElement(e.target);
        styleNode = e.target;
        console.log("styleNode", styleNode);
        if( d3.select(node).classed("selected") ){
          console.log("Adding a label it a selected node that was clicked");
          addLabel(null, node);
        } else{
          selectNode(node, !e.shiftKey);
        }
        sendSearchMsgToContainer();
        break;
      case "selection_area":
        addedNode = addNode(e.clientX, e.clientY);
        addLabel("Node Name", addedNode);
        addNodeToGroup(addedNode, e.target);
        break;
      case "map-image":
        selectNode(e.target);
        var childrenNodes = getGroupedNodes(e.target);
        selectNode(childrenNodes, false);
        break;
      default:
        break;
    }
  }

  resetState();
}


/*
 * Double click interaction
 * - canvas:
 * - existing node: add label
 * - existing link: add label
 *
 */
function doubleClickEvent(e) {
  if (drawing_enabled) return;
  
  clearTimeout(doubleClickDragTimer);
  e.preventDefault();
  let selection = d3.select(e.target);
  let className = selection.attr("class").split(" ")[0]
  var node = getParentMapElement(e.target);
  console.log(className);

  var mousePoint = new Transformer.Point(e.clientX, e.clientY);
  var canvasPoint = canvas.transformer.fromGlobalToLocal(mousePoint);

  switch(className) {
    case "canvas":
      addedNode = addNode();
      var node = drawNode(addedNode, canvasPoint.x, canvasPoint.y, defaultShape, radius, defaultColor);
      Transformer.hammerize(node).then(
        function(success){
          selectNode(node, !e.shiftKey);
          addLabel("Node Name", node);
        }, function(failure){
          console.log(failure);
        });
      break;
    case "node-rep":
    case "label-rep":
    case "label":
    case "label-line":
      if( !$(node).hasClass("selected") ){
        selectNode(node, !e.shiftKey);
      }
      addLabel(null, node);
      break;
    case "map-image":
      addedNode = addNode();
      var node = drawNode(addedNode, e.clientX, e.clientY, defaultShape, radius, defaultColor);
      $(node).addClass("pin");
      selectNode(node, !e.shiftKey);
      addLabel("Node Name", node);
      addNodeToGroup(addedNode, e.target);
      break;
    default:
      break;
  }
  
  resetState();
}

// Message Passing to the Container Code. Package include the id & label
function sendSearchMsgToContainer() {
  if (window.parent) {
    //console.log(window.parent);
    let selected = d3.select(".selected");
    if (!selected.empty()) {
      let nodeID = selected.attr("id");
      let labelElement = document.getElementById(nodeID+"_text");
      let labelText;
      if (labelElement.getElementsByTagName("tspan")[0]) {
        labelText = labelElement.getElementsByTagName("tspan")[0].innerHTML;
        //console.log("In View Mode, get label: " + labelText);
      } else {
        labelText = labelElement.innerHTML;
        //console.log("In Edit Mode, get label: " + labelText);
      }
      let package = {
        id: nodeID,
        label: labelText
      };
      window.parent.postMessage(package, "*");
    }
  }
}

/* entity.js */
function getID() {
  return clientId + "_" + Date.now();
}

function addNode() {
  let node = { type: "node", id: getID(), content: "false" };
  n = nodes.push(node);

  return node;
}

//TODO: Fix bug where nodes are replaced on redraw with d3.enter()
function addNode(x, y) {
  let node = { type: "node", 
               id: getID(), 
               x: x,
               y: y,
               shape: defaultShape,
               color:defaultColor,
               radius: radius,
               content: false };
  n = nodes.push(node);
  //redraw(); TODO: Fix bug where nodes are replaced on redraw
  console.log(nodes);
  return node;
}

function addLink(sourceId, destId) {
  let link = { type: "link", id: getID(), sourceId: sourceId, destId: destId, content: "false" };
  l = links.push(link);

  //console.log("add link", links);
  return link;
}

function deleteEntity(entities, id) {
  let index = entities.findIndex((n) => n.id === id);
  if (index > -1) {
    entities.splice(index, 1);
  }
}

function drawNode(node, cx, cy, shape=defaultShape, radius=defaultRadius, color=defaultColor) {
  let x = parseInt(cx)
  let y = parseInt(cy)

  if (shape === "circle") {
    var nodeG = d3.select(canvas)
      .append("g")
      .attr("class", "node")
      .attr("id", node.id)
      .attr("content", "false")
      .attr("transform", "matrix(1,0,0,1,"+x+","+y+")");
    nodeG
      .append(shape)
      .attr("class", "node-rep")
      .style("fill", color)
      .style("z-index", 1)
      .attr("r", radius)
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("xmlns", "http://www.w3.org/2000/svg");
  }

  if (shape === "rect") {
    var nodeG = d3.select(canvas)
      .append("g")
      .attr("class", "node")
      .attr("id", node.id)
      .attr("content", "false")
      .attr("transform", "translate("+x+","+y+")");
    nodeG
      .append(shape)
      .attr("class", "node-rep")
      .style("fill", color)
      .style("z-index", 1)
      .attr("width", width)
      .attr("height", height)
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("xmlns", "http://www.w3.org/2000/svg");
  }
  return nodeG.node();
}

function drawLink(link) {
  let linkSrcNode = document.getElementById(link.sourceId);
  let linkDestNode = document.getElementById(link.destId);
  //console.log("source node: " + linkSrcNode + ", dest node: " + linkDestNode);
  let srcPos = getNodePosition(linkSrcNode);
  let destPos = getNodePosition(linkDestNode);

  //Inserts the link before all the nodes in the canvas
  var linkG = d3.select(canvas)
    .insert("g", ".node")
    .attr("class", "link")
    .attr("id", link.id)
    .attr("source_id", link.sourceId)
    .attr("target_id", link.destId)
    .attr("content", "false");
  linkG
    .append("line")
    .attr("class", "link-rep")
    .attr("id", link.id)
    .attr("x1", srcPos.x)
    .attr("y1", srcPos.y)
    .attr("x2", destPos.x)
    .attr("y2", destPos.y)
    .attr("xmlns", "http://www.w3.org/2000/svg");

    return linkG.node();
}

function removeNode(node) {
  console.log(node);
  let node_d3 = node instanceof d3.selection ?  node : d3.select(node);
  let node_id = node_d3.attr("id");

  d3.selectAll(`[source_id=${node_id}]`)
    .remove();

  d3.selectAll(`[target_id=${node_id}]`)
    .remove();

  d3.selectAll(".selection_area[children_ids~=" + node_id + "]")
    .each(function(){
      let group = d3.select(this);
      group.attr("children_ids", group.attr("children_ids").split(' ').filter(id => id !== node_id).join(' ') );
    });

  closePreviewIframe("node");
  deleteEntity(nodes, node_id); 
  node_d3.remove();
}

function removeLink(link) {
  link = link instanceof d3.selection ? link : d3.select(link);
  let link_id = link.attr("id");
  closePreviewIframe("edge");
  deleteEntity(links, link_id);
  link.remove();
}

function closePreviewIframe(target) {
  if (hoveredEle) {
    
    switch (target) {
      case "node":
        if (nodes.find(x => x.id === hoveredEle)) {
          if (nodes.find(x => x.id === hoveredEle).content){
            var elem = document.getElementById("previewing");
            if (elem) {
              elem.parentNode.removeChild(elem);
            }
          }
        }
        break;
      case "edge":
        if (links.find(x => x.id === hoveredEle)) {
          if (links.find(x => x.id === hoveredEle).content){
            var elem = document.getElementById("previewing");
            if (elem) {
              elem.parentNode.removeChild(elem);
            }
          }
        }
        break;
      default:
        console.warn("Invalid Function Call on closePreviewIframe(target)");
        break;
    }
    
  }
}

function resetState() {
  //console.log("state was reset");
  mouseDown = 0;
  mouseUp = 0;
  mouseMoved = false;
  source_node = null;
  dragged_object = null;
  clicked_object = null;
  dragStartPos = null;
  drag_offset = [0,0];
  clearTimeout(singleClickTimer);
  clearTimeout(doubleClickDragTimer);
}

function selectDraggedObject(e) {
  console.log("selecting dragged object");
  console.log(e.target);
  var obj = getParentMapElement(e.target);
  if (obj) {
    dragged_object = obj;
    //selectNode(parentNode);
  } else if( $(e.target).hasClass("group") ){
    dragged_object = e.target;
    var dragged_group = d3.select(dragged_object);
    drag_offset = [dragged_group.attr("x") - e.pageX, dragged_group.attr("y") - e.pageY]
  }
  console.log("draggedObject: " + dragged_object);
}

function selectLineDest(node) {
  hideDragLine();
  if (dragged_object) {
    dragged_object = null
  }
  var selection = $(node);
  let sourceNode = $(source_node);
  if (sourceNode && 
      $(selection).hasClass("node") && 
      selection.attr("id") != sourceNode.attr("id")) 
  {
    let addedLink = addLink(sourceNode.attr("id"), selection.attr("id"));
    var link = drawLink(addedLink);
    source_node = null;
    resetState()
    return link;
  } else{
    resetState();
    return null;
  }
}

function revealDragLine() {
  d3.select(drag_line)
    .classed({"drag_line": true, "drag_line_hidden": false});
}

function hideDragLine() {
  let dragLine = d3.select(drag_line)
  dragLine.classed({"drag_line_hidden": true, "drag_line": false})
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", 0)
          .attr("y2", 0)
}

function selectSrcNode(node) {
  source_node = node;
  revealDragLine();
}

/** Draws a temporary link between a source node and a point on the canvas
  * @param canvasPoint: a local point {x,y} in the canvas space, usually the mouse, move the end of the link to
**/
function drawDragLine(endPoint) {
  let sourceNode = source_node;
  let dragLine = d3.select(drag_line);
  let srcPos = getNodePosition(sourceNode);

  dragLine.attr("x1", srcPos.x)
          .attr("y1", srcPos.y)
          .attr("x2", endPoint.x)
          .attr("y2", endPoint.y)
}

function drawDragNode(e) {
  //console.log("drawing drag node");
  if (dragged_object != null) {
    let node = d3.select(dragged_object);
    if(!node.classed("selected") ){
      selectNode(node, !e.shiftKey);
    }
    let selected_id = node.attr("id");
    let group = $(".group[children_ids~=" + selected_id + "]");
    if(group.length){
      console.log("this node is in a group")
      var nodeBB = node.node().getBoundingClientRect();
      var newBB = { top : e.pageY - nodeBB.height/2,
          bottom : e.pageY + nodeBB.height/2,
          left : e.pageX - nodeBB.width/2,
          right : e.pageX + nodeBB.width/2
      }
      console.log(newBB)
      if( !BBIsInGroup(newBB, group.get(0))){
        console.log("this pos is outside the group");
        return;
      }
    }
    translateNode(dragged_object, e.pageX, e.pageY);
  }
}

//Helper Function to move a node group
/**
node: the node to move along with its links
x: the x coordinate to move the node to.  If relative is true, this will be an x offest instead
y: the y coordinate to move the node to.  If relative is true, this will be a y offest instead
**/
function translateNode(node, vector, relative=false, links=null){
  //console.log("Node: ", node, ", X: ", x, ", Y: ", y);
  if (!links) {
    links = findConnectedLinks(node);
  }

  var nodePosition = getNodePosition(node);

  var x = vector.x
  var y = vector.y;

  if(!relative){
     x -= nodePosition.x;
     y -= nodePosition.y;
  }

  x += node.translateTransform.x;
  y += node.translateTransform.y;

  node.translateTransform.set(x, y)
  node.transformer.reapplyTransforms().then((promise)=>{
    //update links to connect to this node
    updateLinkPositions( links, nodePosition);
  });
  return new Promise((success, failure) => {success()});
}

/** Finds all the links connected to a node
*   @param node: the node to find the links of
*   @returns {sourceLinks, destLinks} nodeLists containing links for each
**/
function findConnectedLinks(node){
  var id = node.getAttribute('id');
  var sourceLinks = document.querySelectorAll(`[source_id=${id}]`)
  var targetLinks = document.querySelectorAll(`[target_id=${id}]`);
  return {'sourceLinks': sourceLinks, 'targetLinks': targetLinks};
}

/**
*  Loops through the passed in list of links and updates their positions to match the passed node position
*  @param links: {sourceLinks, destLinks} a list of the links to update
*  @param nodePoint: the position of the node to connect the links to
**/
function updateLinkPositions( links, nodePoint ){
  var x = nodePoint.x;
  var y = nodePoint.y;
  links.sourceLinks.forEach( function(link){
    link = $(link).children('.link-rep');
    link
      .attr("x1", x)
      .attr("y1", y)
      .siblings('.label')
      .attr("x",  (parseFloat(link.attr("x1")) + parseFloat(link.attr("x2"))) / 2.0  + "px")
      .attr("y",  (parseFloat(link.attr("y1")) + parseFloat(link.attr("y2"))) / 2.0  + "px");
  });

  links.targetLinks.forEach( function(link){
    link = $(link).children('.link-rep');
    link
      .attr("x2", x)
      .attr("y2", y)
      .siblings('.label')
      .attr("x",  (parseFloat(link.attr("x1")) + parseFloat(link.attr("x2"))) / 2.0  + "px")
      .attr("y",  (parseFloat(link.attr("y1")) + parseFloat(link.attr("y2"))) / 2.0  + "px");
  }); 
}

function getNodePosition(node){
  var node = node instanceof d3.selection ? node.node() : node;
  var transformMatrix = node.transformer.getTransformMatrix();
  return new Point(transformMatrix.tx, transformMatrix.ty)
}

function getParentMapElement(element){
  if ($(element).is(".node,.link,.group")) return element;
  return $(element).parents(".node,.link,.group").get(0) || element;
}

function checkIntersectionWithNodes(nodePoint, radius=null){
  if (!radius) radius = defaultRadius;

  nodePoint = canvas.transformer.fromLocalToGlobal(nodePoint);

  let testPoint = new Point(nodePoint.x - radius, nodePoint.y - radius);
  let collisionDetected = false;

  for(var i = 0; i < 3; i++){
    testPoint.x = nodePoint.x - radius;
    for(var j = 0; j < 3; j++){
      var elem = document.elementFromPoint(testPoint.x, testPoint.y);
      if( $(getParentMapElement(elem)).hasClass('node') ){
        return true
      }
      testPoint.x += radius;
    }
    testPoint.y += radius;
  }
  return false
}

function quickAdd(key){
  var selectedNode = $(".selected.node").last().get(0);
  var quickAddX, quixkAddY;

  if(selectedNode){
    var nodeDims = selectedNode.getBoundingClientRect();
    if(key == "Enter"){
      console.log("quick adding with enter");
      quickAddX = nodeDims.left + nodeDims.width / 2.0;
      quickAddY = nodeDims.bottom + quickAddDist;
    } else{
      console.log("quick adding with tab");
      quickAddX = nodeDims.right + quickAddDist;
      quickAddY = nodeDims.top + nodeDims.height / 2.0;
    }
  } else{
    quickAddX = Math.floor(window.innerWidth/2.0);
    quickAddY = Math.floor(window.innerHeight/2.0)
  }
  var quickAddPoint = canvas.transformer.fromGlobalToLocal(new Point(quickAddX, quickAddY));
  console.log("quickAddX: " + quickAddX + ", quickAddY: " + quickAddY + ", quickAddDist: " + quickAddDist);

  for(var i = 0; i < 10; i++){
    console.log("checking for collisions");
    if( checkIntersectionWithNodes(quickAddPoint) ){
      console.log("translating quickadded node away from collision");
      var translation = new Point(key == "Tab" ? quickAddDist : 0, key == "Enter" ? quickAddDist : 0);
      quickAddPoint.x += translation.x;
      quickAddPoint.y += translation.y;
    } else{
      console.log("found a collision-free zone");
      break;
    }
  }
  let addedNode = addNode();
  let node = drawNode(addedNode, quickAddPoint.x, quickAddPoint.y);
  hammerizeNode(node).then( (transformer)=>{
    selectNode(node);
    addLabel("Node Name", node);
  });
}

function addEleContent(e) {
  let newNodeAddress = WEBSTRATES_URL_PREFIX + hoveredEle;
  let wrapper = document.createElement('div');
  wrapper.setAttribute("id", "addContentWrapper");
  
  let toFrame = '<iframe id="addWindow" src="'+ newNodeAddress + '"><p>ERROR: Your browser does not support iframes.</p></iframe>';
  let addNoteButton = '<button type="button" id="addNoteBtn" onclick="appendNote()">Add Sticky Note</button> ';
  let addPicButton = '<input type="file" id="addPicBtn" onchange="appendPic()"> ';
  let closeButton = '<button type="button" id="closeWindowBtn" onclick="closeContentWindow()">Close Content Window</button> ';
  
  wrapper.innerHTML = toFrame + addNoteButton + addPicButton + closeButton;
  
  document.getElementById("content_container").appendChild(wrapper);
  addEleToList(e);    
  addWindowOpen = true;
}

/*
 * Add Conent Alternative Way
 * (Break AddPic Functionality, need exploration later) 
 */
//function addEleContent(e) {
//  let newNodeAddress = WEBSTRATES_URL_PREFIX + hoveredEle;
//  let wrapper = document.createElement('div');
//  wrapper.setAttribute("id", "addContentWrapper");
//  
//  let toFrame = document.createElement('iframe');
//  toFrame.setAttribute("id", "addWindow");
//  toFrame.setAttribute("src", newNodeAddress);
//  let warningTxt = document.createElement('p');
//  warningTxt.innerHTML = "ERROR: Your browser does not support iframes.";
//  toFrame.appendChild(warningTxt);
//  
//  let addNoteButton = document.createElement('button');
//  addNoteButton.setAttribute("id", "addNoteBtn");
//  addNoteButton.setAttribute("type", "button");
//  addNoteButton.setAttribute("onclick", "appendNote()");
//  addNoteButton.innerHTML = "Add Sticky Note";
//    
//  let addPicButton = document.createElement('input');
//  addPicButton.setAttribute("id", "addPicBtn");
//  addPicButton.setAttribute("type", "file");
//  addPicButton.setAttribute("onclick", "appendPic()");
//    
//  let closeButton = document.createElement('button');
//  closeButton.setAttribute("id", "closeWindowBtn");
//  closeButton.setAttribute("type", "button");
//  closeButton.setAttribute("onclick", "closeContentWindow()");
//  closeButton.innerHTML = "Close Content Window";
//  
//  wrapper.appendChild(toFrame);
//  wrapper.appendChild(addNoteButton);
//  wrapper.appendChild(addPicButton);
//  wrapper.appendChild(closeButton);
//  
//  
//  document.getElementById("content_container").appendChild(wrapper);
//  addEleToList(e);    
//  addWindowOpen = true;
//}

function closeContentWindow() {
  let wrapper = document.getElementById("addContentWrapper");
  let windowFrame = document.getElementById("addWindow");
  let noteBtn = document.getElementById("addNoteBtn");
  let picBtn = document.getElementById("addPicBtn");
  let closeBtn = document.getElementById("closeWindowBtn");
  windowFrame.parentNode.removeChild(windowFrame);
  noteBtn.parentNode.removeChild(noteBtn);
  picBtn.parentNode.removeChild(picBtn);
  closeBtn.parentNode.removeChild(closeBtn);
  wrapper.parentNode.removeChild(wrapper);
  addWindowOpen = false;
}

function appendNote() {
  let appendElement = '<div class="note" contenteditable="true" style="left: 8px;top: 8px;width: 235px;min-height: 100px;padding: 16px;box-shadow: 5px 5px 10px gray;background-color: rgb(255, 255, 150);font-size: 12pt;word-wrap: break-word;"></div><br>';  
  let addWindow = document.getElementById("addWindow");
  addWindow.contentWindow.document.body.innerHTML += appendElement;
}

function appendPic() {  
  let appendElement = document.createElement('img');
  appendElement.setAttribute("width", "235");
  appendElement.setAttribute("alt", "Loading Image...");
  let addWindow = document.getElementById("addWindow");
  addWindow.contentWindow.document.body.appendChild(appendElement);
    
  let imgList = addWindow.contentWindow.document.querySelectorAll('img'); //selects the query named img
  let preview = imgList[imgList.length-1];
  let file    = document.querySelector('input[type=file]').files[0];
  let reader  = new FileReader();
    
  reader.onloadend = function () {
    preview.src = reader.result;
  }

  if (file) reader.readAsDataURL(file); //reads the data as a URL
  else preview.src = "";
}

function addEleToList(e) {
  if (nodes.find(x => x.id === hoveredEle)) {
    nodes.find(x => x.id === hoveredEle).content = "true";
    if (document.getElementById(hoveredEle)) { //Prevent finding null to error out the entire page;
      document.getElementById(hoveredEle).setAttribute("content","true");
    }
  }
  else if (links.find(x => x.id === hoveredEle)) {
    links.find(x => x.id === hoveredEle).content = "true";
    if (document.getElementById(hoveredEle)) { 
      document.getElementById(hoveredEle).setAttribute("content","true");
    }
  }
  else {
      console.warn("Node/Link NOT FOUND");
  }
}

function previewContent(ele) {
    let addressToFrame = WEBSTRATES_URL_PREFIX + ele;
    
    let wrapper = document.createElement('div');
    wrapper.setAttribute("id", "previewing");
    
    let toFrame = document.createElement('iframe');
    toFrame.setAttribute("id", "previewIframe");
    toFrame.setAttribute("src", addressToFrame);
    
    let warningTxt = document.createElement('p');
    warningTxt.innerHTML = "ERROR: Your browser does not support iframes.";
    
    toFrame.appendChild(warningTxt);
    wrapper.appendChild(toFrame);
    document.body.appendChild(wrapper);
}


function toggleDrawFunc() {
  let pad = document.getElementById("d3_container");
  let toggltBtn = document.getElementById("toggle_touch_drawing");
  let toolPalette = document.getElementById("tool-palette");

  if (drawing_enabled) {
    toolPalette.style.visibility = "hidden";
    pad.setAttribute("class", "");
    toggltBtn.innerHTML = "Enable Drawing!";
    eraser_enabled = false;
  } 
  else {
    toolPalette.style.visibility = "visible";
    pad.setAttribute("class", "drawable");
    toggltBtn.innerHTML = "Disable Drawing!";
    eraser_enabled = false;
  }
  drawing_enabled = !drawing_enabled;
  toggleNonDrawingHammers(!drawing_enabled);
  // Reset Eraser and Eraser Button Below;
  eraser_enabled = false;
  let eraser = document.querySelector(".drawing-instrument-tools .erase-drawing-canvas");
  eraser.style.background = "darkgrey";
  
}