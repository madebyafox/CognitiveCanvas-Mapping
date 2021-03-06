import {getNodePosition} from './nodes.js';
import {generateObjectId} from './data_interpreter.js';

const DEFAULT_INTERACTION = "Single Tap";

window.temp_buffer = {};
temp_buffer["action_log"] = [];
window.prev_position = {};
window.prev_label = "";

/*
 * General logger for each interaction
 * @param level {String} - space-separated classlsit of items being acted on
 * @param interaction {String} - the type of interaction the user made ("Single Tap", "Tool Panel", etc) 
 * @param event_type {Number} - an arbitrary number to identify the event type
 * @content {Object} - an object containing all the extra info on the event
 */
function log(level, interaction, event_type, content){
	var current_log = {
		"level": level, 
    "interaction": interaction,
    "event_type": event_type,
		"property": content,
    "timestamp": new Date().toUTCString(),
    "map_id": window.location.pathname.replace(/\//g, '')
	}
  console.log(current_log); 
  window.parent.postMessage({
    "id": "action_log",
    "data": current_log
  }, "*");
}

/*
 * Sends a POST request to the cogcanvas server
 */
export function postLogs(current_log){
  if (window.parent) {
    //console.log(window.parent);
    window.parent.postMessage("post_action_log", "*");
  }
}

/**
 * Logs generic style changes of one attribute on multiple elements
 * @param  {JSON} data  {style_name - String,
 *                       elements - HTMLCollection,
 *                       old_value - String | Number | Array, 
 *                       new_value}- String | Number
 *                      }
 * @return {None}
 */
export function logStyleChange(data){
  let levelNames = [];
  let interaction = "Tool Panel";
  let eventType = 12; //An arbitrary number to differentiate event types
  let ids = [];

  for(let i=0; i < data.elements.length; i++){
    data.elements[i].classList.forEach( (className)=>{
      if ( !levelNames.includes(className) && className!="selected"){
        levelNames.push(className);
      }
    });
    ids.push( data.elements[i].id);
  }

  let content = {
    style_name : data.style_name,
    "ids": ids,
    prev_value : data.old_value,
    curr_value : data.new_value,
  }
  log(levelNames.join(" "), interaction, eventType, content);
}

/*
 * Logs creation of a node/edge
 */
export function logCreation(interaction, element) {
  let levelName = element.getAttribute("class").split(" ")[0];
  let content;
  if (levelName === "node") {
    if (element.classList.contains("pin")) {
      levelName += " pin";
    }
    content = {
      "id": element.getAttribute("id"),
      "color": element.children[0].style.cssText,
      "shape": element.children[0].tagName,
      "size": [element.transformer.localScale.x * DEFAULT_NODE_SIZE[0], element.transformer.localScale.y * DEFAULT_NODE_SIZE[1]],
      "label_text": "Node Name",
      "label_size": "15px",
      "label_color": "green",
      "label_font": "Helvetica",
      "location": getNodePosition(element)
    };
  } else {
    content = {
      "id": element.getAttribute("id"),
      "label_text": "Link Name",
      "color": "lightgrey",
      "source_id": element.getAttribute("source_id"),
      "target_id": element.getAttribute("target_id")
    };
  }
  let event_type = 0;
  log(levelName, interaction, event_type, content);
}

/*
 * Logs deletion of a node
 */
export function logDeletion(interaction, element) {
  let levelName = element.getAttribute("class").split(" ")[0];
  let event_type = 1;
  log(levelName, interaction, event_type, {
    "id": element.getAttribute("id"),
    "deleted": true
  });
}

/*
 * Logs element movement/translate
 */
export function logTranslate(interaction, element) {
  if (prev_position.length === 0) {
    return;
  }
  let node_type = "node";
  let event_type = 2;
  for (var key in prev_position) {
    let child = document.getElementById(key);
    if (child.tagName === 'image') {
      node_type += " pin";
      log("image", interaction, event_type, {
        "id": key,
        "prev_position": prev_position[key],
        "curr_position": getNodePosition(child)
      });
    } else {
      log(node_type, interaction, event_type, {
        "id": key,
        "prev_position": prev_position[key],
        "curr_position": getNodePosition(child)
      });
    }
  }
  prev_position = {};
}

/*
 * Logs label changes
 */
function logLabel(interaction, element) {
  let levelName = element.getAttribute("class").split(" ")[0];
  if (levelName === "node") {
    if (element.getAttribute("class").split(" ").length === 3) {
      levelName += " pin";
    }
  } 
  let content = {
    "id": element.getAttribute("id"),
    "prev_label_text": prev_label,
    "curr_label_text": element.children[1].children[0].innerHTML
  };
  prev_label = "";
  let event_type = 3;
  log(levelName, interaction, event_type, content);
}

/*
 * Logs font size changes
 */
export function logFontChanges(prev_size, curr_size){
  let selectedNodes = document.querySelectorAll(".node.selected");
  let selectedEdges = document.querySelectorAll(".link.selected");
  let event_type = (prev_size < curr_size) ? 4 : 5;

  for (var i = 0; i < selectedNodes.length; i++) {
    log("node", DEFAULT_INTERACTION, event_type, {
      "id": selectedNodes[i].getAttribute("id"),
      "prev_font_size": prev_size,
      "curr_font_size": curr_size
    });
  }

  for (var i = 0; i < selectedEdges.length; i++) {
    log("edge", DEFAULT_INTERACTION, event_type, {
      "id": selectedEdges[i].getAttribute("id"),
      "prev_font_size": prev_size,
      "curr_font_size": curr_size
    });
  }
}

/*
 * Logs toggle for bold/italics
 */
export function logLabelToggle(type, setting, event_type){
  let selectedNodes = document.querySelectorAll(".node.selected");
  let selectedEdges = document.querySelectorAll(".link.selected");

  for (var i = 0; i < selectedNodes.length; i++) {
    log("node", DEFAULT_INTERACTION, event_type, {
      "id": selectedNodes[i].getAttribute("id"),
      [type]: setting
    })
  }

  for (var i = 0; i < selectedEdges.length; i++) {
    log("edge", DEFAULT_INTERACTION, event_type, {
      "id": selectedEdges[i].getAttribute("id"),
      [type]: setting
    })
  }
}

/*
 * Logs changes for each node when color is changed
 */
export function logColorChanges(type, color){
  let selectedNodes = document.querySelectorAll(".node.selected");
  // let selectedNodeShapes = document.querySelectorAll(".selected .node-rep");
  let selectedEdges = document.querySelectorAll(".link.selected");
  // let selectedEdgeShapes = document.querySelectorAll(".selected .link-rep");
  let prev_color = "prev_" + type + "_color";
  let curr_color = "curr_" + type + "_color";
  let event_type = 8;
  for (var i = 0; i < selectedNodes.length; i++) {
    log("node", DEFAULT_INTERACTION, event_type, {
      "id": selectedNodes[i].getAttribute("id"),
      // "label": labelFinder(selectedNodes[i].getAttribute("id")),
      [prev_color]: selectedNodes[i].children[0].style.cssText,
      [curr_color]: color
    })
  }

  for (var i = 0; i < selectedEdges.length; i++) {
    log("edge", DEFAULT_INTERACTION, event_type, {
      "id": selectedEdges[i].getAttribute("id"),
      // "label": labelFinder(selectedEdges[j].getAttribute("id")),
      [prev_color]: selectedEdges[i].children[0].style.cssText,
      [curr_color]: color
      // "source_id": selectedEdges[j].getAttribute("source_id"),
      // "target_id": selectedEdges[j].getAttribute("target_id")
    })
  }
}

/*
 * Logs image upload
 */
export function logImage(width, height, src, id) {
  let event_type = 9;
  log("image", DEFAULT_INTERACTION, event_type, {
    "location": "(0,0)",
    "width": width,
    "height": height,
    "src": src,
    "id": id
  });
}

/*
 * Logs stroke paths
 */
export function logDrawing(interaction, path) {
  let event_type = 10;
  path.setAttribute("id", generateObjectId());
  log("drawing", interaction, event_type, {
    "id": path.getAttribute("id"),
    "path": path.getAttribute("d"),
    "color": path.getAttribute("fill"),
  });
}

/*
 * Logs drawing erasures
 */
export function logErasure(interaction, path) {
  let event_type = 11;
  log("drawing", interaction, event_type, {
    "id": path.getAttribute("id"),
    "deleted": true
  });
}

// HELPER METHODS BELOW
// ------------------------------------------------------------------

/*
 * Saves previous position of each translated element
 */
export function translateSavePrevPosition(element) {
  if (!element) {
    return;
  }
  if (element.tagName === 'image') { // save picture movement
    prev_position[element.getAttribute("id")] = getNodePosition(element);
    if (element.getAttribute("children_ids")) {
      saveChildPrevPosition(element);
    }
  } else {
    if (element.getAttribute("children_ids")) {
      saveChildPrevPosition(element);
    } else {
      prev_position[element.getAttribute("id")] = getNodePosition(element);
    }
  }
}

/*
 * Saves prev position of element's children_ids attr
 */
function saveChildPrevPosition(element) {
  let children = element.getAttribute("children_ids").split(" ");
  for (var childKey in children) {
    prev_position[children[childKey]] = getNodePosition(document.getElementById(children[childKey]));
  }
}

/*
 * Saves prev label
 */
export function setPrevLabel(label) {
  prev_label = label;
}
