var svgElements = {
  rect: "Rect",
  circle: "Circle",
  ellipse: "Ellipse",
  line: "Line",
  polyline: "Polyline",
  polygon: "Polygon",
  path: "Path",
  text: "Text",
  textPath: "TextPath",
  image: "Image",
  gradient: "Gradient",
  stop: "Stop",
  pattern: "Pattern",
  mask: "Mask",
  clipPath: "ClipPath",
  use: "Use",
  marker: "Marker",
  bare: "Bare",
  arrow: "Arrow",
};

var config = {
  isToolbarInitialized: false,
  isOverlayInitialized: false,
  color: "#660000",
  strokeWidth: 3,
  toolbarEl: null,
  svg: null,
  activeSvgElement: null,
  lastMouseDownX: 0,
  lastMouseDownY: 0,
  currentMouseX: 0,
  currentMouseY: 0,
  isLeftClickDown: false,
  lastElementCreated: null,
  polylinePoints: []
};

function toolbarButtonClicked(svgElement, e) {
  config.activeSvgElement = svgElement;
  var oldActiveButton = config.toolbarEl.querySelector("button.active");
  if (oldActiveButton) oldActiveButton.classList.remove("active");
  e.target.classList.add("active");

  attachAppropriateHandlersToWorkbench(svgElement);
}

function attachAppropriateHandlersToWorkbench(svgElement) {
  // unbind all events https://svgjs.com/docs/2.7/events/#element-off
  config.svg.off();
  config.svg.on("mousedown mouseup", saveMouseDownState);
  config.svg.on("contextmenu", abortPendingAnnotations);
  config.svg.on("mousedown", saveMouseDownLocation);
  config.svg.on("mousemove", saveMouseLocation);
  config.svg.on("mouseup", markElementCompleted);

  switch (svgElement) {
    case svgElements.rect:
      config.svg.on("mousedown", addShapeAnnotation.bind(null, config.svg));
      config.svg.on("mousemove", updatePendingRect);
      break;
    case svgElements.circle:
      config.svg.on("mousedown", addShapeAnnotation.bind(null, config.svg));
      config.svg.on("mousemove", updatePendingCircle);
      break;
    case svgElements.line:
      config.svg.on("mousedown", addLineAnnotation.bind(null, config.svg));
      config.svg.on("mousemove", updatePendingLineAnnotation);
      break;
    case svgElements.polyline:
      config.svg.on("mousedown", addPolylineAnnotation.bind(null, config.svg));
      config.svg.on("mousemove", updatePendingPolylineAnnotation);
      break;
  }

  // svg.click(addShapeAnnotation.bind(null, svg));
}

function markElementCompleted(e) {
  if (e.button !== 0) return;
  config.lastElementCreated.removeClass("is-pending");
}

function saveMouseDownState(e) {
  switch (e.button) {
    case 0:
      config.isLeftClickDown = !config.isLeftClickDown;
      break;
  }
}

function updatePendingRect(e) {
  if (!config.isLeftClickDown) return;
  var newWidth = e.layerX - config.lastElementCreated.x();
  var newHeight = e.layerY - config.lastElementCreated.y();
  config.lastElementCreated.attr({ height: newHeight, width: newWidth });
}
function updatePendingCircle(e) {
  if (!config.isLeftClickDown) return;
  var distance =
    distanceBetweenPoints(
      e.layerX,
      config.lastElementCreated.x(),
      e.layerY,
      config.lastElementCreated.y()
    ) / 3;
  config.lastElementCreated.radius(distance);
}

function distanceBetweenPoints(x1, x2, y1, y2) {
  return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}

function updatePendingLineAnnotation(e) {
  if (!config.isLeftClickDown) return;
  config.lastElementCreated.attr({ x2: e.layerX, y2: e.layerY });
}

function updatePendingPolylineAnnotation(e) {
  if (!config.isLeftClickDown) return;
  config.lastElementCreated.plot([
    ...config.lastElementCreated.plot().value,
    [e.layerX, e.layerY]
  ]);
}

function abortPendingAnnotations(e) {
  var pending = config.svg.select(".is-pending").members;
  for (var i = 0; i < pending.length; i++) {
    pending[i].remove();
  }
  e.stopPropagation();
  e.preventDefault();
}

function elementClickedToRemove(e) {
  e.target.remove();
  e.stopPropagation();
}

function initToolbar(toolbarEl) {
  if (config.isToolbarInitialized) {
    console.warn("toolbar is already initialized");
    return;
  }
  config.toolbarEl = toolbarEl;
  toolbarEl.classList.add("pdf-annotator-toolbar");

  var colorButton = document.createElement("button");
  colorButton.textContent = "Color";
  colorButton.addEventListener("click", function() {
    config.color = prompt("Color: ", config.color);
  });
  toolbarEl.appendChild(colorButton);
  var strokeWidthButton = document.createElement("button");
  strokeWidthButton.textContent = "Stroke width";
  strokeWidthButton.addEventListener("click", function() {
    config.strokeWidth = prompt("Stroke Width: ", config.strokeWidth);
  });
  toolbarEl.appendChild(strokeWidthButton);

  for (var i = 0; i < Object.keys(svgElements).length; i++) {
    var element = Object.entries(svgElements)[i];
    var key = element[0];
    var value = element[1];
    var button = document.createElement("button");
    button.type = "button";
    button.id = key;
    if (value === config.activeSvgElement) button.classList.add("active");
    button.textContent = value;
    button.addEventListener("click", toolbarButtonClicked.bind(null, value));
    toolbarEl.appendChild(button);
  }

  config.isToolbarInitialized = true;
}

function initWorkbench(workbenchEl, options) {
  if (config.isWorkbenchInitialized) {
    console.warn("workbench is initialized");
    return;
  }
  workbenchEl.classList.add("pdf-annotator-workbench");
  var svgContainer = document.createElement("div");
  svgContainer.id = "svg-container";
  svgContainer.classList.add("pdf-annotator-svg-container");
  workbenchEl.appendChild(svgContainer);

  var svg = SVG("svg-container").size(options.width, options.height);
  config.isWorkbenchInitialized = true;
  config.svg = svg;
}

function saveMouseDownLocation(e) {
  config.lastMouseDownX = e.layerX;
  config.lastMouseDownY = e.layerY;
}
function saveMouseLocation(e) {
  config.currentMouseX = e.layerX;
  config.currentMouseY = e.layerY;
}

function applyElementDefaults(element) {
  return element.addClass("is-pending").click(elementClickedToRemove);
}

function addPolylineAnnotation(svg, e) {
  if (e.button !== 0) return;
  config.polylinePoints = [];
  var elementToAdd = svg
    .polyline([[e.layerX, e.layerY]])
    .stroke({ width: config.strokeWidth, color: config.color })
    .attr({ fill: 'transparent' });
  applyElementDefaults(elementToAdd);
  config.lastElementCreated = elementToAdd;
}

function addLineAnnotation(svg, e) {
  if (e.button !== 0) return;
  var elementToAdd = svg
    .line(config.lastMouseDownX, config.lastMouseDownY, e.layerX, e.layerY)
    .stroke({ width: config.strokeWidth, color: config.color })
    .attr({ fill: config.color });
  applyElementDefaults(elementToAdd);
  config.lastElementCreated = elementToAdd;
}

function addShapeAnnotation(svg, e) {
  var elementToAdd = null;
  switch (config.activeSvgElement) {
    case svgElements.rect:
      elementToAdd = svg
        .rect(0, 0)
        .attr({ stroke: config.color, fill: "transparent" })
        .style("stroke-width: " + config.strokeWidth);
      break;
    case svgElements.circle:
      elementToAdd = svg
        .circle(0)
        .attr({ stroke: config.color, fill: "transparent" });
      break;
    case svgElements.ellipse:
      elementToAdd = svg.ellipse(50, 100);
      break;

    case svgElements.polygon:
      elementToAdd = svg.polygon(
        "50,0 60,40 100,50 60,60 50,100 40,60 0,50 40,40"
      );
      break;
    case svgElements.path:
      elementToAdd = svg.path(
        "M0 0 H50 A20 20 0 1 0 100 50 v25 C50 125 0 85 0 85 z"
      );
      break;
    case svgElements.text:
      elementToAdd = svg.text(
        "Lorem ipsum dolor sit amet consectetur.\nCras sodales imperdiet auctor."
      );
      break;
    case svgElements.textPath:
      elementToAdd = svg.text(function(add) {
        add.tspan("We go ").dx(0);
        add
          .tspan("up")
          .fill("#f09")
          .dy(-40);
        add.tspan(", then we go down, then up again").dy(40);
      });

      var path =
        "M 0 0 100 200 C 200 100 300 0 400 100 C 500 200 600 300 700 200 C 800 100 900 100 900 100";

      elementToAdd.path(path).font({ size: 42.5, family: "Verdana" });
      elementToAdd.plot(
        "M 0 0 300 500 C 200 100 300 0 400 100 C 500 200 600 300 700 200 C 800 100 900 100 900 100"
      );
      elementToAdd.textPath().attr("startOffset", "50%");
      elementToAdd
        .textPath()
        .animate(3000)
        .attr("startOffset", "80%");
      break;
    case svgElements.Image:
      elementToAdd = svg.image("/path/to/image.jpg", 200, 300);
      break;
    case svgElements.Gradient:
      elementToAdd = svg.gradient("linear", function(stop) {
        stop.at(0, "#333");
        stop.at(1, "#fff");
      });
      // needs to be applied to another svg element
      break;
    case svgElements.Pattern:
      elementToAdd = svg.pattern(20, 20, function(add) {
        add.rect(20, 20).fill("#f06");
        add.rect(10, 10);
        add.rect(10, 10).move(10, 10);
      });
      // needs to be applied to another svg element
      break;
  }

  elementToAdd.move(e.layerX, e.layerY);
  applyElementDefaults(elementToAdd);
  config.lastElementCreated = elementToAdd;
}

function save() {
  localStorage.setItem("annotations", config.svg.svg());
}

function load() {
  var annotations = localStorage.getItem("annotations");
  config.svg.svg(annotations);
}

function clear() {
  config.svg.clear();
}

var pdfAnnotator = {
  initToolbar: initToolbar,
  initWorkbench: initWorkbench,
  save: save,
  load: load,
  clear: clear
};
